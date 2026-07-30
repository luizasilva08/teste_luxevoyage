"""
HistoricoInteracao — modelo POO da tabela Historico_Interacoes, pronto pra usar.

Equivalente à versão funcional em TEST/crm/historico_interacao.py.

Colunas da tabela (DATA/BLOCO 3/02_tables.sql):
    id_interacao        INT AUTO_INCREMENT PRIMARY KEY
    id_oportunidade     INT NOT NULL (FK -> Oportunidade_CRM)
    id_cliente          INT (FK -> Cliente)             -- aceita NULL -> Optional
    id_usuario_interno  INT (FK -> Usuario_Interno)      -- aceita NULL -> Optional
    tipo_interacao      VARCHAR(50) NOT NULL
    data_interacao      TIMESTAMP DEFAULT CURRENT_TIMESTAMP

A ModeloBase sempre envia todas as colunas no INSERT (não dá pra
"omitir" uma coluna pra deixar o DEFAULT do banco assumir), então aqui
usamos default_factory=datetime.now pra reproduzir em Python o mesmo
comportamento do DEFAULT CURRENT_TIMESTAMP do banco.
"""
from datetime import datetime
from typing import ClassVar, Optional

from pydantic import Field

from modelo_base import ModeloBase


class HistoricoInteracao(ModeloBase):
    TABELA: ClassVar[str] = "Historico_Interacoes"
    PK: ClassVar[str] = "id_interacao"

    id_oportunidade: int
    id_cliente: Optional[int] = None
    id_usuario_interno: Optional[int] = None
    tipo_interacao: str
    data_interacao: datetime = Field(default_factory=datetime.now)


if __name__ == "__main__":
    h = HistoricoInteracao(id_oportunidade=1, tipo_interacao="Ligação")
    h.salvar()
    print("criado com id:", h.id, "| data automática:", h.data_interacao)
    h.deletar()
