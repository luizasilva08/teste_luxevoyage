/**
 * Cliente do painel interno (pós-login). Usa as rotas /api/painel/* (já
 * com JOINs prontos para as telas de atendimento) e, quando não há JOIN
 * envolvido, reaproveita o CRUD genérico da API (/api/{dominio}/{tabela})
 * — o mesmo que alimenta o menu de terminal do main.py — só que
 * apresentado como catálogo/CRM, não como tabelas cruas.
 */
import { apiFetch } from "./api";

// --- Dashboard ---------------------------------------------------------
export type Dashboard = {
  metricas: Record<string, number>;
  funil: { rotulo: string; total: number }[];
  viagens_status: { rotulo: string; total: number }[];
};

export function getDashboard(): Promise<Dashboard> {
  return apiFetch<Dashboard>("/api/dashboard");
}

// --- Funil de leads (Oportunidade_CRM) ---------------------------------
export type OportunidadePainel = {
  id_oportunidade: number;
  estagio_funil: string;
  valor_estimado: number | null;
  id_cliente: number;
  cliente_nome: string;
  cliente_email: string;
  cliente_telefone: string | null;
  id_usuario_interno: number | null;
  consultor_nome: string | null;
};

export function listarOportunidades(): Promise<OportunidadePainel[]> {
  return apiFetch<OportunidadePainel[]>("/api/painel/oportunidades");
}

export type OportunidadeDetalhe = OportunidadePainel & {
  cliente_cep: string | null;
  interesses: { id_interesse: number; status: string; destino: string; estado_sigla: string }[];
  historico: {
    id_interacao: number;
    tipo_interacao: string;
    data_interacao: string;
    consultor_nome: string | null;
  }[];
};

export function buscarOportunidade(id: number): Promise<OportunidadeDetalhe> {
  return apiFetch<OportunidadeDetalhe>(`/api/painel/oportunidades/${id}`);
}

export function registrarInteracao(id: number, tipoInteracao: string) {
  return apiFetch(`/api/painel/oportunidades/${id}/interacoes`, {
    method: "POST",
    body: { tipo_interacao: tipoInteracao },
  });
}

export function atualizarOportunidade(
  id: number,
  campos: { estagio_funil?: string; id_usuario_interno?: number; valor_estimado?: number },
) {
  return apiFetch(`/api/CRM/Oportunidade_CRM/${id}`, { method: "PUT", body: campos });
}

export const ESTAGIOS_FUNIL = [
  "Novo Lead",
  "Contato Iniciado",
  "Proposta Enviada",
  "Negociação",
  "Fechado",
  "Perdido",
] as const;

// --- Clientes ------------------------------------------------------------
export type ClientePainel = {
  id_cliente: number;
  nome: string;
  cpf_criptografado: string | null;
  email_criptografado: string | null;
  telefone_criptografado: string | null;
  cep: string | null;
  id_municipio_origem: number | null;
};

export async function listarClientes(limit = 50, offset = 0): Promise<ClientePainel[]> {
  const data = await apiFetch<{ registros: ClientePainel[] }>(
    `/api/Clientes/Cliente?limit=${limit}&offset=${offset}`,
  );
  return data.registros;
}

export async function buscarClientesPorNome(nome: string): Promise<ClientePainel[]> {
  const data = await apiFetch<{ registros: ClientePainel[] }>(
    `/api/Clientes/Cliente?campo=nome&valor=${encodeURIComponent(nome)}`,
  );
  return data.registros;
}

export function buscarCliente(id: number): Promise<ClientePainel> {
  return apiFetch(`/api/Clientes/Cliente/${id}`);
}

export type InteresseCliente = {
  id_interesse: number;
  id_cliente: number;
  id_municipio_destino: number;
  status: string;
};

export async function listarInteressesDoCliente(idCliente: number): Promise<InteresseCliente[]> {
  const data = await apiFetch<{ registros: InteresseCliente[] }>(
    `/api/Clientes/Interesses_Cliente?campo=id_cliente&valor=${idCliente}`,
  );
  return data.registros;
}

export type OportunidadeDoCliente = {
  id_oportunidade: number;
  id_cliente: number;
  id_usuario_interno: number | null;
  estagio_funil: string;
  valor_estimado: number | null;
};

export async function listarOportunidadesDoCliente(
  idCliente: number,
): Promise<OportunidadeDoCliente[]> {
  const data = await apiFetch<{ registros: OportunidadeDoCliente[] }>(
    `/api/CRM/Oportunidade_CRM?campo=id_cliente&valor=${idCliente}`,
  );
  return data.registros;
}

// --- Catálogo (pacotes) ---------------------------------------------------
export type PacoteAdmin = {
  id_pacote: number;
  nome_pacote: string;
  id_municipio_destino: number;
  status: string;
};

export async function listarPacotesAdmin(limit = 100, offset = 0): Promise<PacoteAdmin[]> {
  const data = await apiFetch<{ registros: PacoteAdmin[] }>(
    `/api/Catalogo/Pacote?limit=${limit}&offset=${offset}`,
  );
  return data.registros;
}

export function criarPacoteAdmin(pacote: {
  nome_pacote: string;
  id_municipio_destino: number;
  status: string;
}) {
  return apiFetch<{ id: number }>("/api/Catalogo/Pacote", { method: "POST", body: pacote });
}

export function atualizarPacoteAdmin(
  id: number,
  campos: Partial<{ nome_pacote: string; id_municipio_destino: number; status: string }>,
) {
  return apiFetch(`/api/Catalogo/Pacote/${id}`, { method: "PUT", body: campos });
}

export function deletarPacoteAdmin(id: number) {
  return apiFetch(`/api/Catalogo/Pacote/${id}`, { method: "DELETE" });
}

// --- Geografia (para selects) ---------------------------------------------
export type MunicipioOpcao = {
  id_municipio: number;
  nome: string;
  id_estado: number;
  categoria: string | null;
};

export async function listarMunicipios(limit = 500): Promise<MunicipioOpcao[]> {
  const data = await apiFetch<{ registros: MunicipioOpcao[] }>(
    `/api/Geografia/Municipio?limit=${limit}`,
  );
  return data.registros;
}

export const STATUS_PACOTE = ["Rascunho", "Em Revisão", "Publicado", "Ativo", "Inativo"] as const;
