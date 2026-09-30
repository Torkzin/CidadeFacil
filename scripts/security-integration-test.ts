import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { hashPassword } from "../lib/auth/password";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const databaseUrl = process.env.DATABASE_URL ?? "postgresql://cidadefacil:cidadefacil_dev@localhost:5432/cidadefacil";
const sql = postgres(databaseUrl, { max: 1 });
const tenantId = randomUUID(); const departmentId = randomUUID(); const teamId = randomUUID(); const categoryId = randomUUID(); const userId = randomUUID(); const requestId = randomUUID(); const email = `tenant-${Date.now()}@example.invalid`; const password = "TenantTest@2026";
const secretaryId = randomUUID(); const secretaryEmail = `secretary-${Date.now()}@example.invalid`;
const roleUsers = [
  { id: secretaryId, email: secretaryEmail, role: "Secretário" },
  { id: randomUUID(), email: `manager-${Date.now()}@example.invalid`, role: "Gestor" },
  { id: randomUUID(), email: `agent-${Date.now()}@example.invalid`, role: "Servidor" },
  { id: randomUUID(), email: `field-${Date.now()}@example.invalid`, role: "Equipe de campo" },
] as const;

async function login(loginEmail: string, loginPassword: string) {
  const response = await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: loginEmail, password: loginPassword }) });
  assert.equal(response.status, 200, `Login de ${loginEmail} falhou: ${await response.text()}`);
  return response.headers.getSetCookie()[0].split(";")[0];
}

