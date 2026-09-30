import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import { hashPassword } from "../lib/auth/password";
import { categories, departments, municipalities, municipalitySettings, notificationPreferences, notifications, prioritySettings, protocolSequences, requestHistory, requests, serviceChecklistItems, teams, users } from "./schema";

const url = process.env.DATABASE_URL ?? "postgresql://cidadefacil:cidadefacil_dev@localhost:5432/cidadefacil";
const client = postgres(url, { max: 1 });
const db = drizzle(client);

const municipalityId = "00000000-0000-4000-8000-000000000001";
const adminId = "00000000-0000-4000-8000-000000000101";
const departmentRows = [
  ["00000000-0000-4000-8000-000000000201", "Secretaria Municipal de Obras", "Eider Dantas"],
  ["00000000-0000-4000-8000-000000000202", "Secretaria Municipal de Transporte e Serviços Públicos", "Patrick Figueira"],
  ["00000000-0000-4000-8000-000000000203", "Secretaria Municipal de Meio Ambiente, Sustentabilidade e Bem-Estar Animal", "Flávia Constantino"],
  ["00000000-0000-4000-8000-000000000204", "Secretaria Municipal de Segurança e Ordem Pública", "Anderson de Moura Medeiros"],
  ["00000000-0000-4000-8000-000000000205", "Secretaria Municipal de Governo", "Fábio Luiz Moffati Monteiro"],
  ["00000000-0000-4000-8000-000000000206", "Secretaria Municipal de Administração", "Claudia Cristina da Costa Ferreira"],
  ["00000000-0000-4000-8000-000000000207", "Secretaria Municipal de Fazenda", "Walter Carneiro de F. Junior"],
  ["00000000-0000-4000-8000-000000000208", "Secretaria Municipal de Assistência Social e Direitos Humanos", "Vandrea dos Santos Steffan"],
  ["00000000-0000-4000-8000-000000000209", "Secretaria Municipal de Esporte e Lazer", "Igor dos Santos da Costa"],
  ["00000000-0000-4000-8000-000000000210", "Secretaria Municipal de Planejamento e Desenvolvimento", "Alex Wander Martins Villela"],
  ["00000000-0000-4000-8000-000000000211", "Secretaria Municipal de Cultura e Turismo", "Monica Ribeiro Figueiredo"],
  ["00000000-0000-4000-8000-000000000212", "Secretaria Municipal de Educação", "Marciel Falcão Pequeno"],
  ["00000000-0000-4000-8000-000000000213", "Secretaria Municipal de Trabalho e Emprego", "Nelson Jorge Moraes Matos"],
  ["00000000-0000-4000-8000-000000000214", "Secretaria Municipal de Saúde", "Renê Mello Vigné"],
  ["00000000-0000-4000-8000-000000000215", "Secretaria Municipal de Defesa Civil", "Leonardo Rosa Carlos"],
  ["00000000-0000-4000-8000-000000000216", "Secretaria Municipal de Comunicação e Eventos", "Alexandre Rafael"],
  ["00000000-0000-4000-8000-000000000217", "Secretaria Municipal de Suprimentos", "Edilaine Graciano Ferreira Alves Evangelista"],
  ["00000000-0000-4000-8000-000000000218", "Secretaria Municipal de Indústria, Comércio, Ciência e Tecnologia", "Carlos Alberto Machado de Freitas"],
  ["00000000-0000-4000-8000-000000000219", "Secretaria Municipal de Assuntos Estratégicos", "Enoque Vieira Costa da Silva"],
  ["00000000-0000-4000-8000-000000000220", "Secretaria Municipal de Agronegócios", "Julio Cesar da Silva Cicarino"],
] as const;
const teamRows = [
  ["00000000-0000-4000-8000-000000000301", "Equipe de Iluminação 01", departmentRows[1][0]],
  ["00000000-0000-4000-8000-000000000302", "Equipe de Iluminação 02", departmentRows[1][0]],
  ["00000000-0000-4000-8000-000000000303", "Equipe de Asfalto", departmentRows[0][0]],
  ["00000000-0000-4000-8000-000000000304", "Equipe de Poda", departmentRows[2][0]],
  ["00000000-0000-4000-8000-000000000305", "Equipe de Limpeza Urbana", departmentRows[1][0]],
] as const;
const categoryRows = [
  ["00000000-0000-4000-8000-000000000401", "Iluminação Pública", "#155e75"],
  ["00000000-0000-4000-8000-000000000402", "Buracos/Vias", "#f59e0b"],
  ["00000000-0000-4000-8000-000000000403", "Coleta de lixo", "#16a34a"],
  ["00000000-0000-4000-8000-000000000404", "Poda de árvores", "#65a30d"],
  ["00000000-0000-4000-8000-000000000405", "Saneamento", "#2563eb"],
  ["00000000-0000-4000-8000-000000000406", "Outros", "#64748b"],
] as const;
const checklistRows = [
  [categoryRows[0][0], "Confirmar desligamento e segurança elétrica", true, 10],
  [categoryRows[0][0], "Testar funcionamento da luminária após o reparo", true, 20],
  [categoryRows[1][0], "Sinalizar e isolar a área de trabalho", true, 10],
  [categoryRows[1][0], "Verificar compactação e nivelamento do reparo", true, 20],
  [categoryRows[2][0], "Remover todos os resíduos do ponto informado", true, 10],
  [categoryRows[2][0], "Confirmar limpeza e liberação da via", true, 20],
  [categoryRows[3][0], "Avaliar interferência com a rede elétrica", true, 10],
  [categoryRows[3][0], "Recolher galhos e liberar a passagem", true, 20],
  [categoryRows[4][0], "Identificar e interromper a origem do vazamento", true, 10],
  [categoryRows[4][0], "Testar o reparo antes de fechar a área", true, 20],
] as const;

