"""
PropostaComercial — modelo POO da tabela Propostas_Comerciais, pronto pra usar.

Equivalente à versão funcional em TEST/comercial/proposta_comercial.py.

Colunas da tabela (DATA/BLOCO 4/03_tables.sql):
    id_proposta  INT AUTO_INCREMENT PRIMARY KEY
    id_cotacao   INT NOT NULL (FK -> Cotacao_Personalizadas)
    versao       INT NOT NULL DEFAULT 1
    status       VARCHAR(50) NOT NULL
    UNIQUE (id_cotacao, versao)  -- o banco garante sozinho
"""
from typing import ClassVar

from pydantic import Field

from modelo_base import ModeloBase


class PropostaComercial(ModeloBase):
    TABELA: ClassVar[str] = "Propostas_Comerciais"
    PK: ClassVar[str] = "id_proposta"

    id_cotacao: int
    versao: int = Field(default=1, ge=1)
    status: str


if __name__ == "__main__":
    p = PropostaComercial(id_cotacao=1, status="Enviada")
    p.salvar()
    print("criado com id:", p.id, "| versão padrão:", p.versao)
    p.deletar()
