/**
 * Cliente HTTP para a API LuxeVoyage (FastAPI).
 *
 * A URL base vem da env var VITE_API_URL:
 *   - em dev, cai em "http://localhost:8000" se você não definir nada;
 *   - em produção (Vercel), defina VITE_API_URL apontando pro domínio
 *     onde a API estiver hospedada (ex.: https://api.luxevoyage.com.br).
 */
const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:8000";

const TOKEN_KEY = "luxevoyage:token";
const AUTH_EVENT = "luxevoyage:auth-changed";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function onAuthChange(callback: () => void) {
  window.addEventListener(AUTH_EVENT, callback);
  return () => window.removeEventListener(AUTH_EVENT, callback);
}

type ApiFetchOptions = Omit<RequestInit, "body"> & { body?: unknown };

/** Faz uma chamada à API, já anexando o token (se houver) e tratando erros. */
export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const token = getToken();
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
