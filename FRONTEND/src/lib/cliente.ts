/**
 * Cliente HTTP + sessão da área "Minha conta" do CLIENTE — separado de
 * lib/api.ts (que é a sessão da EQUIPE interna, usada no /painel). Guarda
 * o token numa chave de localStorage diferente, então logar como cliente
 * não derruba uma sessão de equipe aberta no mesmo navegador, e vice-versa.
 */
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "./api";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:8000";

const TOKEN_KEY = "luxevoyage:cliente-token";
const AUTH_EVENT = "luxevoyage:cliente-auth-changed";

export function getClienteToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function setClienteToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function onClienteAuthChange(callback: () => void) {
  window.addEventListener(AUTH_EVENT, callback);
  return () => window.removeEventListener(AUTH_EVENT, callback);
}

type ApiFetchOptions = Omit<RequestInit, "body"> & { body?: unknown };

async function apiFetchCliente<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const token = getClienteToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (payload && (payload.erro ?? payload.detail)) ?? `Erro ${response.status} ao falar com a API.`;
    throw new ApiError(String(message), response.status);
  }

  return payload as T;
}

export type ClienteLogado = {
  id_cliente: number;
  nome: string;
  email_criptografado: string;
  telefone_criptografado: string | null;
  cpf_criptografado: string | null;
  cep: string | null;
  id_municipio_origem: number | null;
};

type SessaoResponse = { token: string; cliente: ClienteLogado };

export async function clienteLogin(email: string, senha: string): Promise<ClienteLogado> {
  const data = await apiFetchCliente<SessaoResponse>("/api/auth/cliente/login", {
    method: "POST",
    body: { email, senha },
  });
  setClienteToken(data.token);
  return data.cliente;
}

export async function clienteRegistrar(dados: {
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  cep?: string;
}): Promise<ClienteLogado> {
  const data = await apiFetchCliente<SessaoResponse>("/api/auth/cliente/registrar", {
    method: "POST",
    body: dados,
  });
  setClienteToken(data.token);
  return data.cliente;
}

export function clienteLogout() {
  setClienteToken(null);
}

export function useClienteAuth() {
  const [cliente, setCliente] = useState<ClienteLogado | null>(null);
  const [carregando, setCarregando] = useState(true);

  const recarregarSessao = useCallback(async () => {
    const token = getClienteToken();
    if (!token) {
      setCliente(null);
      setCarregando(false);
      return;
    }
    try {
      const dados = await apiFetchCliente<ClienteLogado>("/api/auth/cliente/me");
      setCliente(dados);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setClienteToken(null);
      }
      setCliente(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    recarregarSessao();
    return onClienteAuthChange(recarregarSessao);
  }, [recarregarSessao]);

  return { cliente, carregando, estaLogado: cliente !== null, logout: clienteLogout };
}

// --- "Minha conta" ----------------------------------------------------------
export type OportunidadeConta = {
  id_oportunidade: number;
  estagio_funil: string;
  valor_estimado: number | null;
  consultor_nome: string | null;
  nome_pacote: string | null;
  status_cotacao: string | null;
};

export type ViagemConta = {
  id_viagem: number;
  status_viagem: string;
  data_embarque: string;
  data_retorno: string;
  id_contrato: number;
  nome_pacote: string | null;
  status_contrato: string;
  parcelas_pagas: number;
  parcelas_total: number;
  avaliacao_nota: number | null;
  avaliacao_comentario: string | null;
};

export type PagamentoConta = {
  id_pagamento: number;
  id_contrato: number;
  metodo_pagamento: string;
  valor_total: number;
  numero_parcela: number;
  total_parcelas: number;
  status_transacao: string;
  nome_pacote: string | null;
};

export type MensagemConta = {
  id_interacao: number;
  id_oportunidade: number;
  tipo_interacao: string;
  data_interacao: string;
  consultor_nome: string | null;
};

export type ResumoConta = {
  cliente: ClienteLogado;
  oportunidades: OportunidadeConta[];
  viagens: ViagemConta[];
  pagamentos: PagamentoConta[];
  mensagens: MensagemConta[];
};

export function getResumoConta(): Promise<ResumoConta> {
  return apiFetchCliente<ResumoConta>("/api/conta/resumo");
}

export function enviarMensagemConta(idOportunidade: number, mensagem: string) {
  return apiFetchCliente(`/api/conta/oportunidades/${idOportunidade}/mensagens`, {
    method: "POST",
    body: { mensagem },
  });
}

export function avaliarViagemConta(idViagem: number, nota: number, comentario?: string) {
  return apiFetchCliente(`/api/conta/viagens/${idViagem}/avaliacao`, {
    method: "POST",
    body: { nota, comentario },
  });
}

export function pagarParcelaConta(idPagamento: number) {
  return apiFetchCliente(`/api/conta/pagamentos/${idPagamento}/pagar`, { method: "POST" });
}
