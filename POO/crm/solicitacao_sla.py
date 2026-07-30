"""
SolicitacaoSLA — modelo POO da tabela Solicitacao_SLA, pronto pra usar.

Equivalente à versão funcional em TEST/crm/solicitacao_sla.py.

Colunas da tabela (DATA/BLOCO 4/03_tables.sql):
    id_solicitacao    INT AUTO_INCREMENT PRIMARY KEY
    id_oportunidade   INT NOT NULL (FK -> Oportunidade_CRM)
    id_parceiro       INT NOT NULL (FK -> Parceiros)
    data_envio        TIMESTAMP DEFAULT CURRENT_TIMESTAMP  (ver nota em
                       POO/crm/historico_interacao.py sobre default_factory)
    status            VARCHAR(50) NOT NULL
"""
from datetime import datetime
from typing import ClassVar

from pydantic import Field

from modelo_base import ModeloBase


class SolicitacaoSLA(ModeloBase):
    TABELA: ClassVar[str] = "Solicitacao_SLA"
    PK: ClassVar[str] = "id_solicitacao"

    id_oportunidade: int
    id_parceiro: int
    data_envio: datetime = Field(default_factory=datetime.now)
    status: str


if __name__ == "__main__":
    s = SolicitacaoSLA(id_oportunidade=1, id_parceiro=1, status="Enviado")
    s.salvar()
    print("criado com id:", s.id)
    s.deletar()
