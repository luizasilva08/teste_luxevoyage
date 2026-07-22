/**
 * Cliente da vitrine pública (destinos, pacotes, pedido de cotação).
 * Consome as rotas /api/publico/* da API — já vêm com os JOINs prontos
 * (destino, preço, parceiro), sem precisar montar isso no front.
 */
import { apiFetch } from "./api";

export type Destino = {
  id_municipio: number;
  destino: string;
  categoria: string | null;
  estado_sigla: string;
  estado_nome: string;
  regiao_nome: string;
  total_pacotes: number;
  preco_a_partir: number | null;
};

export type PacoteResumo = {
  id_pacote: number;
  nome_pacote: string;
  status: string;
  id_municipio: number;
  destino: string;
  categoria: string | null;
  estado_sigla: string;
  estado_nome: string;
  regiao_nome: string;
  preco_a_partir: number | null;
  destaque: string | null;
};

export type ServicoPacote = {
  id_modulo: number;
  obrigatorio: boolean | number;
  nome_servico: string;
  categoria_servico: string;
  parceiro: string;
  preco_a_partir: number | null;
};

export type PrecoSazonal = {
  temporada: string;
  data_inicio: string;
  data_fim: string;
  valor_total: number;
};

export type PacoteDetalhe = PacoteResumo & {
  estado_sigla: string;
  timezone: string;
  servicos: ServicoPacote[];
  precos_sazonais: PrecoSazonal[];
};

export async function listarDestinos(): Promise<Destino[]> {
  return apiFetch<Destino[]>("/api/publico/destinos");
}

export type FiltrosPacotes = {
  busca?: string;
  regiao?: string;
  estado?: string;
  limit?: number;
  offset?: number;
};

export async function listarPacotes(
  filtros: FiltrosPacotes = {},
): Promise<{ registros: PacoteResumo[]; total: number }> {
  const params = new URLSearchParams();
  if (filtros.busca) params.set("busca", filtros.busca);
  if (filtros.regiao) params.set("regiao", filtros.regiao);
  if (filtros.estado) params.set("estado", filtros.estado);
  if (filtros.limit) params.set("limit", String(filtros.limit));
  if (filtros.offset) params.set("offset", String(filtros.offset));
  const qs = params.toString();
  return apiFetch(`/api/publico/pacotes${qs ? `?${qs}` : ""}`);
}

export async function buscarPacote(idPacote: number | string): Promise<PacoteDetalhe> {
  return apiFetch<PacoteDetalhe>(`/api/publico/pacotes/${idPacote}`);
}

export type PedidoCotacao = {
  nome: string;
  email: string;
  telefone?: string;
  cep?: string;
  id_pacote?: number;
  id_municipio_destino?: number;
  mensagem?: string;
};

export async function solicitarCotacao(
  pedido: PedidoCotacao,
): Promise<{ mensagem: string; id_oportunidade: number }> {
  return apiFetch("/api/publico/cotacoes", { method: "POST", body: pedido });
}
