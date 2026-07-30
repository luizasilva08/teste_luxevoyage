"""
ConsentimentoLGPD — modelo POO da tabela Consentimentos_LGPD, pronto pra usar.

Equivalente à versão funcional em TEST/clientes/consentimento_lgpd.py.

Colunas da tabela (DATA/BLOCO 4/03_tables.sql):
    id_consentimento    INT AUTO_INCREMENT PRIMARY KEY
    id_cliente          INT NOT NULL (FK -> Cliente)
    tipo_consentimento  VARCHAR(100) NOT NULL
    status              VARCHAR(20) NOT NULL DEFAULT 'Ativo'
"""
from typing import ClassVar

from modelo_base import ModeloBase


class ConsentimentoLGPD(ModeloBase):
    TABELA: ClassVar[str] = "Consentimentos_LGPD"
    PK: ClassVar[str] = "id_consentimento"

    id_cliente: int
    tipo_consentimento: str
    status: str = "Ativo"


if __name__ == "__main__":
    c = ConsentimentoLGPD(id_cliente=1, tipo_consentimento="Marketing por e-mail")
    c.salvar()
    print("criado com id:", c.id, "| status padrão:", c.status)
    c.deletar()
