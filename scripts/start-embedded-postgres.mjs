import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";

const pg = new EmbeddedPostgres({
  databaseDir: "./.local-postgres",
  user: "cidadefacil",
  password: "cidadefacil_dev",
  port: 5432,
  persistent: true,
  onLog: () => {},
});
if (!existsSync("./.local-postgres/PG_VERSION")) await pg.initialise();
await pg.start();
try {
  await pg.createDatabase("cidadefacil");
} catch (error) {
  if (
    !String(error).includes("already exists") &&
    !String(error).includes("já existe")
  )
    throw error;
}
console.log(
  "PostgreSQL local pronto em localhost:5432. Pressione Ctrl+C para encerrar.",
);
const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
await new Promise(() => {});
