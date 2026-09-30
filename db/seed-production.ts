import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { hashPassword } from "../lib/auth/password";
import {
  categories,
  departments,
  municipalities,
  municipalitySettings,
  notificationPreferences,
  prioritySettings,
  serviceChecklistItems,
  teams,
  users,
} from "./schema";

const databaseUrl = process.env.DATABASE_URL;
const adminPassword = process.env.ADMIN_PASSWORD;
const adminEmail = process.env.ADMIN_EMAIL;
const adminName = process.env.ADMIN_NAME;

if (!databaseUrl) throw new Error("DATABASE_URL não configurada.");
if (!adminEmail) throw new Error("ADMIN_EMAIL não configurado.");
if (!adminName) throw new Error("ADMIN_NAME não configurado.");
if (!adminPassword || adminPassword.length < 12) {
  throw new Error("ADMIN_PASSWORD deve possuir ao menos 12 caracteres.");
}

const client = postgres(databaseUrl, { max: 1 });
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
  ["00000000-0000-4000-8000-000000000301", "Equipe de Iluminação 01", departmentRows[1][0], 6],
  ["00000000-0000-4000-8000-000000000302", "Equipe de Iluminação 02", departmentRows[1][0], 5],
  ["00000000-0000-4000-8000-000000000303", "Equipe de Asfalto", departmentRows[0][0], 12],
  ["00000000-0000-4000-8000-000000000304", "Equipe de Poda", departmentRows[2][0], 8],
  ["00000000-0000-4000-8000-000000000305", "Equipe de Limpeza Urbana", departmentRows[1][0], 15],
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

async function seedProduction() {
  const passwordHash = await hashPassword(adminPassword!);

  await db.transaction(async (tx) => {
    await tx.insert(municipalities).values({ id: municipalityId, name: "Município de Seropédica", slug: "seropedica-rj" })
      .onConflictDoUpdate({ target: municipalities.id, set: { name: "Município de Seropédica", slug: "seropedica-rj", updatedAt: new Date() } });

    for (const [id, name, managerName] of departmentRows) {
      await tx.insert(departments).values({ id, municipalityId, name, managerName })
        .onConflictDoUpdate({ target: departments.id, set: { name, managerName } });
    }

    await tx.insert(users).values({ id: adminId, municipalityId, name: adminName!, email: adminEmail!, passwordHash, role: "Administrador", status: "Ativo" })
      .onConflictDoUpdate({ target: users.id, set: { name: adminName!, email: adminEmail!, passwordHash, status: "Ativo", updatedAt: new Date() } });

    await tx.insert(municipalitySettings).values({ municipalityId, governmentName: "Prefeitura Municipal de Seropédica", taxId: "01.604.139/0001-07", phone: "(21) 2682-2227", address: "Rua Maria Lourenço, 18 · Fazenda Caxias · CEP 23895-295", email: adminEmail!, timezone: "America/Sao_Paulo", citizenResponseHours: 72 })
      .onConflictDoNothing();
    await tx.insert(notificationPreferences).values({ userId: adminId, municipalityId }).onConflictDoNothing();

    for (const [priority, responseHours, resolutionHours] of [["Baixa", 24, 240], ["Normal", 12, 120], ["Alta", 4, 48], ["Urgente", 1, 12]] as const) {
      await tx.insert(prioritySettings).values({ municipalityId, priority, responseHours, resolutionHours }).onConflictDoNothing();
    }
    for (const [id, name, departmentId, memberCount] of teamRows) {
      await tx.insert(teams).values({ id, municipalityId, name, departmentId, memberCount })
        .onConflictDoUpdate({ target: teams.id, set: { name, departmentId, memberCount } });
    }
    for (const [id, name, color] of categoryRows) {
      await tx.insert(categories).values({ id, municipalityId, name, color }).onConflictDoNothing();
    }
    for (const [categoryId, title, required, sortOrder] of checklistRows) {
      await tx.insert(serviceChecklistItems).values({ municipalityId, categoryId, title, required, sortOrder }).onConflictDoNothing();
    }
  });

  console.log(`Inicialização de produção concluída. Administrador: ${adminEmail}`);
}

seedProduction().finally(() => client.end());
