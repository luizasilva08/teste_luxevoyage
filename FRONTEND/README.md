# Luxe Voyage — Front-end (React + TanStack Start)

Este é o app web (gerado inicialmente no Lovable) que conversa com a API em
`../SRC/api_fastapi.py`. Eles rodam como **dois processos separados**: o
front aqui na porta 3000, a API na porta 8000. O front chama a API via
`fetch`, usando a URL configurada em `VITE_API_URL`.

## Como rodar em desenvolvimento

Em um terminal, suba a API (veja o README raiz do projeto para detalhes):

```bash
cd ../SRC
pip install -r requirements.txt
uvicorn api_fastapi:app --reload --port 8000
```

Em outro terminal, suba o front:

```bash
cd FRONTEND
cp .env.example .env      # ajuste VITE_API_URL se a API não estiver em localhost:8000
npm install
npm run dev
```

Acesse `http://localhost:3000`. A tela de login (`/auth`) já está ligada à
API — para conseguir entrar, é preciso ter um usuário com senha definida
(veja `SRC/criar_senha_usuario.py` no README raiz).

## Variáveis de ambiente

| Variável | Para que serve | Padrão |
|---|---|---|
| `VITE_API_URL` | URL base da API FastAPI | `http://localhost:8000` |

## Autenticação

- `src/lib/api.ts` — cliente HTTP genérico (anexa o token automaticamente, padroniza erros).
- `src/lib/auth.ts` — `login()`, `logout()` e o hook `useAuth()` (estado de sessão, reativo em toda a aplicação).
- O token fica salvo em `localStorage` (`luxevoyage:token`).

## Build de produção

```bash
npm run build
```

Isso gera `.output/`, pronto para deploy. **Atenção:** o preset padrão do
Nitro neste projeto (herdado da config do Lovable, em `vite.config.ts`)
está configurado para Cloudflare (`cloudflare-module`). Se o destino final
for a Vercel, será preciso trocar esse preset para o da Vercel antes do
deploy lá — e configurar `VITE_API_URL` nas variáveis de ambiente do
projeto na Vercel, apontando para onde a API estiver hospedada (a API em
si não roda na Vercel — veja o README raiz do projeto).
