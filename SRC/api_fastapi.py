"""
api_fastapi.py — Backend REST (FastAPI) do LuxeVoyage.

Alternativa ao api_server.py (Flask) — mesmo formato de resposta para o
CRUD genérico. A diferença deste arquivo é que ele também expõe rotas de
autenticação (/api/auth/*), usadas pelo front-end em FRONTEND/ (app React
com TanStack Start, que roda como um processo separado, normalmente na
porta 3000 em desenvolvimento).

Por que essa opção existe ao lado da Flask (e não no lugar dela):
    - FastAPI roda sobre ASGI (Uvicorn), que lida melhor com várias
      requisições em paralelo do que o servidor de desenvolvimento
      síncrono do Flask.
    - Combinado com o pool de conexões em database.py, a segunda
      requisição em diante reaproveita uma conexão já aberta com o
      Aiven, em vez de pagar o handshake SSL de novo a cada chamada.
    - Ganha de brinde a documentação automática em /docs.

Reaproveita 100% da camada de dados que já existe no projeto (TEST/*,
utils.py, registro.py) — não duplica nenhuma regra de negócio.

Como rodar (a partir da pasta SRC/):

    pip install -r requirements.txt
    uvicorn api_fastapi:app --reload --port 8000

Depois abra http://localhost:8000/docs para a documentação interativa,
ou suba o front-end (FRONTEND/, npm run dev) e acesse http://localhost:3000
— veja o README raiz do projeto para o passo a passo dos dois juntos.
"""
import os
import sys
import pathlib
import decimal
import datetime
from typing import Any, Dict, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

# --- bootstrap de caminho (igual ao main.py) --------------------------------
_RAIZ_PROJETO = pathlib.Path(__file__).resolve().parent.parent
_PASTA_TEST = _RAIZ_PROJETO / "TEST"
if str(_PASTA_TEST) not in sys.path:
    sys.path.insert(0, str(_PASTA_TEST))
# -----------------------------------------------------------------------------

from utils import execute_query          # noqa: E402
from registro import REGISTRO            # noqa: E402
from crm import usuario_interno          # noqa: E402
from auth import (                       # noqa: E402
    checar_senha,
    criar_token,
    decodificar_token,
)


# ---------------------------------------------------------------------------
# Serialização JSON customizada — mesmo motivo do Flask: o conector do
# MySQL devolve decimal.Decimal (colunas DECIMAL/NUMERIC), datetime.date/
# datetime/time (colunas DATE/DATETIME/TIMESTAMP/TIME) e bytes (colunas
# VARBINARY/BLOB, ex.: Cliente.*_criptografado), que o JSON não entende
# nativamente. Sem isso, qualquer tabela com esse tipo de coluna quebra.
# ---------------------------------------------------------------------------
def _serializar(obj):
    if isinstance(obj, decimal.Decimal):
        return float(obj)
    if isinstance(obj, (datetime.datetime, datetime.date, datetime.time)):
        return obj.isoformat()
    if isinstance(obj, datetime.timedelta):
        return str(obj)
    if isinstance(obj, (bytes, bytearray)):
        return "0x" + bytes(obj).hex()
    return obj


def _json(conteudo, status_code: int = 200):
    """Serializa um dict/list qualquer, tratando os tipos especiais acima."""
    return JSONResponse(content=jsonable_encoder(conteudo, custom_encoder={
        decimal.Decimal: _serializar,
        datetime.datetime: _serializar,
        datetime.date: _serializar,
        datetime.time: _serializar,
        datetime.timedelta: _serializar,
        bytes: _serializar,
        bytearray: _serializar,
    }), status_code=status_code)


app = FastAPI(
    title="LuxeVoyage API",
    description="Backend REST (FastAPI) — mesmo contrato do api_server.py (Flask).",
    version="1.0",
)

# CORS — em desenvolvimento libera tudo ("*"), igual antes. Em produção,
# defina ALLOWED_ORIGINS no .env com o(s) domínio(s) do front-end
# (ex.: "https://ntask.vercel.app,https://www.luxevoyage.com.br"),
# separados por vírgula, para restringir quem pode chamar a API.
_origens_env = os.environ.get("ALLOWED_ORIGINS", "").strip()
_allow_origins = [o.strip() for o in _origens_env.split(",") if o.strip()] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


def _info_ou_none(dominio: str, tabela: str):
    dominio_dict = REGISTRO.get(dominio)
    if dominio_dict is None:
        return None
    return dominio_dict.get(tabela)


