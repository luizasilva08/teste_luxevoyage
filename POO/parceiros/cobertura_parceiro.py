"""
CoberturaParceiro — modelo POO da tabela Cobertura_Parceiros, pronto pra usar.

Equivalente à versão funcional em TEST/parceiros/cobertura_parceiro.py.

Colunas da tabela (DATA/BLOCO 1/02_tables.sql):
    id_cobertura  INT AUTO_INCREMENT PRIMARY KEY
    id_parceiro   INT NOT NULL (FK -> Parceiros)
    id_municipio  INT NOT NULL (FK -> Municipio)
    status        VARCHAR(20) NOT NULL DEFAULT 'Ativo'
    UNIQUE (id_parceiro, id_municipio)  -- o banco garante isso sozinho
"""
from typing import ClassVar

from modelo_base import ModeloBase


class CoberturaParceiro(ModeloBase):
    TABELA: ClassVar[str] = "Cobertura_Parceiros"
    PK: ClassVar[str] = "id_cobertura"

    id_parceiro: int
    id_municipio: int
    status: str = "Ativo"


if __name__ == "__main__":
    c = CoberturaParceiro(id_parceiro=1, id_municipio=1)
    c.salvar()
    print("criado com id:", c.id, "| status padrão:", c.status)
    c.deletar()
