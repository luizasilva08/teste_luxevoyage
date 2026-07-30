"""
LogAcesso — modelo POO da tabela Log_Acesso, pronto pra usar.

Equivalente à versão funcional em TEST/auditoria/log_acesso.py.

Colunas da tabela (DATA/BLOCO 4/03_tables.sql):
    id_log              INT AUTO_INCREMENT PRIMARY KEY
    id_usuario_interno  INT NOT NULL (FK -> Usuario_Interno)
    id_cliente          INT (FK -> Cliente)               -- aceita NULL -> Optional
    tipo_operacao       VARCHAR(50) NOT NULL
    data_acesso         TIMESTAMP DEFAULT CURRENT_TIMESTAMP  (ver nota em
                        POO/crm/historico_interacao.py sobre default_factory)
"""
from datetime import datetime
from typing import ClassVar, Optional

from pydantic import Field

from modelo_base import ModeloBase


class LogAcesso(ModeloBase):
    TABELA: ClassVar[str] = "Log_Acesso"
    PK: ClassVar[str] = "id_log"

    id_usuario_interno: int
    id_cliente: Optional[int] = None
    tipo_operacao: str
    data_acesso: datetime = Field(default_factory=datetime.now)


if __name__ == "__main__":
    l = LogAcesso(id_usuario_interno=1, tipo_operacao="Login")
    l.salvar()
    print("criado com id:", l.id, "| data automática:", l.data_acesso)
    l.deletar()
