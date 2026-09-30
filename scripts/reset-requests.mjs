import { unlink } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const confirmed = process.argv.includes("--confirm");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL não configurada.");

const sql = postgres(databaseUrl, { max: 1 });
const uploadRoot = path.resolve(process.cwd(), "storage", "uploads");

async function counts(client) {
  const [row] = await client`
    select
      (select count(*)::int from requests) as requests,
      (select count(*)::int from request_history) as history,
      (select count(*)::int from request_attachments) as request_attachments,
      (select count(*)::int from work_orders) as work_orders,
      (select count(*)::int from work_order_attachments) as work_order_attachments,
      (select count(*)::int from request_communications) as communications,
      (select count(*)::int from notifications where request_id is not null) as notifications,
      (select count(*)::int from whatsapp_messages where request_id is not null) as whatsapp_messages
  `;
  return row;
}

try {
  const before = await counts(sql);
  console.log("Registros antes da limpeza:", before);
  if (!confirmed) {
    console.log("Simulação concluída. Use --confirm para executar a exclusão.");
    process.exitCode = before.requests > 0 ? 2 : 0;
  } else {
    const storageRows = await sql`
      select storage_key from request_attachments
      union
      select attachment.storage_key
      from work_order_attachments attachment
      inner join work_orders on work_orders.id = attachment.work_order_id
      union
      select media_storage_key as storage_key
      from whatsapp_messages
      where request_id is not null and media_storage_key is not null
    `;

    await sql.begin(async (transaction) => {
      await transaction`
        update whatsapp_conversations
        set active_request_id = null, state = 'MENU', draft = '{}', updated_at = now()
        where active_request_id in (select id from requests)
      `;
      await transaction`delete from whatsapp_messages where request_id in (select id from requests)`;
      await transaction`delete from requests`;
      await transaction`delete from protocol_sequences`;
      await transaction`delete from work_order_sequences`;
    });

    let removedFiles = 0;
    for (const row of storageRows) {
      if (!row.storage_key) continue;
      const target = path.resolve(uploadRoot, path.basename(row.storage_key));
      if (!target.startsWith(`${uploadRoot}${path.sep}`)) throw new Error(`Arquivo fora da pasta de uploads: ${target}`);
      try {
        await unlink(target);
        removedFiles += 1;
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }

    const after = await counts(sql);
    console.log("Registros após a limpeza:", after);
    console.log(`Arquivos físicos removidos: ${removedFiles}`);
  }
} finally {
  await sql.end();
}
