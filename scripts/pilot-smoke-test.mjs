import assert from "node:assert/strict";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

const health = await fetch(`${baseUrl}/api/health`);
assert.equal(health.status, 200, "Health check falhou.");
const healthData = await health.json();
assert.equal(healthData.checks.database, "ok");
assert.equal(healthData.checks.storage, "ok");

const portal = await fetch(`${baseUrl}/api/public/municipality`).then((response) => response.json());
assert.ok(portal.categories.length > 0, "Portal sem categorias públicas.");

const create = await fetch(`${baseUrl}/api/public/requests`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ citizenName: "Cidadão Teste Piloto", citizenPhone: "(21) 99999-0000", citizenEmail: "piloto@example.invalid", categoryId: portal.categories[0].id, title: "Teste público automatizado", description: "Solicitação criada para validar o fluxo do piloto.", address: "Rua Maria Lourenço", addressNumber: "18", neighborhood: "Fazenda Caxias", postalCode: "23895-295", latitude: "-22.743889", longitude: "-43.707500", privacyAccepted: true }),
});
if (create.status !== 201) throw new Error(`Criação pública falhou: ${await create.text()}`);
const created = await create.json();
assert.match(created.protocol, /^\d{4}-\d{7}$/);
assert.ok(created.publicToken.length >= 24);

const denied = await fetch(`${baseUrl}/api/public/requests/${created.protocol}`, { headers: { "X-Public-Token": "codigo-incorreto" } });
assert.equal(denied.status, 404, "Consulta pública aceitou token inválido.");

const upload = new FormData();
upload.append("files", new Blob([png], { type: "image/png" }), "ocorrencia.png");
const uploadResponse = await fetch(`${baseUrl}/api/public/requests/${created.protocol}/attachments`, { method: "POST", headers: { "X-Public-Token": created.publicToken }, body: upload });
assert.equal(uploadResponse.status, 201, `Upload público falhou: ${await uploadResponse.text()}`);

const login = await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@cidadefacil.local", password: "CidadeFacil@2026" }) });
assert.equal(login.status, 200, `Login administrativo falhou: ${await login.text()}`);
const cookie = login.headers.getSetCookie()[0].split(";")[0];
const headers = { "Content-Type": "application/json", Cookie: cookie };

for (const body of [{ status: "Triagem" }, { department: "Secretaria Municipal de Transporte e Serviços Públicos" }, { team: "Equipe de Iluminação 01" }, { status: "Em andamento" }]) {
  const response = await fetch(`${baseUrl}/api/requests/${created.protocol}`, { method: "PATCH", headers, body: JSON.stringify(body) });
  assert.equal(response.status, 200, `Etapa interna falhou: ${await response.text()}`);
}
const comment = await fetch(`${baseUrl}/api/requests/${created.protocol}/comments`, { method: "POST", headers, body: JSON.stringify({ body: "Atendimento validado pelo teste de piloto." }) });
assert.equal(comment.status, 201, "Comentário interno falhou.");
const conclude = await fetch(`${baseUrl}/api/requests/${created.protocol}`, { method: "PATCH", headers, body: JSON.stringify({ status: "Concluída", resolutionNote: "Serviço executado, fotografado e validado pela equipe responsável." }) });
assert.equal(conclude.status, 200, "Conclusão falhou.");

const publicDetail = await fetch(`${baseUrl}/api/public/requests/${created.protocol}`, { headers: { "X-Public-Token": created.publicToken } });
assert.equal(publicDetail.status, 200, "Consulta pública final falhou.");
const detail = await publicDetail.json();
assert.equal(detail.status, "Concluída");
assert.equal("citizenPhone" in detail, false, "Consulta pública expôs telefone.");
assert.equal("description" in detail, false, "Consulta pública expôs descrição integral.");
assert.ok(detail.history.length >= 5);

const rating = await fetch(`${baseUrl}/api/public/requests/${created.protocol}/rating`, { method: "POST", headers: { "Content-Type": "application/json", "X-Public-Token": created.publicToken }, body: JSON.stringify({ rating: 5, comment: "Atendimento concluído." }) });
assert.equal(rating.status, 201, `Avaliação falhou: ${await rating.text()}`);

for (const path of ["/executivo", "/auditoria"]) {
  const page = await fetch(`${baseUrl}${path}`, { headers });
  assert.equal(page.status, 200, `${path} não carregou.`);
}
const audit = await fetch(`${baseUrl}/api/admin/audit?action=PUBLIC_REQUEST_CREATED`, { headers });
assert.equal(audit.status, 200, "Consulta de auditoria falhou.");
assert.ok((await audit.json()).items.some((item) => item.entityId), "Evento público não apareceu na auditoria.");

console.log(`Fluxo piloto concluído com ${created.protocol}.`);