def _chamar(funcao, *args, **kwargs):
    """Wrapper com tratamento de erro — mesma ideia do componentes.py do site Streamlit."""
    try:
        return funcao(*args, **kwargs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _usuario_publico(usuario: dict) -> dict:
    """Remove o hash de senha antes de devolver um usuário pro front-end."""
    return {k: v for k, v in usuario.items() if k != "senha_hash"}


def obter_usuario_atual(authorization: Optional[str] = Header(None)) -> dict:
    """
    Dependência do FastAPI: exige um header "Authorization: Bearer <token>"
    válido. Usada em toda rota que só faz sentido pra um usuário logado.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Token não informado.")

    token = authorization.split(" ", 1)[1].strip()
    payload = decodificar_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado.")

    usuario = usuario_interno.buscar_usuario_por_id(int(payload["sub"]))
    if usuario is None:
        raise HTTPException(status_code=401, detail="Usuário não encontrado.")

    return usuario


# ---------------------------------------------------------------------------
# Autenticação — login da equipe interna (Usuario_Interno).
#
# Fica de fora do CRUD genérico de propósito: senha_hash nunca aparece nas
# rotas /api/{dominio}/{tabela} porque não está em REGISTRO[...]["cols"].
# ---------------------------------------------------------------------------
@app.post("/api/auth/login", tags=["Autenticação"])
async def api_login(request: Request):
    dados: Dict[str, Any] = await request.json()
    email = (dados.get("email") or "").strip()
    senha = dados.get("senha") or ""

    if not email or not senha:
        raise HTTPException(status_code=400, detail="Informe e-mail e senha.")

    usuario = _chamar(usuario_interno.buscar_usuario_por_email, email)
    if usuario is None or not checar_senha(senha, usuario.get("senha_hash")):
        # Mensagem genérica de propósito: não revela se o e-mail existe ou não.
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos.")

    token = criar_token(
        usuario["id_usuario_interno"],
        usuario["email_corporativo"],
        usuario["nivel_acesso"],
    )
    return _json({
        "token": token,
        "usuario": _usuario_publico(usuario),
    })


@app.get("/api/auth/me", tags=["Autenticação"])
def api_me(usuario_atual: dict = Depends(obter_usuario_atual)):
    """Devolve os dados do usuário dono do token enviado — útil pro front
    validar/restaurar a sessão ao recarregar a página."""
    return _json(_usuario_publico(usuario_atual))


# ---------------------------------------------------------------------------
# Raiz da API. O front-end agora é o app React/TanStack em FRONTEND/ (roda
# separado, na porta 3000 em dev — veja FRONTEND/README ou o README raiz).
# Esta rota só confirma que a API está no ar e aponta para a documentação.
# ---------------------------------------------------------------------------
@app.get("/", include_in_schema=False)
def home():
    return _json({
        "status": "LuxeVoyage API no ar",
        "docs": "/docs",
    })


# ---------------------------------------------------------------------------
# Estrutura do menu — domínio -> tabela -> pk/colunas. Mesmo formato que o
# Flask devolve, então o app.js não precisa saber qual dos dois está no ar.
# ---------------------------------------------------------------------------
@app.get("/api/registro", tags=["Sistema"])
def api_registro():
    estrutura = {}
    for dominio, tabelas in REGISTRO.items():
        estrutura[dominio] = {}
        for nome_tabela, info in tabelas.items():
            estrutura[dominio][nome_tabela] = {
                "pk": info["pk"],
                "cols": info["cols"],
                "entidade": info["entidade"],
                "plural": info["plural"],
            }
    return _json(estrutura)


# ---------------------------------------------------------------------------
# Dashboard (home) — mesmas métricas/gráficos do home_page.py do Streamlit
# e do endpoint equivalente no Flask.
# ---------------------------------------------------------------------------
@app.get("/api/dashboard", tags=["Sistema"])
def api_dashboard():
    def contar(tabela):
        try:
            r = execute_query(f"SELECT COUNT(*) AS total FROM {tabela}", fetch="one")
            return r["total"] if r else 0
        except Exception:
            return 0

    metricas = {
        "Clientes": contar("Cliente"),
        "Pacotes": contar("Pacote"),
        "Parceiros": contar("Parceiros"),
        "Viagens": contar("Viagem"),
    }

    try:
        funil = execute_query(
            "SELECT estagio_funil AS rotulo, COUNT(*) AS total "
            "FROM Oportunidade_CRM GROUP BY estagio_funil",
            fetch="all",
        ) or []
    except Exception:
        funil = []

    try:
        viagens_status = execute_query(
            "SELECT status_viagem AS rotulo, COUNT(*) AS total "
            "FROM Viagem GROUP BY status_viagem",
            fetch="all",
        ) or []
    except Exception:
        viagens_status = []

    return _json({
        "metricas": metricas,
        "funil": funil,
        "viagens_status": viagens_status,
    })


# ---------------------------------------------------------------------------
# CRUD genérico — funciona para QUALQUER tabela cadastrada em REGISTRO,
# chamando as mesmas funções (criar_/listar_/buscar_/atualizar_/deletar_)
# que já existem em TEST/<dominio>/<tabela>.py.
# ---------------------------------------------------------------------------
@app.get("/api/{dominio}/{tabela}", tags=["CRUD"])
def api_listar(dominio: str, tabela: str, campo: Optional[str] = None,
                valor: Optional[str] = None, limit: int = Query(20, ge=1, le=1000),
                offset: int = Query(0, ge=0)):
    info = _info_ou_none(dominio, tabela)
    if not info:
        raise HTTPException(status_code=404, detail="Domínio/tabela não encontrado.")

    if campo and valor not in (None, ""):
        colunas_validas = [info["pk"]] + info["cols"]
        if campo not in colunas_validas:
            raise HTTPException(
                status_code=400,
                detail=f"Campo inválido. Use um de: {', '.join(colunas_validas)}",
            )
        funcao = getattr(info["mod"], f"buscar_{info['plural']}_por_campo")
        registros = _chamar(funcao, campo, valor)
    else:
        funcao = getattr(info["mod"], f"listar_{info['plural']}")
        registros = _chamar(funcao, limit=limit, offset=offset)

    return _json({"registros": registros, "total": len(registros)})


@app.get("/api/{dominio}/{tabela}/{id_valor}", tags=["CRUD"])
def api_buscar_por_id(dominio: str, tabela: str, id_valor: str):
    info = _info_ou_none(dominio, tabela)
    if not info:
        raise HTTPException(status_code=404, detail="Domínio/tabela não encontrado.")
    funcao = getattr(info["mod"], f"buscar_{info['entidade']}_por_id")
    registro = _chamar(funcao, id_valor)
    if registro is None:
        raise HTTPException(status_code=404, detail="Registro não encontrado.")
    return _json(registro)


@app.post("/api/{dominio}/{tabela}", tags=["CRUD"], status_code=201)
async def api_criar(dominio: str, tabela: str, request: Request):
    info = _info_ou_none(dominio, tabela)
    if not info:
        raise HTTPException(status_code=404, detail="Domínio/tabela não encontrado.")
    dados: Dict[str, Any] = await request.json()
    valores = [dados.get(c) or None for c in info["cols"]]
    funcao = getattr(info["mod"], f"criar_{info['entidade']}")
    novo_id = _chamar(funcao, *valores)
    return _json({"mensagem": "Registro criado com sucesso.", "id": novo_id}, status_code=201)


@app.put("/api/{dominio}/{tabela}/{id_valor}", tags=["CRUD"])
async def api_atualizar(dominio: str, tabela: str, id_valor: str, request: Request):
    info = _info_ou_none(dominio, tabela)
    if not info:
        raise HTTPException(status_code=404, detail="Domínio/tabela não encontrado.")
    dados: Dict[str, Any] = await request.json()
    campos = {c: dados.get(c) for c in info["cols"] if dados.get(c) not in (None, "")}
    if not campos:
        raise HTTPException(status_code=400, detail="Nenhum campo informado para atualizar.")
    funcao = getattr(info["mod"], f"atualizar_{info['entidade']}")
    linhas = _chamar(funcao, id_valor, **campos)
    return _json({"mensagem": "Registro atualizado com sucesso.", "linhas_afetadas": linhas})


@app.delete("/api/{dominio}/{tabela}/{id_valor}", tags=["CRUD"])
def api_deletar(dominio: str, tabela: str, id_valor: str):
    info = _info_ou_none(dominio, tabela)
    if not info:
        raise HTTPException(status_code=404, detail="Domínio/tabela não encontrado.")
    funcao = getattr(info["mod"], f"deletar_{info['entidade']}")
    linhas = _chamar(funcao, id_valor)
    return _json({"mensagem": "Registro excluído com sucesso.", "linhas_afetadas": linhas})


# ---------------------------------------------------------------------------
# Consulta SQL livre (somente SELECT) — igual ao op_sql_livre() do main.py
# e ao endpoint equivalente no Flask.
# ---------------------------------------------------------------------------
@app.post("/api/sql", tags=["Sistema"])
async def api_sql(request: Request):
    dados: Dict[str, Any] = await request.json()
    query = (dados.get("query") or "").strip()
    if not query.lower().startswith("select"):
        raise HTTPException(
            status_code=400,
            detail="Por segurança, esse modo aceita apenas comandos SELECT.",
        )
    registros = _chamar(execute_query, query, fetch="all")
    registros = registros or []
    return _json({"registros": registros, "total": len(registros)})


# ---------------------------------------------------------------------------
# Erros da API sempre no mesmo formato que o front-end já espera: {"erro": "..."}
# (o api_server.py em Flask devolve {"erro": ...}; por padrão, o FastAPI
# devolveria {"detail": ...} — este handler alinha os dois formatos).
# ---------------------------------------------------------------------------
from fastapi.exceptions import HTTPException as _HTTPExceptionType  # noqa: E402


@app.exception_handler(_HTTPExceptionType)
async def _tratar_http_exception(request: Request, exc: _HTTPExceptionType):
    return JSONResponse(status_code=exc.status_code, content={"erro": exc.detail})


if __name__ == "__main__":
    import uvicorn

    print("\n🧳 LuxeVoyage API rodando em http://localhost:8000  (Ctrl+C para parar)")
    print("Documentação interativa em http://localhost:8000/docs")
    print("Lembre-se de subir o front-end separadamente (cd FRONTEND && npm run dev)\n")
    uvicorn.run("api_fastapi:app", host="127.0.0.1", port=8000, reload=False)
