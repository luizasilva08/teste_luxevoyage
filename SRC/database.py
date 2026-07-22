"""
Módulo de conexão com o banco de dados LuxeVoyage (MySQL / Aiven Cloud).

As credenciais NÃO ficam mais no código — vêm de variáveis de ambiente
(arquivo .env, que fica fora do git). Veja .env.example.

Usa um POOL de conexões: em vez de abrir uma conexão nova (com handshake
SSL completo até o Aiven) a cada query, mantém um conjunto de conexões já
abertas e prontas pra reaproveitar. É isso que de fato acelera o acesso ao
banco — especialmente sob a API (FastAPI/Flask), que pode receber várias
requisições em sequência rápida.

Requer: pip install mysql-connector-python python-dotenv
"""
import os
import mysql.connector
from mysql.connector import pooling
from dotenv import load_dotenv

load_dotenv()  # carrega variáveis do arquivo .env na raiz do projeto

_POOL = None


def _obter_pool():
    global _POOL
    if _POOL is None:
        _POOL = pooling.MySQLConnectionPool(
            pool_name="luxevoyage_pool",
            pool_size=10,             # até 10 conexões simultâneas reaproveitáveis
            pool_reset_session=True,
            host=os.environ["DB_HOST"],
            port=int(os.environ["DB_PORT"]),
            user=os.environ["DB_USER"],
            password=os.environ["DB_PASSWORD"],
            database=os.environ["DB_NAME"],
        )
    return _POOL


def get_connection():
    """
    Pega uma conexão do pool (abre de verdade só na primeira vez de cada
    slot; depois disso, reaproveita). A assinatura da função não mudou —
    utils.py e todos os módulos de tabela continuam chamando
    get_connection() exatamente como antes, sem precisar de nenhum ajuste.
    """
    connection = _obter_pool().get_connection()

    # Necessário pelo Aiven: o timezone da sessão não é global,
    # então é preciso setar a cada conexão nova (igual ao script de inserts).
    cursor = connection.cursor()
    cursor.execute("SET time_zone = 'America/Sao_Paulo'")
    cursor.close()

    return connection
