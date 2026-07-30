"""
CotacaoPersonalizada — modelo POO da tabela Cotacao_Personalizadas, pronto pra usar.

Equivalente à versão funcional em TEST/comercial/cotacao_personalizada.py.

Colunas da tabela (DATA/BLOCO 4/03_tables.sql):
    id_cotacao              INT AUTO_INCREMENT PRIMARY KEY
    id_oportunidade         INT NOT NULL (FK -> Oportunidade_CRM)
    id_pacote               INT (FK -> Pacote)              -- aceita NULL -> Optional
    valor_total_calculado   DECIMAL(10, 2)                   -- aceita NULL -> Optional
    status                  VARCHAR(50) NOT NULL
"""
from decimal import Decimal
from typing import ClassVar, Optional

from pydantic import Field

from modelo_base import ModeloBase


class CotacaoPersonalizada(ModeloBase):
    TABELA: ClassVar[str] = "Cotacao_Personalizadas"
    PK: ClassVar[str] = "id_cotacao"

    id_oportunidade: int
    id_pacote: Optional[int] = None
    valor_total_calculado: Optional[Decimal] = Field(default=None, ge=0)
    status: str


if __name__ == "__main__":
    c = CotacaoPersonalizada(id_oportunidade=1, status="Em elaboração")
    c.salvar()
    print("criado com id:", c.id)
    c.deletar()
