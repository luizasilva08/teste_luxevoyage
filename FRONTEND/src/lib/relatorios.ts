/**
 * Cliente da aba "Relatórios" do painel. Consultas fixas definidas em
 * SRC/relatorios.py — o front só lista o que a API já filtrou pro nível
 * de acesso de quem está logado e executa pelo id.
 */
import { apiFetch } from "./api";

export type RelatorioMeta = {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  niveis: string[];
};

export type ResultadoRelatorio = {
  titulo: string;
  registros: Record<string, unknown>[];
  total: number;
};

export function listarRelatorios(): Promise<RelatorioMeta[]> {
  return apiFetch<RelatorioMeta[]>("/api/painel/relatorios");
}

export function executarRelatorio(id: string): Promise<ResultadoRelatorio> {
  return apiFetch<ResultadoRelatorio>(`/api/painel/relatorios/${id}/executar`);
}
