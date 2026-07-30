"""
OportunidadeCRM — modelo POO da tabela Oportunidade_CRM, pronto pra usar.

Equivalente à versão funcional em TEST/crm/oportunidade_crm.py.

Colunas da tabela (DATA/BLOCO 3/02_tables.sql):
    id_oportunidade     INT AUTO_INCREMENT PRIMARY KEY
    id_cliente          INT NOT NULL (FK -> Cliente)
    id_usuario_interno  INT (FK -> Usuario_Interno)     -- aceita NULL -> Optional
    estagio_funil       VARCHAR(50) NOT NULL
    valor_estimado       DECIMAL(10, 2)                  -- aceita NULL -> Optional
"""
from decimal import Decimal
from typing import ClassVar, Optional

from pydantic import Field

from modelo_base import ModeloBase


class OportunidadeCRM(ModeloBase):
    TABELA: ClassVar[str] = "Oportunidade_CRM"
    PK: ClassVar[str] = "id_oportunidade"

    id_cliente: int
    id_usuario_interno: Optional[int] = None
    estagio_funil: str
    valor_estimado: Optional[Decimal] = Field(default=None, ge=0)


if __name__ == "__main__":
    o = OportunidadeCRM(id_cliente=1, estagio_funil="Contato inicial", valor_estimado=Decimal("3500.00"))
    o.salvar()
    print("criado com id:", o.id)
    o.deletar()
