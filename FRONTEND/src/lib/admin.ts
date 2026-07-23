/**
 * Cliente da área "Administração" do painel — CRUD genérico sobre
 * QUALQUER tabela do REGISTRO (SRC/registro.py), o mesmo dado que
 * alimenta o menu de terminal do main.py. Só o Admin vê essa área
 * (ver lib/permissoes.ts); a API já faz a checagem de verdade por
 * tabela (PERMISSOES_TABELA em SRC/api_fastapi.py).
 */
import { apiFetch } from "./api";

export type TabelaInfo = {
  pk: string;
  cols: string[];
  entidade: string;
  plural: string;
};

export type Registro = Record<string, Record<string, TabelaInfo>>;

export function getRegistro(): Promise<Registro> {
  return apiFetch<Registro>("/api/registro");
}

export type LinhaGenerica = Record<string, unknown>;

export async function listarLinhas(
  dominio: string,
  tabela: string,
  opts: { campo?: string; valor?: string; limit?: number; offset?: number } = {},
): Promise<{ registros: LinhaGenerica[]; total: number }> {
  const params = new URLSearchParams();
  if (opts.campo && opts.valor) {
    params.set("campo", opts.campo);
    params.set("valor", opts.valor);
  }
  params.set("limit", String(opts.limit ?? 50));
  params.set("offset", String(opts.offset ?? 0));
  return apiFetch(`/api/${dominio}/${tabela}?${params.toString()}`);
}

export function criarLinha(dominio: string, tabela: string, dados: LinhaGenerica) {
  return apiFetch<{ id: number }>(`/api/${dominio}/${tabela}`, { method: "POST", body: dados });
}

export function atualizarLinha(dominio: string, tabela: string, id: string | number, dados: LinhaGenerica) {
  return apiFetch(`/api/${dominio}/${tabela}/${id}`, { method: "PUT", body: dados });
}

export function deletarLinha(dominio: string, tabela: string, id: string | number) {
  return apiFetch(`/api/${dominio}/${tabela}/${id}`, { method: "DELETE" });
}
