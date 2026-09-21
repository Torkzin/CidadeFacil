import type { Department, MunicipalRequest, RequestCategory, RequestHistory, Team, User } from "@/types";

export const categories: RequestCategory[] = [
  { id: "lighting", name: "Iluminação Pública", color: "#155e75" },
  { id: "roads", name: "Buracos/Vias", color: "#f59e0b" },
  { id: "trash", name: "Coleta de lixo", color: "#16a34a" },
  { id: "trees", name: "Poda de árvores", color: "#65a30d" },
  { id: "water", name: "Saneamento", color: "#2563eb" },
  { id: "other", name: "Outros", color: "#64748b" },
];

const citizen = { name: "Ana Carolina Souza", phone: "(11) 98765-4321", email: "ana.souza@exemplo.com" };

export const requests: MunicipalRequest[] = [
  { id: "2026-0001428", protocol: "2026-0001428", title: "Poste sem iluminação", description: "Poste apagado há quatro noites, deixando o trecho com baixa visibilidade.", category: "Iluminação Pública", neighborhood: "Centro", department: "Serviços Públicos", team: "Iluminação 01", priority: "Alta", status: "Em andamento", date: "18 set 2026", updatedAt: "Hoje, 10:42", address: "Rua das Acácias, 184", citizen },
  { id: "2026-0001427", protocol: "2026-0001427", title: "Buraco na Rua das Flores", description: "Buraco extenso próximo à faixa de pedestres.", category: "Buracos/Vias", neighborhood: "Jardim das Flores", department: "Obras", team: "Equipe de Asfalto", priority: "Urgente", status: "Encaminhada", date: "18 set 2026", updatedAt: "Hoje, 09:18", address: "Rua das Flores, 920", citizen },
  { id: "2026-0001426", protocol: "2026-0001426", title: "Coleta de lixo atrasada", description: "Coleta não realizada na rota da última terça-feira.", category: "Coleta de lixo", neighborhood: "Boa Esperança", department: "Serviços Públicos", team: "Limpeza Urbana", priority: "Normal", status: "Triagem", date: "17 set 2026", updatedAt: "Ontem, 17:02", address: "Av. Esperança, 45", citizen },
  { id: "2026-0001425", protocol: "2026-0001425", title: "Árvore com risco de queda", description: "Galhos de grande porte sobre a rede elétrica.", category: "Poda de árvores", neighborhood: "São Miguel", department: "Meio Ambiente", team: "Equipe de Poda", priority: "Urgente", status: "Em andamento", date: "17 set 2026", updatedAt: "Ontem, 15:40", address: "Alameda Ipês, 310", citizen },
  { id: "2026-0001424", protocol: "2026-0001424", title: "Vazamento de água", description: "Vazamento constante na calçada próximo ao hidrante.", category: "Saneamento", neighborhood: "Centro", department: "Obras", team: "Manutenção Hidráulica", priority: "Alta", status: "Aguardando", date: "16 set 2026", updatedAt: "16 set, 18:20", address: "Rua do Comércio, 57", citizen },
  { id: "2026-0001423", protocol: "2026-0001423", title: "Bueiro entupido", description: "Bueiro acumulando água após chuva.", category: "Saneamento", neighborhood: "Parque Industrial", department: "Obras", team: "Drenagem", priority: "Alta", status: "Aberta", date: "16 set 2026", updatedAt: "16 set, 16:05", address: "Av. Industrial, 1220", citizen },
  { id: "2026-0001422", protocol: "2026-0001422", title: "Iluminação piscando", description: "Luminária apresenta falha intermitente.", category: "Iluminação Pública", neighborhood: "Vila Nova", department: "Serviços Públicos", team: "Iluminação 02", priority: "Normal", status: "Concluída", date: "15 set 2026", updatedAt: "17 set, 11:10", address: "Rua Pará, 88", citizen },
  { id: "2026-0001421", protocol: "2026-0001421", title: "Entulho em via pública", description: "Resíduos de obra bloqueiam parte da pista.", category: "Coleta de lixo", neighborhood: "Jardim das Flores", department: "Serviços Públicos", team: "Limpeza Urbana", priority: "Alta", status: "Encaminhada", date: "15 set 2026", updatedAt: "16 set, 08:30", address: "Rua Primavera, 19", citizen },
  { id: "2026-0001420", protocol: "2026-0001420", title: "Calçada danificada", description: "Piso irregular em rota de acesso à escola.", category: "Buracos/Vias", neighborhood: "Boa Esperança", department: "Obras", team: "Conservação", priority: "Normal", status: "Triagem", date: "14 set 2026", updatedAt: "15 set, 14:12", address: "Rua das Palmeiras, 501", citizen },
  { id: "2026-0001419", protocol: "2026-0001419", title: "Sinalização quebrada", description: "Placa de pare tombada após colisão.", category: "Outros", neighborhood: "São Miguel", department: "Transporte", team: "Sinalização", priority: "Urgente", status: "Em andamento", date: "14 set 2026", updatedAt: "15 set, 10:05", address: "Av. São Miguel, 734", citizen },
  { id: "2026-0001418", protocol: "2026-0001418", title: "Semáforo com falha", description: "Semáforo opera apenas com luz amarela.", category: "Outros", neighborhood: "Centro", department: "Transporte", team: "Sinalização", priority: "Urgente", status: "Concluída", date: "13 set 2026", updatedAt: "14 set, 07:55", address: "Av. Central, 100", citizen },
  { id: "2026-0001417", protocol: "2026-0001417", title: "Descarte irregular", description: "Materiais descartados em terreno municipal.", category: "Coleta de lixo", neighborhood: "Parque Industrial", department: "Meio Ambiente", team: "Fiscalização", priority: "Normal", status: "Aberta", date: "13 set 2026", updatedAt: "13 set, 13:22", address: "Rua Projetada B, 12", citizen },
  { id: "2026-0001416", protocol: "2026-0001416", title: "Faixa de pedestre apagada", description: "Pintura da faixa quase invisível.", category: "Outros", neighborhood: "Vila Nova", department: "Transporte", team: "Sinalização", priority: "Alta", status: "Aguardando", date: "12 set 2026", updatedAt: "14 set, 16:40", address: "Rua Paraná, 210", citizen },
  { id: "2026-0001415", protocol: "2026-0001415", title: "Mato alto em praça", description: "Vegetação alta no entorno dos brinquedos.", category: "Poda de árvores", neighborhood: "Boa Esperança", department: "Meio Ambiente", team: "Equipe de Poda", priority: "Baixa", status: "Concluída", date: "11 set 2026", updatedAt: "13 set, 09:14", address: "Praça da Amizade, s/n", citizen },
  { id: "2026-0001414", protocol: "2026-0001414", title: "Tampa de bueiro solta", description: "Tampa metálica deslocada causando ruído e risco.", category: "Saneamento", neighborhood: "Jardim das Flores", department: "Obras", team: "Drenagem", priority: "Alta", status: "Cancelada", date: "10 set 2026", updatedAt: "11 set, 12:00", address: "Rua das Rosas, 64", citizen },
];

