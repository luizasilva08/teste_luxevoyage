"""
ContratoDigital — modelo POO da tabela Contrato_Digital, pronto pra usar.

Equivalente à versão funcional em TEST/comercial/contrato_digital.py.

Colunas da tabela (DATA/BLOCO 4/03_tables.sql):
    id_contrato        INT AUTO_INCREMENT PRIMARY KEY
    id_proposta        INT NOT NULL UNIQUE (FK -> Propostas_Comerciais)
    timestamp_aceite   TIMESTAMP NOT NULL   -- sem DEFAULT no banco, então
                       fica obrigatório aqui também (quem aceita o
                       contrato precisa informar o instante exato)
    ip_aceite          VARCHAR(45) NOT NULL
    hash_integridade   VARCHAR(255) NOT NULL
    status             VARCHAR(50) NOT NULL DEFAULT 'Assinado'
"""
from datetime import datetime
from typing import ClassVar

from modelo_base import ModeloBase


class ContratoDigital(ModeloBase):
    TABELA: ClassVar[str] = "Contrato_Digital"
    PK: ClassVar[str] = "id_contrato"

    id_proposta: int
    timestamp_aceite: datetime
    ip_aceite: str
    hash_integridade: str
    status: str = "Assinado"


if __name__ == "__main__":
    c = ContratoDigital(
        id_proposta=1,
        timestamp_aceite=datetime.now(),
        ip_aceite="200.100.50.25",
        hash_integridade="a1b2c3d4e5f6",
    )
    c.salvar()
    print("criado com id:", c.id, "| status padrão:", c.status)
    c.deletar()
