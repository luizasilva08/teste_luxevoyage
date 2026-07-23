"""
Módulo CRUD para a tabela Cliente.
Gerado para o banco de dados LuxeVoyage.

cpf_criptografado, email_criptografado e telefone_criptografado são
criptografados de verdade aqui dentro (AES-256-SIV, veja criptografia.py)
— quem chama essas funções passa/recebe sempre texto puro; a
criptografia é um detalhe de armazenamento que não vaza pro resto do
projeto (CRUD genérico da API, telas do painel/conta, etc. continuam
funcionando sem saber que isso existe).
"""
from utils import execute_query, build_update_clause
from criptografia import criptografar, descriptografar

TABLE = "Cliente"
PK = "id_cliente"

_CAMPOS_CRIPTOGRAFADOS = ("cpf_criptografado", "email_criptografado", "telefone_criptografado")


def _descriptografar_linha(linha):
    if linha is None:
        return None
    for campo in _CAMPOS_CRIPTOGRAFADOS:
        if campo in linha:
            linha[campo] = descriptografar(linha[campo])
    return linha


def criar_cliente(nome, cpf_criptografado, email_criptografado, telefone_criptografado, cep, id_municipio_origem):
    """Insere um novo registro em Cliente e retorna o id gerado (lastrowid)."""
    query = """
        INSERT INTO Cliente (nome, cpf_criptografado, email_criptografado, telefone_criptografado, cep, id_municipio_origem)
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    params = (
        nome,
        criptografar(cpf_criptografado),
        criptografar(email_criptografado),
        criptografar(telefone_criptografado),
        cep,
        id_municipio_origem,
    )
    return execute_query(query, params, commit=True)


def buscar_cliente_por_id(id_cliente):
    """Retorna um único registro de Cliente pelo id, ou None se não existir."""
    query = f"SELECT * FROM {TABLE} WHERE {PK} = %s"
    return _descriptografar_linha(execute_query(query, (id_cliente,), fetch="one"))


def listar_clientes(limit=100, offset=0):
    """Lista registros de Cliente com paginação simples."""
    query = f"SELECT * FROM {TABLE} ORDER BY {PK} LIMIT %s OFFSET %s"
    linhas = execute_query(query, (limit, offset), fetch="all") or []
    return [_descriptografar_linha(l) for l in linhas]


def buscar_clientes_por_campo(campo, valor, limit=100):
    """
    Busca registros de Cliente filtrando por um único campo/coluna.
    Ex: buscar_clientes_por_campo("nome", "Ana") já acha "Ana Souza".

    Campo criptografado (cpf/email/telefone) é exceção: continua sendo
    igualdade exata, criptografando o valor de busca antes do WHERE — com
    AES-SIV isso funciona (é determinístico), mas "LIKE" num ciphertext
    nunca bateria com nada, então nem tenta.
    """
    if campo in _CAMPOS_CRIPTOGRAFADOS:
        query = f"SELECT * FROM {TABLE} WHERE {campo} = %s LIMIT %s"
        params = (criptografar(valor), limit)
    else:
        query = f"SELECT * FROM {TABLE} WHERE {campo} LIKE %s LIMIT %s"
        params = (f"%{valor}%", limit)
    linhas = execute_query(query, params, fetch="all") or []
    return [_descriptografar_linha(l) for l in linhas]


def atualizar_cliente(id_cliente, **campos):
    """
    Atualiza os campos informados de um registro de Cliente.
    Ex: atualizar_cliente(1, cep="01001-000")
    """
    campos = {
        chave: (criptografar(valor) if chave in _CAMPOS_CRIPTOGRAFADOS and valor is not None else valor)
        for chave, valor in campos.items()
    }
    set_clause, params = build_update_clause(campos)
    if not set_clause:
        return 0
    query = f"UPDATE {TABLE} SET {set_clause} WHERE {PK} = %s"
    params.append(id_cliente)
    return execute_query(query, params, commit=True)


def deletar_cliente(id_cliente):
    """Remove um registro de Cliente pelo id."""
    query = f"DELETE FROM {TABLE} WHERE {PK} = %s"
    return execute_query(query, (id_cliente,), commit=True)


# ---------------------------------------------------------------------------
# Funções específicas de autenticação (login) — mesmo padrão de
# crm/usuario_interno.py. Ficam separadas do CRUD genérico de propósito:
# senha_hash nunca entra em REGISTRO["Clientes"]["Cliente"]["cols"], então
# o CRUD genérico da API (/api/Clientes/Cliente) nunca lê nem grava esse
# campo — só as rotas dedicadas de autenticação do cliente.
# ---------------------------------------------------------------------------

def buscar_cliente_por_email(email):
    """Retorna um único registro de Cliente pelo e-mail (texto puro), ou None."""
    query = f"SELECT * FROM {TABLE} WHERE email_criptografado = %s"
    return _descriptografar_linha(execute_query(query, (criptografar(email),), fetch="one"))


def definir_senha(id_cliente, senha_hash):
    """Grava (ou substitui) o hash de senha de um cliente já existente."""
    query = f"UPDATE {TABLE} SET senha_hash = %s WHERE {PK} = %s"
    return execute_query(query, (senha_hash, id_cliente), commit=True)