export const departments: Department[] = [
  { id: "obras", name: "Secretaria de Obras", manager: "Carlos Eduardo Lima", requests: 348, inProgress: 42, overdue: 9, teams: 4 },
  { id: "servicos", name: "Secretaria de Serviços Públicos", manager: "Mariana Ribeiro", requests: 426, inProgress: 55, overdue: 12, teams: 6 },
  { id: "ambiente", name: "Secretaria de Meio Ambiente", manager: "Roberta Nunes", requests: 219, inProgress: 28, overdue: 6, teams: 3 },
  { id: "transporte", name: "Secretaria de Transporte", manager: "Paulo Mendes", requests: 187, inProgress: 21, overdue: 5, teams: 3 },
  { id: "saude", name: "Secretaria de Saúde", manager: "Helena Duarte", requests: 143, inProgress: 14, overdue: 3, teams: 8 },
  { id: "educacao", name: "Secretaria de Educação", manager: "Luís Peixoto", requests: 105, inProgress: 11, overdue: 2, teams: 5 },
];

export const teams: Team[] = [
  { id: "ilum-01", name: "Equipe de Iluminação 01", department: "Serviços Públicos", members: 6, active: 8, completed: 142, status: "Em campo" },
  { id: "ilum-02", name: "Equipe de Iluminação 02", department: "Serviços Públicos", members: 5, active: 4, completed: 118, status: "Disponível" },
  { id: "asfalto", name: "Equipe de Asfalto", department: "Obras", members: 12, active: 11, completed: 96, status: "Em campo" },
  { id: "poda", name: "Equipe de Poda", department: "Meio Ambiente", members: 8, active: 7, completed: 81, status: "Em campo" },
  { id: "limpeza", name: "Equipe de Limpeza Urbana", department: "Serviços Públicos", members: 15, active: 6, completed: 204, status: "Disponível" },
];

