"""
Parceiro — modelo POO da tabela Parceiros, pronto pra usar.

Equivalente à versão funcional em TEST/parceiros/parceiro.py.

Colunas da tabela (DATA/BLOCO 1/02_tables.sql):
    id_parceiro    INT AUTO_INCREMENT PRIMARY KEY
    razao_social   VARCHAR(255) NOT NULL
    tipo_parceiro  VARCHAR(50) NOT NULL
    status         VARCHAR(20) NOT NULL DEFAULT 'Ativo'
"""
from typing import ClassVar

from modelo_base import ModeloBase


class Parceiro(ModeloBase):
    TABELA: ClassVar[str] = "Parceiros"
    PK: ClassVar[str] = "id_parceiro"

    razao_social: str
    tipo_parceiro: str
    status: str = "Ativo"


if __name__ == "__main__":
    p = Parceiro(razao_social="Pousada Vista Mar", tipo_parceiro="Hospedagem")
    p.salvar()
    print("criado com id:", p.id, "| status padrão:", p.status)

    p.status = "Inativo"
    p.salvar()
    print("depois do update:", Parceiro.buscar_por_id(p.id).status)

    p.deletar()
