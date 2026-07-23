/**
 * Regras de acesso por Usuario_Interno.nivel_acesso, espelhando o que a
 * API já aplica (SRC/api_fastapi.py, PERMISSOES_TABELA). Ficam aqui só
 * pra esconder no front o que o usuário não pode fazer — a garantia de
 * verdade é sempre a checagem no backend.
 */
import type { UsuarioLogado } from "./auth";

type Usuario = UsuarioLogado | null | undefined;

function tem(usuario: Usuario, niveis: string[]): boolean {
  return !!usuario && niveis.includes(usuario.nivel_acesso);
}

export const podeVerVisaoGeral = (u: Usuario) => tem(u, ["Admin", "Gerente", "Operacoes"]);
export const podeGerenciarAtendimentos = (u: Usuario) =>
  tem(u, ["Admin", "Gerente", "Suporte", "Vendedor"]);
export const podeGerenciarCatalogo = (u: Usuario) => tem(u, ["Admin", "Gerente", "Operacoes"]);
export const podeGerenciarPropostas = (u: Usuario) => tem(u, ["Admin", "Gerente", "Vendedor"]);
export const podeGerenciarViagens = (u: Usuario) => tem(u, ["Admin", "Gerente", "Operacoes"]);
export const podeExcluir = (u: Usuario) => tem(u, ["Admin"]);
export const podeAdministrarTudo = (u: Usuario) => tem(u, ["Admin"]);
