"""
ServicoParceiro — modelo POO da tabela Servicos_Parceiros, pronto pra usar.

Equivalente à versão funcional em TEST/parceiros/servico_parceiro.py.

Colunas da tabela (DATA/BLOCO 1/02_tables.sql):
    id_servico_parceiro  INT AUTO_INCREMENT PRIMARY KEY
    id_parceiro          INT NOT NULL (FK -> Parceiros)
    categoria_servico    VARCHAR(50) NOT NULL
    nome_servico          VARCHAR(100) NOT NULL
"""
from typing import ClassVar

from modelo_base import ModeloBase


class ServicoParceiro(ModeloBase):
    TABELA: ClassVar[str] = "Servicos_Parceiros"
    PK: ClassVar[str] = "id_servico_parceiro"

    id_parceiro: int
    categoria_servico: str
    nome_servico: str


if __name__ == "__main__":
    s = ServicoParceiro(id_parceiro=1, categoria_servico="Hospedagem", nome_servico="Diária standard")
    s.salvar()
    print("criado com id:", s.id)
    s.deletar()