async function main() {
try {
  const passwordHash = await hashPassword(password);
  await sql.begin(async (tx) => {
    await tx`insert into municipalities (id, name, slug) values (${tenantId}, 'Município Isolado de Teste', ${`isolado-${tenantId}`})`;
    await tx`insert into departments (id, municipality_id, name) values (${departmentId}, ${tenantId}, 'Secretaria Isolada')`;
    await tx`insert into teams (id, municipality_id, department_id, name) values (${teamId}, ${tenantId}, ${departmentId}, 'Equipe Isolada')`;
    await tx`insert into categories (id, municipality_id, name, color) values (${categoryId}, ${tenantId}, 'Categoria Isolada', '#000000')`;
    await tx`insert into users (id, municipality_id, department_id, name, email, password_hash, role, status) values (${userId}, ${tenantId}, ${departmentId}, 'Administrador Isolado', ${email}, ${passwordHash}, 'Administrador', 'Ativo')`;
    await tx`insert into requests (id, municipality_id, protocol, title, description, category_id, priority, status, address, neighborhood, citizen_name, created_by) values (${requestId}, ${tenantId}, '2026-9999999', 'Solicitação de outro município', 'Registro temporário.', ${categoryId}, 'Normal', 'Aberta', 'Rua Isolada', 'Centro', 'Cidadão Isolado', ${userId})`;
  });
  const [mainDepartment] = await sql`select d.id, d.municipality_id from departments d join municipalities m on m.id = d.municipality_id where m.slug = 'seropedica-rj' and d.name = 'Secretaria Municipal de Transporte e Serviços Públicos' limit 1`;
  assert.ok(mainDepartment, "Secretaria principal não encontrada.");
  for (const roleUser of roleUsers) await sql`insert into users (id, municipality_id, department_id, name, email, password_hash, role, status) values (${roleUser.id}, ${mainDepartment.municipality_id}, ${mainDepartment.id}, ${`Usuário ${roleUser.role}`}, ${roleUser.email}, ${passwordHash}, ${roleUser.role}, 'Ativo')`;
  const [fieldTeam] = await sql`select id from teams where municipality_id = ${mainDepartment.municipality_id} and name = 'Equipe de Iluminação 02' limit 1`;
  assert.ok(fieldTeam, "Equipe de campo não encontrada.");
  await sql`insert into user_team_memberships (user_id, team_id) values (${roleUsers[3].id}, ${fieldTeam.id})`;
  const [municipalityARequest] = await sql`select id, protocol from requests where municipality_id <> ${tenantId} order by created_at desc limit 1`;
  assert.ok(municipalityARequest, "É necessária uma solicitação do município principal para o teste.");
  const [municipalityAAttachment] = await sql`select ra.id from request_attachments ra join requests r on r.id = ra.request_id where r.municipality_id <> ${tenantId} limit 1`;

  const tenantCookie = await login(email, password);
  const tenantHeaders = { Cookie: tenantCookie, "Content-Type": "application/json" };
  const list = await fetch(`${baseUrl}/api/requests`, { headers: tenantHeaders }).then((response) => response.json());
  assert.deepEqual(list.items.map((item: { protocol: string }) => item.protocol), ["2026-9999999"], "Listagem misturou municípios.");
  const foreignDetail = await fetch(`${baseUrl}/api/requests/${municipalityARequest.id}`, { headers: tenantHeaders });
  assert.equal(foreignDetail.status, 404, "Usuário acessou solicitação de outro município.");
  const foreignUpdate = await fetch(`${baseUrl}/api/requests/${municipalityARequest.id}`, { method: "PATCH", headers: tenantHeaders, body: JSON.stringify({ status: "Triagem" }) });
  assert.equal(foreignUpdate.status, 404, "Usuário alterou solicitação de outro município.");
  if (municipalityAAttachment) {
    const foreignAttachment = await fetch(`${baseUrl}/api/attachments/${municipalityAAttachment.id}`, { headers: tenantHeaders });
    assert.equal(foreignAttachment.status, 404, "Usuário baixou anexo de outro município.");
  }
  const tenantUsers = await fetch(`${baseUrl}/api/admin/users`, { headers: tenantHeaders }).then((response) => response.json());
  assert.equal(tenantUsers.items.length, 1, "Listagem de usuários vazou outro município.");

  for (const roleUser of roleUsers) {
    const cookie = await login(roleUser.email, password);
    const forbiddenUsers = await fetch(`${baseUrl}/api/admin/users`, { headers: { Cookie: cookie } });
    assert.equal(forbiddenUsers.status, 403, `${roleUser.role} acessou administração de usuários.`);
    const scopedRequests = await fetch(`${baseUrl}/api/requests`, { headers: { Cookie: cookie } }).then((response) => response.json());
    if (roleUser.role === "Equipe de campo") assert.ok(scopedRequests.items.every((item: { team: string | null }) => item.team === "Equipe de Iluminação 02"), "Equipe de campo recebeu solicitações de outra equipe.");
    else assert.ok(scopedRequests.items.every((item: { department: string | null }) => item.department === "Secretaria Municipal de Transporte e Serviços Públicos"), `${roleUser.role} recebeu solicitações fora da própria secretaria.`);
  }

  console.log("Isolamento municipal e RBAC validados.");
} finally {
  for (const roleUser of roleUsers) {
    await sql`delete from sessions where user_id = ${roleUser.id}`;
    await sql`delete from audit_logs where entity_id = ${roleUser.id} or user_id = ${roleUser.id}`;
    await sql`delete from users where id = ${roleUser.id}`;
  }
  await sql.begin(async (tx) => {
    await tx`delete from requests where municipality_id = ${tenantId}`;
    await tx`delete from notifications where municipality_id = ${tenantId}`;
    await tx`delete from audit_logs where municipality_id = ${tenantId}`;
    await tx`delete from notification_preferences where municipality_id = ${tenantId}`;
    await tx`delete from priority_settings where municipality_id = ${tenantId}`;
    await tx`delete from protocol_sequences where municipality_id = ${tenantId}`;
    await tx`delete from municipality_settings where municipality_id = ${tenantId}`;
    await tx`delete from sessions where user_id in (select id from users where municipality_id = ${tenantId})`;
    await tx`delete from user_team_memberships where user_id in (select id from users where municipality_id = ${tenantId})`;
    await tx`delete from users where municipality_id = ${tenantId}`;
    await tx`delete from teams where municipality_id = ${tenantId}`;
    await tx`delete from categories where municipality_id = ${tenantId}`;
    await tx`delete from departments where municipality_id = ${tenantId}`;
    await tx`delete from municipalities where id = ${tenantId}`;
  });
  await sql.end();
}
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