async function seed() {
  const passwordHash = await hashPassword("CidadeFacil@2026");
  await db.insert(municipalities).values({ id: municipalityId, name: "Município de Seropédica", slug: "seropedica-rj" })
    .onConflictDoUpdate({ target: municipalities.id, set: { name: "Município de Seropédica", slug: "seropedica-rj", updatedAt: new Date() } });
  await db.insert(users).values({ id: adminId, municipalityId, name: "Matheus Vieira", email: "admin@cidadefacil.local", passwordHash, role: "Administrador", status: "Ativo" })
    .onConflictDoUpdate({ target: users.id, set: { passwordHash, status: "Ativo", updatedAt: new Date() } });
  await db.insert(municipalitySettings).values({ municipalityId, governmentName: "Prefeitura Municipal de Seropédica", taxId: "01.604.139/0001-07", phone: "(21) 2682-2227", address: "Rua Maria Lourenço, 18 · Fazenda Caxias · CEP 23895-295", email: "prefeito@seropedica.rj.gov.br", timezone: "America/Sao_Paulo", citizenResponseHours: 72 })
    .onConflictDoNothing();
  await db.insert(notificationPreferences).values({ userId: adminId, municipalityId }).onConflictDoNothing();
  for (const [priority, responseHours, resolutionHours] of [["Baixa", 24, 240], ["Normal", 12, 120], ["Alta", 4, 48], ["Urgente", 1, 12]] as const) {
    await db.insert(prioritySettings).values({ municipalityId, priority, responseHours, resolutionHours }).onConflictDoNothing();
  }
  for (const [id, name, managerName] of departmentRows) await db.insert(departments).values({ id, municipalityId, name, managerName }).onConflictDoUpdate({ target: departments.id, set: { name, managerName } });
  for (let index = 0; index < teamRows.length; index += 1) {
    const [id, name, departmentId] = teamRows[index];
    await db.insert(teams).values({ id, municipalityId, name, departmentId, memberCount: [6, 5, 12, 8, 15][index] }).onConflictDoUpdate({ target: teams.id, set: { memberCount: [6, 5, 12, 8, 15][index] } });
  }
  const staff = [
    ["00000000-0000-4000-8000-000000000102", departmentRows[1][0], "Patrick Figueira", "patrick.figueira@cidadefacil.local", "Secretário"],
    ["00000000-0000-4000-8000-000000000103", departmentRows[0][0], "Eider Dantas", "eider.dantas@cidadefacil.local", "Secretário"],
    ["00000000-0000-4000-8000-000000000104", departmentRows[2][0], "Flávia Constantino", "flavia.constantino@cidadefacil.local", "Gestor"],
    ["00000000-0000-4000-8000-000000000105", departmentRows[3][0], "Anderson de Moura Medeiros", "anderson.medeiros@cidadefacil.local", "Servidor"],
  ] as const;
  for (const [id, departmentId, name, email, role] of staff) await db.insert(users).values({ id, municipalityId, departmentId, name, email, passwordHash, role, status: "Ativo" }).onConflictDoUpdate({ target: users.id, set: { departmentId, name, role, status: "Ativo", updatedAt: new Date() } });
  for (const [id, name, color] of categoryRows) await db.insert(categories).values({ id, municipalityId, name, color }).onConflictDoNothing();
  for (const [categoryId, title, required, sortOrder] of checklistRows) await db.insert(serviceChecklistItems).values({ municipalityId, categoryId, title, required, sortOrder }).onConflictDoNothing();
  await db.insert(protocolSequences).values({ municipalityId, year: 2026, lastValue: 1428 }).onConflictDoNothing();

  const examples = [
    ["00000000-0000-4000-8000-000000000501", "2026-0001428", "Poste sem iluminação", "Poste apagado há quatro noites, deixando o trecho com baixa visibilidade.", categoryRows[0][0], "Alta", "Em andamento", "Rua das Acácias", "184", "Fazenda Caxias", departmentRows[1][0], teamRows[0][0]],
    ["00000000-0000-4000-8000-000000000502", "2026-0001427", "Buraco na Rua das Flores", "Buraco extenso próximo à faixa de pedestres.", categoryRows[1][0], "Urgente", "Encaminhada", "Rua das Flores", "920", "Boa Esperança", departmentRows[0][0], teamRows[2][0]],
    ["00000000-0000-4000-8000-000000000503", "2026-0001426", "Coleta de lixo atrasada", "Coleta não realizada na rota da última terça-feira.", categoryRows[2][0], "Normal", "Triagem", "Avenida Esperança", "45", "Campo Lindo", departmentRows[1][0], teamRows[4][0]],
    ["00000000-0000-4000-8000-000000000504", "2026-0001425", "Árvore com risco de queda", "Galhos de grande porte sobre a rede elétrica.", categoryRows[3][0], "Urgente", "Em andamento", "Alameda Ipês", "310", "São Miguel", departmentRows[2][0], teamRows[3][0]],
    ["00000000-0000-4000-8000-000000000505", "2026-0001424", "Vazamento de água", "Vazamento constante na calçada próximo ao hidrante.", categoryRows[4][0], "Alta", "Aguardando", "Rua do Comércio", "57", "Ecologia", departmentRows[0][0], null],
  ] as const;
  const coordinates = [["-22.742900", "-43.700800"], ["-22.747600", "-43.704800"], ["-22.799500", "-43.648000"], ["-22.720500", "-43.744000"], ["-22.754600", "-43.684500"]] as const;
  const postalCodes = ["23895-295", "23894-358", "23898-120", "23893-740", "23891-120"] as const;
  for (let index = 0; index < examples.length; index += 1) {
    const [id, protocol, title, description, categoryId, priority, status, address, addressNumber, neighborhood, departmentId, teamId] = examples[index];
    await db.insert(requests).values({ id, municipalityId, protocol, title, description, categoryId, priority, status, address, addressNumber, neighborhood, departmentId, teamId, citizenName: "Ana Carolina Souza", citizenPhone: "(11) 98765-4321", citizenEmail: "ana.souza@exemplo.com", createdBy: adminId, createdAt: new Date(`2026-09-${18 - index}T11:00:00-03:00`) }).onConflictDoNothing();
    await db.update(requests).set({ neighborhood, postalCode: postalCodes[index], latitude: coordinates[index][0], longitude: coordinates[index][1], departmentId, teamId }).where(eq(requests.id, id));
    await db.insert(requestHistory).values({ id: `00000000-0000-4000-8000-0000000006${String(index + 1).padStart(2, "0")}`, requestId: id, userId: adminId, action: "Solicitação criada", note: "Registro inicial importado pelo seed.", createdAt: new Date(`2026-09-${18 - index}T11:00:00-03:00`) }).onConflictDoNothing();
  }
  await db.insert(notifications).values([
    { id: "00000000-0000-4000-8000-000000000701", municipalityId, userId: adminId, requestId: examples[0][0], title: "Solicitação em atendimento", description: `${examples[0][1]} está com a equipe responsável.`, createdAt: new Date("2026-09-18T14:30:00-03:00") },
    { id: "00000000-0000-4000-8000-000000000702", municipalityId, userId: adminId, requestId: examples[1][0], title: "Prioridade urgente", description: `${examples[1][1]} requer acompanhamento prioritário.`, createdAt: new Date("2026-09-17T15:00:00-03:00") },
  ]).onConflictDoNothing();
  await db.execute(sql`
    update ${requests} r
    set
      response_due_at = coalesce(r.response_due_at, r.created_at + make_interval(hours => p.response_hours)),
      resolution_due_at = coalesce(r.resolution_due_at, r.created_at + make_interval(hours => p.resolution_hours)),
      first_responded_at = case when r.status <> 'Aberta' then coalesce(r.first_responded_at, r.updated_at) else r.first_responded_at end
    from ${prioritySettings} p
    where r.municipality_id = ${municipalityId}
      and p.municipality_id = r.municipality_id
      and p.priority = r.priority
      and (r.response_due_at is null or r.resolution_due_at is null or (r.first_responded_at is null and r.status <> 'Aberta'))
  `);
  console.log("Seed concluído. Usuário: admin@cidadefacil.local");
}

seed().finally(() => client.end());