export const users: User[] = [
  { id: "1", name: "Matheus Vieira", email: "matheus.vieira@cidadeexemplo.gov.br", role: "Administrador", department: "Administração", status: "Ativo", lastAccess: "Agora" },
  { id: "2", name: "Mariana Ribeiro", email: "mariana.ribeiro@cidadeexemplo.gov.br", role: "Secretário", department: "Serviços Públicos", status: "Ativo", lastAccess: "Há 12 min" },
  { id: "3", name: "Carlos Eduardo Lima", email: "carlos.lima@cidadeexemplo.gov.br", role: "Secretário", department: "Obras", status: "Ativo", lastAccess: "Há 35 min" },
  { id: "4", name: "Roberta Nunes", email: "roberta.nunes@cidadeexemplo.gov.br", role: "Gestor", department: "Meio Ambiente", status: "Ativo", lastAccess: "Ontem, 18:22" },
  { id: "5", name: "João Pedro Reis", email: "joao.reis@cidadeexemplo.gov.br", role: "Servidor", department: "Transporte", status: "Inativo", lastAccess: "12 set 2026" },
  { id: "6", name: "Fernanda Rocha", email: "fernanda.rocha@cidadeexemplo.gov.br", role: "Equipe de campo", department: "Serviços Públicos", status: "Ativo", lastAccess: "Há 1 h" },
];

export const requestHistory: RequestHistory[] = [
  { id: "1", title: "Solicitação criada", date: "18 set 2026", time: "08:32", user: "Ana Carolina Souza", note: "Registro realizado pelo Portal do Cidadão." },
  { id: "2", title: "Em triagem", date: "18 set 2026", time: "08:47", user: "Central de Atendimento", note: "Endereço e categoria validados." },
  { id: "3", title: "Encaminhada para Serviços Públicos", date: "18 set 2026", time: "09:05", user: "Marina Lopes", note: "Ocorrência direcionada à secretaria responsável." },
  { id: "4", title: "Atribuída à Equipe de Iluminação", date: "18 set 2026", time: "09:36", user: "Mariana Ribeiro", note: "Equipe 01 designada para vistoria." },
  { id: "5", title: "Em atendimento", date: "18 set 2026", time: "10:42", user: "Fernanda Rocha", note: "Equipe deslocada para o local." },
];

export const monthlyData = [
  { month: "Jan", requests: 108 }, { month: "Fev", requests: 126 }, { month: "Mar", requests: 119 },
  { month: "Abr", requests: 145 }, { month: "Mai", requests: 138 }, { month: "Jun", requests: 162 },
  { month: "Jul", requests: 178 }, { month: "Ago", requests: 194 }, { month: "Set", requests: 219 },
];

export const categoryData = [
  { name: "Iluminação", value: 31 }, { name: "Buracos/Vias", value: 24 }, { name: "Coleta", value: 18 },
  { name: "Poda", value: 12 }, { name: "Saneamento", value: 9 }, { name: "Outros", value: 6 },
];

export const statusData = [
  { name: "Aberta", value: 174, fill: "#f59e0b" }, { name: "Triagem", value: 82, fill: "#8b5cf6" },
  { name: "Em andamento", value: 125, fill: "#0891b2" }, { name: "Concluída", value: 1129, fill: "#16a34a" },
];

export const neighborhoodRanking = [
  { name: "Centro", value: 184 }, { name: "Jardim das Flores", value: 151 }, { name: "Boa Esperança", value: 126 },
  { name: "São Miguel", value: 108 }, { name: "Parque Industrial", value: 92 },
];
