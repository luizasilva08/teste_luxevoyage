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
import uuid
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
from clientes import cliente as cliente_mod          # noqa: E402
from clientes import interesse_cliente               # noqa: E402
from crm import oportunidade_crm, historico_interacao  # noqa: E402
from operacional import pagamento_contrato          # noqa: E402
from parceiros import avaliacao_parceiro             # noqa: E402
from criptografia import descriptografar             # noqa: E402
from auth import (                       # noqa: E402
    checar_senha,
    hash_senha,
    criar_token,
    criar_token_cliente,
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


def _cliente_publico(cliente: dict) -> dict:
    """Remove hash/salt de senha antes de devolver um cliente pro front-end."""
    return {k: v for k, v in cliente.items() if k not in ("senha_hash", "salt")}


def obter_cliente_atual(authorization: Optional[str] = Header(None)) -> dict:
    """
    Dependência do FastAPI equivalente a obter_usuario_atual(), mas para a
    área "Minha conta" do CLIENTE — exige um token com "tipo": "cliente" no
    payload, então um token de Usuario_Interno (equipe) não abre essas
    rotas, e vice-versa.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Token não informado.")

    token = authorization.split(" ", 1)[1].strip()
    payload = decodificar_token(token)
    if payload is None or payload.get("tipo") != "cliente":
        raise HTTPException(status_code=401, detail="Token inválido ou expirado.")

    cliente_atual = cliente_mod.buscar_cliente_por_id(int(payload["sub"]))
    if cliente_atual is None:
        raise HTTPException(status_code=401, detail="Cliente não encontrado.")

    return cliente_atual


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
# Autenticação — login/cadastro do CLIENTE (área "Minha conta" do site
# público). Independente da autenticação da equipe acima: token diferente
# ("tipo": "cliente"), tabela diferente (Cliente, não Usuario_Interno).
# ---------------------------------------------------------------------------
@app.post("/api/auth/cliente/registrar", tags=["Autenticação"], status_code=201)
async def api_cliente_registrar(request: Request):
    """
    Cria a senha de acesso de um cliente. Cobre os dois casos:
      - a pessoa já existe como Cliente (pediu uma cotação pelo site antes,
        sem senha) -> só define a senha nessa conta já existente;
      - e-mail novo -> cria o Cliente na hora.
    """
    dados: Dict[str, Any] = await request.json()
    nome = (dados.get("nome") or "").strip()
    email = (dados.get("email") or "").strip()
    senha = dados.get("senha") or ""
    telefone = (dados.get("telefone") or "").strip() or None
    cep = (dados.get("cep") or "").strip() or None

    if not email or not senha:
        raise HTTPException(status_code=400, detail="Informe ao menos e-mail e senha.")
    if len(senha) < 6:
        raise HTTPException(status_code=400, detail="Use uma senha com pelo menos 6 caracteres.")

    cliente_existente = _chamar(cliente_mod.buscar_cliente_por_email, email)
    if cliente_existente:
        if cliente_existente.get("senha_hash"):
            raise HTTPException(status_code=409, detail="Já existe uma conta com esse e-mail.")
        id_cliente = cliente_existente["id_cliente"]
    else:
        if not nome:
            raise HTTPException(status_code=400, detail="Informe seu nome.")
        cpf_pendente = f"PENDENTE-{uuid.uuid4().hex[:12].upper()}"
        id_cliente = _chamar(cliente_mod.criar_cliente, nome, cpf_pendente, email, telefone, cep, None)

    _chamar(cliente_mod.definir_senha, id_cliente, hash_senha(senha))
    cliente_final = _chamar(cliente_mod.buscar_cliente_por_id, id_cliente)

    token = criar_token_cliente(id_cliente, email)
    return _json({"token": token, "cliente": _cliente_publico(cliente_final)}, status_code=201)


@app.post("/api/auth/cliente/login", tags=["Autenticação"])
async def api_cliente_login(request: Request):
    dados: Dict[str, Any] = await request.json()
    email = (dados.get("email") or "").strip()
    senha = dados.get("senha") or ""

    if not email or not senha:
        raise HTTPException(status_code=400, detail="Informe e-mail e senha.")

    cliente_encontrado = _chamar(cliente_mod.buscar_cliente_por_email, email)
    if cliente_encontrado is None or not checar_senha(senha, cliente_encontrado.get("senha_hash")):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos.")

    token = criar_token_cliente(cliente_encontrado["id_cliente"], email)
    return _json({"token": token, "cliente": _cliente_publico(cliente_encontrado)})


@app.get("/api/auth/cliente/me", tags=["Autenticação"])
def api_cliente_me(cliente_atual: dict = Depends(obter_cliente_atual)):
    return _json(_cliente_publico(cliente_atual))


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
def api_registro(usuario_atual: dict = Depends(obter_usuario_atual)):
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
# Dashboard (home) — o conteúdo muda conforme o cargo de quem está logado:
# Admin/Gerente enxergam o funil comercial (é quem cobra resultado de
# vendas); Operações não tem nada a ver com o funil, mas precisa saber o
# estado do catálogo (quantos pacotes em cada status) pra planejar — por
# isso os dois recebem métricas diferentes, não a mesma tela com um botão
# a menos.
# ---------------------------------------------------------------------------
@app.get("/api/dashboard", tags=["Sistema"])
def api_dashboard(usuario_atual: dict = Depends(obter_usuario_atual)):
    nivel = usuario_atual.get("nivel_acesso")
    if nivel not in ("Admin", "Gerente", "Operacoes"):
        raise HTTPException(
            status_code=403,
            detail="A visão geral do negócio é restrita a Admin, Gerente e Operações.",
        )

    def contar(tabela):
        try:
            r = execute_query(f"SELECT COUNT(*) AS total FROM {tabela}", fetch="one")
            return r["total"] if r else 0
        except Exception:
            return 0

    def agrupar(sql):
        try:
            return execute_query(sql, fetch="all") or []
        except Exception:
            return []

    resposta = {
        "escopo": "comercial" if nivel in ("Admin", "Gerente") else "operacional",
        "metricas": {
            "Clientes": contar("Cliente"),
            "Pacotes": contar("Pacote"),
            "Parceiros": contar("Parceiros"),
            "Viagens": contar("Viagem"),
        },
        "viagens_status": agrupar(
            "SELECT status_viagem AS rotulo, COUNT(*) AS total FROM Viagem GROUP BY status_viagem"
        ),
    }

    if nivel in ("Admin", "Gerente"):
        resposta["funil"] = agrupar(
            "SELECT estagio_funil AS rotulo, COUNT(*) AS total "
            "FROM Oportunidade_CRM GROUP BY estagio_funil"
        )
        resposta["propostas_status"] = agrupar(
            "SELECT status AS rotulo, COUNT(*) AS total "
            "FROM Propostas_Comerciais GROUP BY status"
        )
    else:  # Operacoes
        resposta["pacotes_status"] = agrupar(
            "SELECT status AS rotulo, COUNT(*) AS total FROM Pacote GROUP BY status"
        )

    return _json(resposta)


# ---------------------------------------------------------------------------
# Site público — catálogo de pacotes e captação de leads.
#
# Ficam fora do CRUD genérico de propósito: aqui a resposta já vem com os
# JOINs (destino, preço, parceiro) que a vitrine precisa, e a rota de
# cotação encadeia 3 tabelas (Cliente -> Interesses_Cliente ->
# Oportunidade_CRM) na ordem certa, sem expor esse encadeamento no front.
# ---------------------------------------------------------------------------
# Sem filtro de status aqui de propósito: o catálogo público mostra os 200
# pacotes cadastrados, qualquer que seja o status (Rascunho, Em Revisão,
# Ativo, Publicado, Inativo) — o card mostra o status como selo pra ficar
# transparente qual já está pronto pra reserva e qual ainda não.
# ---------------------------------------------------------------------------


@app.get("/api/publico/estados", tags=["Público"])
def api_publico_estados():
    """Contagem de pacotes por estado — alimenta o mapa de filtro em
    /pacotes (LEFT JOIN pra devolver os 27 estados, mesmo os que ainda
    não têm nenhum pacote)."""
    registros = _chamar(
        execute_query,
        """
        SELECT e.sigla AS estado_sigla, e.nome AS estado_nome, e.regiao_nome,
               COUNT(p.id_pacote) AS total_pacotes
        FROM Estado e
        LEFT JOIN Municipio m ON m.id_estado = e.id_estado
        LEFT JOIN Pacote p ON p.id_municipio_destino = m.id_municipio
        GROUP BY e.id_estado, e.sigla, e.nome, e.regiao_nome
        ORDER BY e.sigla
        """,
        fetch="all",
    ) or []
    return _json(registros)


@app.get("/api/publico/destinos", tags=["Público"])
def api_publico_destinos():
    registros = _chamar(
        execute_query,
        """
        SELECT m.id_municipio, m.nome AS destino, m.categoria,
               e.sigla AS estado_sigla, e.nome AS estado_nome, e.regiao_nome,
               COUNT(p.id_pacote) AS total_pacotes,
               MIN(ps.valor_sugerido) AS preco_a_partir
        FROM Pacote p
        JOIN Municipio m ON m.id_municipio = p.id_municipio_destino
        JOIN Estado e ON e.id_estado = m.id_estado
        LEFT JOIN Modulos_Pacote mp ON mp.id_pacote = p.id_pacote
        LEFT JOIN Preco_Sazonal ps ON ps.id_modulo = mp.id_modulo
        GROUP BY m.id_municipio, m.nome, m.categoria, e.sigla, e.nome, e.regiao_nome
        ORDER BY total_pacotes DESC
        LIMIT 24
        """,
        fetch="all",
    ) or []
    return _json(registros)


@app.get("/api/publico/pacotes", tags=["Público"])
def api_publico_pacotes(
    busca: Optional[str] = None,
    regiao: Optional[str] = None,
    estado: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(24, ge=1, le=250),
    offset: int = Query(0, ge=0),
):
    condicoes = ["1 = 1"]
    params: list = []

    if status:
        condicoes.append("p.status = %s")
        params.append(status)
    if busca:
        condicoes.append("(p.nome_pacote LIKE %s OR m.nome LIKE %s)")
        curinga = f"%{busca}%"
        params += [curinga, curinga]
    if regiao:
        condicoes.append("e.regiao_nome = %s")
        params.append(regiao)
    if estado:
        condicoes.append("e.sigla = %s")
        params.append(estado)

    where = " AND ".join(condicoes)
    registros = _chamar(
        execute_query,
        f"""
        SELECT p.id_pacote, p.nome_pacote, p.status,
               m.id_municipio, m.nome AS destino, m.categoria,
               e.sigla AS estado_sigla, e.nome AS estado_nome, e.regiao_nome,
               MIN(ps.valor_sugerido) AS preco_a_partir,
               MAX(d.classificacao) AS destaque
        FROM Pacote p
        JOIN Municipio m ON m.id_municipio = p.id_municipio_destino
        JOIN Estado e ON e.id_estado = m.id_estado
        LEFT JOIN Modulos_Pacote mp ON mp.id_pacote = p.id_pacote
        LEFT JOIN Preco_Sazonal ps ON ps.id_modulo = mp.id_modulo
        LEFT JOIN Destaques_Sazonais d ON d.id_municipio = m.id_municipio
        WHERE {where}
        GROUP BY p.id_pacote, p.nome_pacote, p.status, m.id_municipio, m.nome,
                 m.categoria, e.sigla, e.nome, e.regiao_nome
        ORDER BY p.id_pacote DESC
        LIMIT %s OFFSET %s
        """,
        params + [limit, offset],
        fetch="all",
    ) or []
    return _json({"registros": registros, "total": len(registros)})


@app.get("/api/publico/pacotes/{id_pacote}", tags=["Público"])
def api_publico_pacote_detalhe(id_pacote: int):
    pacote = _chamar(
        execute_query,
        """
        SELECT p.id_pacote, p.nome_pacote, p.status,
               m.id_municipio, m.nome AS destino, m.categoria,
               e.sigla AS estado_sigla, e.nome AS estado_nome, e.regiao_nome, e.timezone
        FROM Pacote p
        JOIN Municipio m ON m.id_municipio = p.id_municipio_destino
        JOIN Estado e ON e.id_estado = m.id_estado
        WHERE p.id_pacote = %s
        """,
        (id_pacote,),
        fetch="one",
    )
    if pacote is None:
        raise HTTPException(status_code=404, detail="Pacote não encontrado.")

    servicos = _chamar(
        execute_query,
        """
        SELECT mp.id_modulo, mp.obrigatorio,
               sp.nome_servico, sp.categoria_servico,
               pa.razao_social AS parceiro,
               MIN(ps.valor_sugerido) AS preco_a_partir
        FROM Modulos_Pacote mp
        JOIN Servicos_Parceiros sp ON sp.id_servico_parceiro = mp.id_servico_parceiro
        JOIN Parceiros pa ON pa.id_parceiro = sp.id_parceiro
        LEFT JOIN Preco_Sazonal ps ON ps.id_modulo = mp.id_modulo
        WHERE mp.id_pacote = %s
        GROUP BY mp.id_modulo, mp.obrigatorio, sp.nome_servico, sp.categoria_servico, pa.razao_social
        """,
        (id_pacote,),
        fetch="all",
    ) or []

    precos_sazonais = _chamar(
        execute_query,
        """
        SELECT t.nome AS temporada, t.data_inicio, t.data_fim, SUM(ps.valor_sugerido) AS valor_total
        FROM Preco_Sazonal ps
        JOIN Modulos_Pacote mp ON mp.id_modulo = ps.id_modulo
        JOIN Temporada t ON t.id_temporada = ps.id_temporada
        WHERE mp.id_pacote = %s
        GROUP BY t.id_temporada, t.nome, t.data_inicio, t.data_fim
        ORDER BY t.data_inicio
        """,
        (id_pacote,),
        fetch="all",
    ) or []

    pacote["servicos"] = servicos
    pacote["precos_sazonais"] = precos_sazonais
    return _json(pacote)


@app.post("/api/publico/cotacoes", tags=["Público"], status_code=201)
async def api_publico_solicitar_cotacao(request: Request):
    """Recebe um pedido de cotação da vitrine pública e monta o funil de
    vendas (Cliente -> Interesses_Cliente -> Oportunidade_CRM ->
    Historico_Interacoes) sem expor esses detalhes no front."""
    dados: Dict[str, Any] = await request.json()
    nome = (dados.get("nome") or "").strip()
    email = (dados.get("email") or "").strip()
    telefone = (dados.get("telefone") or "").strip() or None
    cpf = (dados.get("cpf") or "").strip() or None
    cep = (dados.get("cep") or "").strip() or None
    id_municipio_destino = dados.get("id_municipio_destino")
    id_pacote = dados.get("id_pacote")
    mensagem = (dados.get("mensagem") or "").strip() or None

    if not nome or not email:
        raise HTTPException(status_code=400, detail="Informe ao menos nome e e-mail.")

    if id_pacote and not id_municipio_destino:
        pacote = _chamar(execute_query,
                          "SELECT id_municipio_destino FROM Pacote WHERE id_pacote = %s",
                          (id_pacote,), fetch="one")
        if pacote:
            id_municipio_destino = pacote["id_municipio_destino"]

    if not id_municipio_destino:
        raise HTTPException(status_code=400, detail="Informe o destino de interesse.")

    cliente_existente = _chamar(cliente_mod.buscar_clientes_por_campo, "email_criptografado", email)
    if cliente_existente:
        id_cliente = cliente_existente[0]["id_cliente"]
    else:
        # A coluna é NOT NULL + UNIQUE no banco — se o visitante não
        # preencher o CPF no formulário, geramos um marcador único (em vez
        # de mandar None, que quebra com "cannot be null"), que a equipe
        # substitui pelo CPF real quando fechar a venda.
        cpf_final = cpf or f"PENDENTE-{uuid.uuid4().hex[:12].upper()}"
        id_cliente = _chamar(cliente_mod.criar_cliente, nome, cpf_final, email, telefone, cep, None)

    _chamar(interesse_cliente.criar_interesse, id_cliente, id_municipio_destino, "Novo")

    valor_estimado = None
    if id_pacote:
        preco = _chamar(execute_query, """
            SELECT MIN(ps.valor_sugerido) AS valor
            FROM Modulos_Pacote mp
            JOIN Preco_Sazonal ps ON ps.id_modulo = mp.id_modulo
            WHERE mp.id_pacote = %s
        """, (id_pacote,), fetch="one")
        valor_estimado = preco["valor"] if preco else None

    id_oportunidade = _chamar(
        oportunidade_crm.criar_oportunidade, id_cliente, None, "Novo Lead", valor_estimado,
    )

    tipo_interacao = "Solicitação de cotação via site"
    if mensagem:
        tipo_interacao += f": {mensagem[:180]}"
    _chamar(
        historico_interacao.criar_interacao,
        id_oportunidade, id_cliente, None, tipo_interacao, datetime.datetime.now(),
    )

    return _json({
        "mensagem": "Recebemos seu pedido! Um consultor da Luxe Voyage vai entrar em contato em breve.",
        "id_oportunidade": id_oportunidade,
    }, status_code=201)


# ---------------------------------------------------------------------------
# Painel interno — mesmos dados do CRM (Oportunidade_CRM, Cliente,
# Historico_Interacoes), mas já com os JOINs que a tela de atendimento
# precisa (nome do cliente, nome do consultor), em vez de forçar o front a
# combinar várias chamadas ao CRUD genérico.
# ---------------------------------------------------------------------------
@app.get("/api/painel/oportunidades", tags=["Painel"])
def api_painel_oportunidades(usuario_atual: dict = Depends(obter_usuario_atual)):
    registros = _chamar(execute_query, """
        SELECT o.id_oportunidade, o.estagio_funil, o.valor_estimado,
               o.id_cliente, c.nome AS cliente_nome, c.email_criptografado AS cliente_email,
               c.telefone_criptografado AS cliente_telefone,
               o.id_usuario_interno, u.nome AS consultor_nome
        FROM Oportunidade_CRM o
        JOIN Cliente c ON c.id_cliente = o.id_cliente
        LEFT JOIN Usuario_Interno u ON u.id_usuario_interno = o.id_usuario_interno
        ORDER BY o.id_oportunidade DESC
        LIMIT 300
    """, fetch="all") or []
    for r in registros:
        r["cliente_email"] = descriptografar(r["cliente_email"])
        r["cliente_telefone"] = descriptografar(r["cliente_telefone"])
    return _json(registros)


@app.get("/api/painel/oportunidades/{id_oportunidade}", tags=["Painel"])
def api_painel_oportunidade_detalhe(id_oportunidade: int, usuario_atual: dict = Depends(obter_usuario_atual)):
    oportunidade = _chamar(execute_query, """
        SELECT o.*, c.nome AS cliente_nome, c.email_criptografado AS cliente_email,
               c.telefone_criptografado AS cliente_telefone, c.cep AS cliente_cep,
               u.nome AS consultor_nome
        FROM Oportunidade_CRM o
        JOIN Cliente c ON c.id_cliente = o.id_cliente
        LEFT JOIN Usuario_Interno u ON u.id_usuario_interno = o.id_usuario_interno
        WHERE o.id_oportunidade = %s
    """, (id_oportunidade,), fetch="one")
    if oportunidade is None:
        raise HTTPException(status_code=404, detail="Oportunidade não encontrada.")
    oportunidade["cliente_email"] = descriptografar(oportunidade["cliente_email"])
    oportunidade["cliente_telefone"] = descriptografar(oportunidade["cliente_telefone"])

    interesses = _chamar(execute_query, """
        SELECT ic.id_interesse, ic.status, m.nome AS destino, e.sigla AS estado_sigla
        FROM Interesses_Cliente ic
        JOIN Municipio m ON m.id_municipio = ic.id_municipio_destino
        JOIN Estado e ON e.id_estado = m.id_estado
        WHERE ic.id_cliente = %s
        ORDER BY ic.id_interesse DESC
    """, (oportunidade["id_cliente"],), fetch="all") or []

    historico = _chamar(execute_query, """
        SELECT hi.id_interacao, hi.tipo_interacao, hi.data_interacao, u.nome AS consultor_nome
        FROM Historico_Interacoes hi
        LEFT JOIN Usuario_Interno u ON u.id_usuario_interno = hi.id_usuario_interno
        WHERE hi.id_oportunidade = %s
        ORDER BY hi.data_interacao DESC
    """, (id_oportunidade,), fetch="all") or []

    oportunidade["interesses"] = interesses
    oportunidade["historico"] = historico
    return _json(oportunidade)


@app.post("/api/painel/oportunidades/{id_oportunidade}/interacoes", tags=["Painel"], status_code=201)
async def api_painel_criar_interacao(
    id_oportunidade: int, request: Request, usuario_atual: dict = Depends(obter_usuario_atual),
):
    if usuario_atual.get("nivel_acesso") not in ("Admin", "Gerente", "Suporte", "Vendedor"):
        raise HTTPException(
            status_code=403,
            detail="Seu perfil só acompanha os atendimentos, sem registrar interações.",
        )
    oportunidade = _chamar(oportunidade_crm.buscar_oportunidade_por_id, id_oportunidade)
    if oportunidade is None:
        raise HTTPException(status_code=404, detail="Oportunidade não encontrada.")

    dados: Dict[str, Any] = await request.json()
    tipo = (dados.get("tipo_interacao") or "").strip()
    if not tipo:
        raise HTTPException(status_code=400, detail="Informe o tipo de interação.")

    novo_id = _chamar(
        historico_interacao.criar_interacao,
        id_oportunidade, oportunidade["id_cliente"], usuario_atual["id_usuario_interno"],
        tipo, datetime.datetime.now(),
    )
    return _json({"mensagem": "Interação registrada.", "id": novo_id}, status_code=201)


# ---------------------------------------------------------------------------
# Cliente (visão 360°) — cliente + destinos de interesse (com nome, não só
# id) + oportunidades já com o pacote vinculado (via Cotacao_Personalizadas,
# quando existir), pra tela de atendimento mostrar "o que esse cliente já
# comprou/negociou" sem o front precisar cruzar 3 chamadas na mão.
# ---------------------------------------------------------------------------
@app.get("/api/painel/clientes/{id_cliente}", tags=["Painel"])
def api_painel_cliente_detalhe(id_cliente: int, usuario_atual: dict = Depends(obter_usuario_atual)):
    cliente = _chamar(cliente_mod.buscar_cliente_por_id, id_cliente)
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")

    interesses = _chamar(execute_query, """
        SELECT ic.id_interesse, ic.status, m.nome AS destino, e.sigla AS estado_sigla
        FROM Interesses_Cliente ic
        JOIN Municipio m ON m.id_municipio = ic.id_municipio_destino
        JOIN Estado e ON e.id_estado = m.id_estado
        WHERE ic.id_cliente = %s
        ORDER BY ic.id_interesse DESC
    """, (id_cliente,), fetch="all") or []

    oportunidades = _chamar(execute_query, """
        SELECT o.id_oportunidade, o.estagio_funil, o.valor_estimado, o.id_usuario_interno,
               u.nome AS consultor_nome,
               p.nome_pacote, c.status AS status_cotacao
        FROM Oportunidade_CRM o
        LEFT JOIN Usuario_Interno u ON u.id_usuario_interno = o.id_usuario_interno
        LEFT JOIN Cotacao_Personalizadas c ON c.id_oportunidade = o.id_oportunidade
        LEFT JOIN Pacote p ON p.id_pacote = c.id_pacote
        WHERE o.id_cliente = %s
        ORDER BY o.id_oportunidade DESC
    """, (id_cliente,), fetch="all") or []

    cliente["interesses"] = interesses
    cliente["oportunidades"] = oportunidades
    return _json(cliente)


# ---------------------------------------------------------------------------
# Propostas comerciais (visão Kanban) — Propostas_Comerciais + a cadeia
# Cotacao_Personalizadas -> Oportunidade_CRM -> Cliente/Pacote, já achatada
# pra alimentar o quadro por status sem o front montar os JOINs.
# ---------------------------------------------------------------------------
@app.get("/api/painel/propostas", tags=["Painel"])
def api_painel_propostas(usuario_atual: dict = Depends(obter_usuario_atual)):
    registros = _chamar(execute_query, """
        SELECT pr.id_proposta, pr.versao, pr.status,
               co.id_cotacao, co.valor_total_calculado,
               pa.nome_pacote,
               cl.id_cliente, cl.nome AS cliente_nome
        FROM Propostas_Comerciais pr
        JOIN Cotacao_Personalizadas co ON co.id_cotacao = pr.id_cotacao
        JOIN Oportunidade_CRM op ON op.id_oportunidade = co.id_oportunidade
        JOIN Cliente cl ON cl.id_cliente = op.id_cliente
        LEFT JOIN Pacote pa ON pa.id_pacote = co.id_pacote
        ORDER BY pr.id_proposta DESC
        LIMIT 400
    """, fetch="all") or []
    return _json(registros)


# ---------------------------------------------------------------------------
# Viagens (visão pós-venda) — Viagem + Contrato_Digital + a cadeia até
# Cliente/Pacote, com o resumo de parcelas pagas. É a tela que faltava pra
# Operações (o cargo mais numeroso do time) ter algo de fato pra fazer no
# painel, em vez de só olhar o catálogo.
# ---------------------------------------------------------------------------
@app.get("/api/painel/viagens", tags=["Painel"])
def api_painel_viagens(usuario_atual: dict = Depends(obter_usuario_atual)):
    registros = _chamar(execute_query, """
        SELECT v.id_viagem, v.id_contrato, v.status_viagem, v.data_embarque, v.data_retorno,
               cl.id_cliente, cl.nome AS cliente_nome, pa.nome_pacote,
               cd.status AS status_contrato,
               (SELECT COUNT(*) FROM Pagamento_Contrato pg
                 WHERE pg.id_contrato = v.id_contrato AND pg.status_transacao = 'Confirmado') AS parcelas_pagas,
               (SELECT COUNT(*) FROM Pagamento_Contrato pg
                 WHERE pg.id_contrato = v.id_contrato) AS parcelas_total,
               (SELECT SUM(pg.valor_total) FROM Pagamento_Contrato pg
                 WHERE pg.id_contrato = v.id_contrato) AS valor_total
        FROM Viagem v
        JOIN Contrato_Digital cd ON cd.id_contrato = v.id_contrato
        JOIN Propostas_Comerciais pr ON pr.id_proposta = cd.id_proposta
        JOIN Cotacao_Personalizadas co ON co.id_cotacao = pr.id_cotacao
        JOIN Oportunidade_CRM op ON op.id_oportunidade = co.id_oportunidade
        JOIN Cliente cl ON cl.id_cliente = op.id_cliente
        LEFT JOIN Pacote pa ON pa.id_pacote = co.id_pacote
        ORDER BY v.data_embarque DESC
        LIMIT 400
    """, fetch="all") or []
    return _json(registros)


# ---------------------------------------------------------------------------
# "Minha conta" — área do CLIENTE (protegida por obter_cliente_atual, não
# obter_usuario_atual). O cliente só enxerga o que é dele: toda query aqui
# filtra por id_cliente vindo do token, nunca de um parâmetro da URL — não
# tem como um cliente pedir os dados de outro trocando um id na rota.
# ---------------------------------------------------------------------------
@app.get("/api/conta/resumo", tags=["Conta"])
def api_conta_resumo(cliente_atual: dict = Depends(obter_cliente_atual)):
    id_cliente = cliente_atual["id_cliente"]

    oportunidades = _chamar(execute_query, """
        SELECT o.id_oportunidade, o.estagio_funil, o.valor_estimado,
               u.nome AS consultor_nome, p.nome_pacote, c.status AS status_cotacao
        FROM Oportunidade_CRM o
        LEFT JOIN Usuario_Interno u ON u.id_usuario_interno = o.id_usuario_interno
        LEFT JOIN Cotacao_Personalizadas c ON c.id_oportunidade = o.id_oportunidade
        LEFT JOIN Pacote p ON p.id_pacote = c.id_pacote
        WHERE o.id_cliente = %s
        ORDER BY o.id_oportunidade DESC
    """, (id_cliente,), fetch="all") or []

    viagens = _chamar(execute_query, """
        SELECT v.id_viagem, v.status_viagem, v.data_embarque, v.data_retorno, v.id_contrato,
               co.id_cotacao, pa.nome_pacote, cd.status AS status_contrato,
               (SELECT COUNT(*) FROM Pagamento_Contrato pg
                 WHERE pg.id_contrato = v.id_contrato AND pg.status_transacao = 'Confirmado') AS parcelas_pagas,
               (SELECT COUNT(*) FROM Pagamento_Contrato pg
                 WHERE pg.id_contrato = v.id_contrato) AS parcelas_total
        FROM Viagem v
        JOIN Contrato_Digital cd ON cd.id_contrato = v.id_contrato
        JOIN Propostas_Comerciais pr ON pr.id_proposta = cd.id_proposta
        JOIN Cotacao_Personalizadas co ON co.id_cotacao = pr.id_cotacao
        JOIN Oportunidade_CRM op ON op.id_oportunidade = co.id_oportunidade
        LEFT JOIN Pacote pa ON pa.id_pacote = co.id_pacote
        WHERE op.id_cliente = %s
        ORDER BY v.data_embarque DESC
    """, (id_cliente,), fetch="all") or []

    # Parceiros (hotel, transporte, passeio...) de cada cotação — via
    # Item_Cotacao -> Modulos_Pacote -> Servicos_Parceiros -> Parceiros —
    # é o que o cliente pode avaliar (reaproveitando Avaliacoes_Parceiros,
    # a mesma tabela que a equipe já usa pra avaliar fornecedor).
    for v in viagens:
        v["parceiros"] = _chamar(execute_query, """
            SELECT DISTINCT pa.id_parceiro, pa.razao_social, sp.nome_servico, sp.categoria_servico
            FROM Item_Cotacao ic
            JOIN Modulos_Pacote mp ON mp.id_modulo = ic.id_modulo
            JOIN Servicos_Parceiros sp ON sp.id_servico_parceiro = mp.id_servico_parceiro
            JOIN Parceiros pa ON pa.id_parceiro = sp.id_parceiro
            WHERE ic.id_cotacao = %s
        """, (v["id_cotacao"],), fetch="all") or []

    pagamentos = _chamar(execute_query, """
        SELECT pg.id_pagamento, pg.id_contrato, pg.metodo_pagamento, pg.valor_total,
               pg.numero_parcela, pg.total_parcelas, pg.status_transacao, pa.nome_pacote
        FROM Pagamento_Contrato pg
        JOIN Contrato_Digital cd ON cd.id_contrato = pg.id_contrato
        JOIN Propostas_Comerciais pr ON pr.id_proposta = cd.id_proposta
        JOIN Cotacao_Personalizadas co ON co.id_cotacao = pr.id_cotacao
        JOIN Oportunidade_CRM op ON op.id_oportunidade = co.id_oportunidade
        LEFT JOIN Pacote pa ON pa.id_pacote = co.id_pacote
        WHERE op.id_cliente = %s
        ORDER BY pg.id_contrato, pg.numero_parcela
    """, (id_cliente,), fetch="all") or []

    mensagens = _chamar(execute_query, """
        SELECT hi.id_interacao, hi.id_oportunidade, hi.tipo_interacao, hi.data_interacao,
               u.nome AS consultor_nome
        FROM Historico_Interacoes hi
        LEFT JOIN Usuario_Interno u ON u.id_usuario_interno = hi.id_usuario_interno
        WHERE hi.id_cliente = %s
        ORDER BY hi.data_interacao ASC
    """, (id_cliente,), fetch="all") or []

    return _json({
        "cliente": _cliente_publico(cliente_atual),
        "oportunidades": oportunidades,
        "viagens": viagens,
        "pagamentos": pagamentos,
        "mensagens": mensagens,
    })


@app.post("/api/conta/oportunidades/{id_oportunidade}/mensagens", tags=["Conta"], status_code=201)
async def api_conta_enviar_mensagem(
    id_oportunidade: int, request: Request, cliente_atual: dict = Depends(obter_cliente_atual),
):
    """Cliente manda uma mensagem pro consultor — some Historico_Interacoes
    com id_usuario_interno nulo, prefixada, pra virar uma conversa de mão
    dupla (a equipe já vê/responde isso na tela de atendimento do painel)."""
    oportunidade = _chamar(oportunidade_crm.buscar_oportunidade_por_id, id_oportunidade)
    if oportunidade is None or oportunidade["id_cliente"] != cliente_atual["id_cliente"]:
        raise HTTPException(status_code=404, detail="Oportunidade não encontrada.")

    dados: Dict[str, Any] = await request.json()
    mensagem = (dados.get("mensagem") or "").strip()
    if not mensagem:
        raise HTTPException(status_code=400, detail="Escreva uma mensagem.")

    novo_id = _chamar(
        historico_interacao.criar_interacao,
        id_oportunidade, cliente_atual["id_cliente"], None,
        f"Cliente: {mensagem[:500]}", datetime.datetime.now(),
    )
    return _json({"mensagem": "Enviada.", "id": novo_id}, status_code=201)


@app.post("/api/conta/parceiros/{id_parceiro}/avaliacao", tags=["Conta"], status_code=201)
async def api_conta_avaliar_parceiro(
    id_parceiro: int, request: Request, cliente_atual: dict = Depends(obter_cliente_atual),
):
    """
    Cliente avalia um parceiro (hotel, transporte, passeio...) que fez
    parte de alguma cotação dele — reaproveita Avaliacoes_Parceiros (a
    mesma tabela que a equipe usa pra avaliar fornecedor internamente),
    só que aqui id_usuario_interno fica nulo: é a avaliação de quem
    viajou, não de quem negociou com o parceiro.
    """
    vinculo = _chamar(execute_query, """
        SELECT 1
        FROM Item_Cotacao ic
        JOIN Modulos_Pacote mp ON mp.id_modulo = ic.id_modulo
        JOIN Servicos_Parceiros sp ON sp.id_servico_parceiro = mp.id_servico_parceiro
        JOIN Cotacao_Personalizadas co ON co.id_cotacao = ic.id_cotacao
        JOIN Oportunidade_CRM op ON op.id_oportunidade = co.id_oportunidade
        WHERE sp.id_parceiro = %s AND op.id_cliente = %s
        LIMIT 1
    """, (id_parceiro, cliente_atual["id_cliente"]), fetch="one")
    if vinculo is None:
        raise HTTPException(
            status_code=404,
            detail="Esse parceiro não faz parte de nenhuma das suas cotações.",
        )

    dados: Dict[str, Any] = await request.json()
    try:
        nota = int(dados.get("nota"))
    except (TypeError, ValueError):
        nota = 0
    if nota < 1 or nota > 5:
        raise HTTPException(status_code=400, detail="A nota precisa ser de 1 a 5.")
    comentario = (dados.get("comentario") or "").strip() or None

    novo_id = _chamar(avaliacao_parceiro.criar_avaliacao, id_parceiro, None, nota, comentario)
    return _json({"mensagem": "Avaliação registrada. Obrigado!", "id": novo_id}, status_code=201)


@app.post("/api/conta/pagamentos/{id_pagamento}/pagar", tags=["Conta"])
def api_conta_pagar(id_pagamento: int, cliente_atual: dict = Depends(obter_cliente_atual)):
    """
    Ação DEMONSTRATIVA: não existe integração real com nenhum meio de
    pagamento neste projeto. Isso só confirma a parcela como paga no
    banco, pra fechar o fluxo de ponta a ponta (pedido -> cotação ->
    contrato -> pagamento -> viagem) sem depender de um gateway de verdade.
    """
    dono = _chamar(execute_query, """
        SELECT op.id_cliente, pg.status_transacao
        FROM Pagamento_Contrato pg
        JOIN Contrato_Digital cd ON cd.id_contrato = pg.id_contrato
        JOIN Propostas_Comerciais pr ON pr.id_proposta = cd.id_proposta
        JOIN Cotacao_Personalizadas co ON co.id_cotacao = pr.id_cotacao
        JOIN Oportunidade_CRM op ON op.id_oportunidade = co.id_oportunidade
        WHERE pg.id_pagamento = %s
    """, (id_pagamento,), fetch="one")
    if dono is None or dono["id_cliente"] != cliente_atual["id_cliente"]:
        raise HTTPException(status_code=404, detail="Pagamento não encontrado.")
    if dono["status_transacao"] == "Confirmado":
        raise HTTPException(status_code=400, detail="Essa parcela já está paga.")

    _chamar(pagamento_contrato.atualizar_pagamento, id_pagamento, status_transacao="Confirmado")
    return _json({"mensagem": "Pagamento confirmado (simulação)."})


# ---------------------------------------------------------------------------
# Permissões por nível de acesso (Usuario_Interno.nivel_acesso).
#
# O CRUD genérico abaixo atende as 25 tabelas do REGISTRO, mas nem todo
# cargo pode fazer qualquer coisa em qualquer tabela — um Vendedor edita
# leads/clientes, mas não deveria conseguir apagar um Pacote; alguém de
# Operações monta o catálogo, mas não deveria mexer no funil de vendas.
#
# PERMISSOES_TABELA guarda, por (domínio, tabela), quem pode ler/escrever/
# excluir. O que não está listado cai em _PERMISSAO_PADRAO (mais
# conservadora: leitura liberada pra qualquer usuário logado, escrita só
# pra Admin/Gerente, exclusão só pra Admin) — assim, tabelas ainda não
# usadas pelo front-end também ficam protegidas por padrão.
# ---------------------------------------------------------------------------
NIVEIS_ACESSO = ("Admin", "Gerente", "Operacoes", "Suporte", "Vendedor")
_TODOS_NIVEIS = set(NIVEIS_ACESSO)

_PERMISSAO_PADRAO = {"leitura": _TODOS_NIVEIS, "escrita": {"Admin", "Gerente"}, "exclusao": {"Admin"}}

PERMISSOES_TABELA = {
    # Funil de vendas: quem atende (Vendedor/Suporte) e quem supervisiona
    # (Gerente/Admin) move o lead; Operações só acompanha.
    ("CRM", "Oportunidade_CRM"): {
        "leitura": _TODOS_NIVEIS,
        "escrita": {"Admin", "Gerente", "Suporte", "Vendedor"},
        "exclusao": {"Admin"},
    },
    ("CRM", "Historico_Interacoes"): {
        "leitura": _TODOS_NIVEIS,
        "escrita": {"Admin", "Gerente", "Suporte", "Vendedor"},
        "exclusao": {"Admin"},
    },
    # Dados de cliente: qualquer time interno consulta; só liderança edita.
    ("Clientes", "Cliente"): {
        "leitura": _TODOS_NIVEIS,
        "escrita": {"Admin", "Gerente"},
        "exclusao": {"Admin"},
    },
    ("Clientes", "Interesses_Cliente"): {
        "leitura": _TODOS_NIVEIS,
        "escrita": {"Admin", "Gerente", "Suporte", "Vendedor"},
        "exclusao": {"Admin"},
    },
    # Catálogo: Operações monta os pacotes; Vendedor/Suporte só consultam
    # o que já está publicado pra oferecer ao cliente.
    ("Catalogo", "Pacote"): {
        "leitura": _TODOS_NIVEIS,
        "escrita": {"Admin", "Gerente", "Operacoes"},
        "exclusao": {"Admin"},
    },
    # Geografia é referência básica (selects de formulário): todo mundo lê,
    # só quem monta catálogo cadastra município novo.
    ("Geografia", "Estado"): {"leitura": _TODOS_NIVEIS, "escrita": {"Admin"}, "exclusao": {"Admin"}},
    ("Geografia", "Municipio"): {
        "leitura": _TODOS_NIVEIS,
        "escrita": {"Admin", "Gerente", "Operacoes"},
        "exclusao": {"Admin"},
    },
    # Negociação (cotação -> proposta): Vendedor monta, Gerente/Admin
    # supervisionam; Operações e Suporte só acompanham (leitura).
    ("Comercial", "Cotacao_Personalizadas"): {
        "leitura": _TODOS_NIVEIS,
        "escrita": {"Admin", "Gerente", "Vendedor"},
        "exclusao": {"Admin"},
    },
    ("Comercial", "Propostas_Comerciais"): {
        "leitura": _TODOS_NIVEIS,
        "escrita": {"Admin", "Gerente", "Vendedor"},
        "exclusao": {"Admin"},
    },
    ("Comercial", "Item_Cotacao"): {
        "leitura": _TODOS_NIVEIS,
        "escrita": {"Admin", "Gerente", "Vendedor"},
        "exclusao": {"Admin"},
    },
    # Contrato assinado é registro legal (tem hash de integridade e
    # timestamp de aceite) — ninguém edita ou apaga pelo CRUD, nem Admin.
    # É gerado quando a proposta é aceita, não digitado à mão.
    ("Comercial", "Contrato_Digital"): {
        "leitura": _TODOS_NIVEIS,
        "escrita": set(),
        "exclusao": set(),
    },
    # Pós-venda: quem cuida da viagem/cobrança em si é Operações; todo
    # mundo acompanha (Suporte pra atender o cliente, Vendedor porque já
    # vendeu e quer saber como foi).
    ("Operacional", "Viagem"): {
        "leitura": _TODOS_NIVEIS,
        "escrita": {"Admin", "Gerente", "Operacoes"},
        "exclusao": {"Admin"},
    },
    ("Operacional", "Pagamento_Contrato"): {
        "leitura": _TODOS_NIVEIS,
        "escrita": {"Admin", "Gerente", "Operacoes"},
        "exclusao": {"Admin"},
    },
    # Usuario_Interno é a própria equipe — gestão de pessoal é assunto de
    # Admin (e leitura de Gerente, pra saber quem é seu time).
    ("CRM", "Usuario_Interno"): {
        "leitura": {"Admin", "Gerente"},
        "escrita": {"Admin"},
        "exclusao": {"Admin"},
    },
    ("CRM", "Solicitacao_SLA"): {
        "leitura": _TODOS_NIVEIS,
        "escrita": {"Admin", "Gerente", "Operacoes"},
        "exclusao": {"Admin"},
    },
    # LGPD: quem atende o cliente (Suporte) registra o consentimento.
    ("Clientes", "Consentimentos_LGPD"): {
        "leitura": _TODOS_NIVEIS,
        "escrita": {"Admin", "Gerente", "Suporte"},
        "exclusao": {"Admin"},
    },
    # Parceiros/fornecedores: Operações negocia e cadastra no dia a dia.
    ("Parceiros", "Parceiros"): {
        "leitura": _TODOS_NIVEIS,
        "escrita": {"Admin", "Gerente", "Operacoes"},
        "exclusao": {"Admin"},
    },
    ("Parceiros", "Cobertura_Parceiros"): {
        "leitura": _TODOS_NIVEIS,
        "escrita": {"Admin", "Gerente", "Operacoes"},
        "exclusao": {"Admin"},
    },
    ("Parceiros", "Servicos_Parceiros"): {
        "leitura": _TODOS_NIVEIS,
        "escrita": {"Admin", "Gerente", "Operacoes"},
        "exclusao": {"Admin"},
    },
    ("Parceiros", "Avaliacoes_Parceiros"): {
        "leitura": _TODOS_NIVEIS,
        "escrita": {"Admin", "Gerente", "Operacoes"},
        "exclusao": {"Admin"},
    },
    # Resto do catálogo (temporada/preço/destaques): mesma regra do Pacote.
    ("Catalogo", "Temporada"): {
        "leitura": _TODOS_NIVEIS,
        "escrita": {"Admin", "Gerente", "Operacoes"},
        "exclusao": {"Admin"},
    },
    ("Catalogo", "Modulos_Pacote"): {
        "leitura": _TODOS_NIVEIS,
        "escrita": {"Admin", "Gerente", "Operacoes"},
        "exclusao": {"Admin"},
    },
    ("Catalogo", "Preco_Sazonal"): {
        "leitura": _TODOS_NIVEIS,
        "escrita": {"Admin", "Gerente", "Operacoes"},
        "exclusao": {"Admin"},
    },
    ("Catalogo", "Destaques_Sazonais"): {
        "leitura": _TODOS_NIVEIS,
        "escrita": {"Admin", "Gerente", "Operacoes"},
        "exclusao": {"Admin"},
    },
    # Log de auditoria: só existe pra ser lido (Admin/Gerente investigando
    # algo) — é o sistema quem grava, nunca uma pessoa digitando, então
    # ninguém tem escrita/exclusão aqui, nem Admin.
    ("Auditoria", "Log_Acesso"): {
        "leitura": {"Admin", "Gerente"},
        "escrita": set(),
        "exclusao": set(),
    },
}


def _exigir_permissao(usuario: dict, dominio: str, tabela: str, acao: str):
    regra = PERMISSOES_TABELA.get((dominio, tabela), _PERMISSAO_PADRAO)
    permitidos = regra[acao]
    if usuario.get("nivel_acesso") not in permitidos:
        raise HTTPException(
            status_code=403,
            detail="Seu perfil de acesso não permite essa ação nesta tabela.",
        )


# ---------------------------------------------------------------------------
# CRUD genérico — funciona para QUALQUER tabela cadastrada em REGISTRO,
# chamando as mesmas funções (criar_/listar_/buscar_/atualizar_/deletar_)
# que já existem em TEST/<dominio>/<tabela>.py. Toda rota exige login e
# passa pela checagem de permissão acima antes de tocar no banco.
# ---------------------------------------------------------------------------
@app.get("/api/{dominio}/{tabela}", tags=["CRUD"])
def api_listar(dominio: str, tabela: str, campo: Optional[str] = None,
                valor: Optional[str] = None, limit: int = Query(20, ge=1, le=1000),
                offset: int = Query(0, ge=0),
                usuario_atual: dict = Depends(obter_usuario_atual)):
    info = _info_ou_none(dominio, tabela)
    if not info:
        raise HTTPException(status_code=404, detail="Domínio/tabela não encontrado.")
    _exigir_permissao(usuario_atual, dominio, tabela, "leitura")

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
def api_buscar_por_id(dominio: str, tabela: str, id_valor: str,
                        usuario_atual: dict = Depends(obter_usuario_atual)):
    info = _info_ou_none(dominio, tabela)
    if not info:
        raise HTTPException(status_code=404, detail="Domínio/tabela não encontrado.")
    _exigir_permissao(usuario_atual, dominio, tabela, "leitura")
    funcao = getattr(info["mod"], f"buscar_{info['entidade']}_por_id")
    registro = _chamar(funcao, id_valor)
    if registro is None:
        raise HTTPException(status_code=404, detail="Registro não encontrado.")
    return _json(registro)


@app.post("/api/{dominio}/{tabela}", tags=["CRUD"], status_code=201)
async def api_criar(dominio: str, tabela: str, request: Request,
                      usuario_atual: dict = Depends(obter_usuario_atual)):
    info = _info_ou_none(dominio, tabela)
    if not info:
        raise HTTPException(status_code=404, detail="Domínio/tabela não encontrado.")
    _exigir_permissao(usuario_atual, dominio, tabela, "escrita")
    dados: Dict[str, Any] = await request.json()
    valores = [dados.get(c) or None for c in info["cols"]]
    funcao = getattr(info["mod"], f"criar_{info['entidade']}")
    novo_id = _chamar(funcao, *valores)
    return _json({"mensagem": "Registro criado com sucesso.", "id": novo_id}, status_code=201)


@app.put("/api/{dominio}/{tabela}/{id_valor}", tags=["CRUD"])
async def api_atualizar(dominio: str, tabela: str, id_valor: str, request: Request,
                          usuario_atual: dict = Depends(obter_usuario_atual)):
    info = _info_ou_none(dominio, tabela)
    if not info:
        raise HTTPException(status_code=404, detail="Domínio/tabela não encontrado.")
    _exigir_permissao(usuario_atual, dominio, tabela, "escrita")
    dados: Dict[str, Any] = await request.json()
    campos = {c: dados.get(c) for c in info["cols"] if dados.get(c) not in (None, "")}
    if not campos:
        raise HTTPException(status_code=400, detail="Nenhum campo informado para atualizar.")
    funcao = getattr(info["mod"], f"atualizar_{info['entidade']}")
    linhas = _chamar(funcao, id_valor, **campos)
    return _json({"mensagem": "Registro atualizado com sucesso.", "linhas_afetadas": linhas})


@app.delete("/api/{dominio}/{tabela}/{id_valor}", tags=["CRUD"])
def api_deletar(dominio: str, tabela: str, id_valor: str,
                  usuario_atual: dict = Depends(obter_usuario_atual)):
    info = _info_ou_none(dominio, tabela)
    if not info:
        raise HTTPException(status_code=404, detail="Domínio/tabela não encontrado.")
    _exigir_permissao(usuario_atual, dominio, tabela, "exclusao")
    funcao = getattr(info["mod"], f"deletar_{info['entidade']}")
    linhas = _chamar(funcao, id_valor)
    return _json({"mensagem": "Registro excluído com sucesso.", "linhas_afetadas": linhas})


# ---------------------------------------------------------------------------
# Consulta SQL livre (somente SELECT) — igual ao op_sql_livre() do main.py
# e ao endpoint equivalente no Flask.
# ---------------------------------------------------------------------------
@app.post("/api/sql", tags=["Sistema"])
async def api_sql(request: Request, usuario_atual: dict = Depends(obter_usuario_atual)):
    if usuario_atual.get("nivel_acesso") != "Admin":
        raise HTTPException(status_code=403, detail="Consulta SQL livre é restrita ao Admin.")
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
