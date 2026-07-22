import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch, getToken, onAuthChange, setToken } from "./api";

export type UsuarioLogado = {
  id_usuario_interno: number;
  nome: string;
  cargo: string | null;
  email_corporativo: string;
  nivel_acesso: string;
};

type LoginResponse = { token: string; usuario: UsuarioLogado };

/** Faz login na API e guarda o token. Lança ApiError em caso de falha. */
export async function login(email: string, senha: string): Promise<UsuarioLogado> {
  const data = await apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: { email, senha },
  });
  setToken(data.token);
  return data.usuario;
}

export function logout() {
  setToken(null);
}

/**
 * Hook de sessão: expõe o usuário logado (ou null) e mantém tudo em
 * sincronia entre componentes (ex.: Header e página de login) sem precisar
 * de um Context provider — qualquer componente que use useAuth() reage
 * automaticamente a um login/logout feito em outro lugar da tela.
 */
export function useAuth() {
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null);
  const [carregando, setCarregando] = useState(true);

  const recarregarSessao = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUsuario(null);
      setCarregando(false);
      return;
    }
    try {
      const dados = await apiFetch<UsuarioLogado>("/api/auth/me");
      setUsuario(dados);
    } catch (error) {
      // Token expirado/inválido: limpa a sessão local silenciosamente.
      if (error instanceof ApiError && error.status === 401) {
        setToken(null);
      }
      setUsuario(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregarSessao();
    return onAuthChange(recarregarSessao);
  }, [recarregarSessao]);

  return { usuario, carregando, estaLogado: usuario !== null, logout };
}
