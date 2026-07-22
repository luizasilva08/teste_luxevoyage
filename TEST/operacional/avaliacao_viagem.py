"""
Módulo CRUD para a tabela Avaliacao_Viagem.
Gerado para o banco de dados LuxeVoyage.
"""
from utils import execute_query, build_update_clause

TABLE = "Avaliacao_Viagem"
PK = "id_avaliacao_viagem"


def criar_avaliacao(id_viagem, id_cliente, nota, comentario):
    """Insere um novo registro em Avaliacao_Viagem e retorna o id gerado (lastrowid)."""
    query = """
        INSERT INTO Avaliacao_Viagem (id_viagem, id_cliente, nota, comentario)
        VALUES (%s, %s, %s, %s)
    """
    params = (id_viagem, id_cliente, nota, comentario)
    return execute_query(query, params, commit=True)


def buscar_avaliacao_por_id(id_avaliacao_viagem):
    """Retorna um único registro de Avaliacao_Viagem pelo id, ou None se não existir."""
    query = f"SELECT * FROM {TABLE} WHERE {PK} = %s"
    return execute_query(query, (id_avaliacao_viagem,), fetch="one")


def buscar_avaliacao_por_viagem_e_cliente(id_viagem, id_cliente):
    """Retorna a avaliação que um cliente já deixou pra uma viagem, ou None."""
    query = f"SELECT * FROM {TABLE} WHERE id_viagem = %s AND id_cliente = %s"
    return execute_query(query, (id_viagem, id_cliente), fetch="one")


def listar_avaliacoes(limit=100, offset=0):
    """Lista registros de Avaliacao_Viagem com paginação simples."""
    query = f"SELECT * FROM {TABLE} ORDER BY {PK} LIMIT %s OFFSET %s"
    return execute_query(query, (limit, offset), fetch="all")


def buscar_avaliacoes_por_campo(campo, valor, limit=100):
    """
    Busca registros de Avaliacao_Viagem filtrando por um único campo/coluna.
    Ex: buscar_avaliacoes_por_campo("id_cliente", 12)
    """
    query = f"SELECT * FROM {TABLE} WHERE {campo} = %s LIMIT %s"
    return execute_query(query, (valor, limit), fetch="all")


def atualizar_avaliacao(id_avaliacao_viagem, **campos):
    """
    Atualiza os campos informados de um registro de Avaliacao_Viagem.
    Ex: atualizar_avaliacao(1, nota=4)
    """
    set_clause, params = build_update_clause(campos)
    if not set_clause:
        return 0
    query = f"UPDATE {TABLE} SET {set_clause} WHERE {PK} = %s"
    params.append(id_avaliacao_viagem)
    return execute_query(query, params, commit=True)


def deletar_avaliacao(id_avaliacao_viagem):
    """Remove um registro de Avaliacao_Viagem pelo id."""
    query = f"DELETE FROM {TABLE} WHERE {PK} = %s"
    return execute_query(query, (id_avaliacao_viagem,), commit=True)
