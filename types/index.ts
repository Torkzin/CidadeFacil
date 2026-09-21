export type RequestStatus = "Aberta" | "Triagem" | "Encaminhada" | "Em andamento" | "Aguardando" | "Concluída" | "Cancelada";
export type RequestPriority = "Baixa" | "Normal" | "Alta" | "Urgente";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "Administrador" | "Secretário" | "Gestor" | "Servidor" | "Equipe de campo";
  department: string;
  status: "Ativo" | "Inativo";
  lastAccess: string;
}

export interface Department {
  id: string;
  name: string;
  manager: string;
  requests: number;
  inProgress: number;
  overdue: number;
  teams: number;
}

export interface Team {
  id: string;
  name: string;
  department: string;
  members: number;
  active: number;
  completed: number;
  status: "Disponível" | "Em campo" | "Pausa";
}

export interface Citizen {
  name: string;
  phone: string;
  email: string;
}

export interface RequestCategory {
  id: string;
  name: string;
  color: string;
}

export interface RequestHistory {
  id: string;
  title: string;
  date: string;
  time: string;
  user: string;
  note: string;
}

export interface MunicipalRequest {
  id: string;
  protocol: string;
  title: string;
  description: string;
  category: string;
  neighborhood: string;
  department: string;
  team: string;
  priority: RequestPriority;
  status: RequestStatus;
  date: string;
  updatedAt: string;
  address: string;
  citizen: Citizen;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
}
