"""
Pacote — modelo POO da tabela Pacote, pronto pra usar.

Equivalente à versão funcional em TEST/catalogo/pacote.py.

Colunas da tabela (DATA/BLOCO 2/02_tables.sql):
    id_pacote             INT AUTO_INCREMENT PRIMARY KEY
    nome_pacote           VARCHAR(255) NOT NULL
    id_municipio_destino  INT NOT NULL (FK -> Municipio)
    status                VARCHAR(50) NOT NULL DEFAULT 'Rascunho'
"""
from typing import ClassVar

from modelo_base import ModeloBase


class Pacote(ModeloBase):
    TABELA: ClassVar[str] = "Pacote"
    PK: ClassVar[str] = "id_pacote"

    nome_pacote: str
    id_municipio_destino: int
    status: str = "Rascunho"


if __name__ == "__main__":
    p = Pacote(nome_pacote="Fim de semana em Gramado", id_municipio_destino=1)
    p.salvar()
    print("criado com id:", p.id, "| status padrão:", p.status)

    p.status = "Publicado"
    p.salvar()
    print("depois do update:", Pacote.buscar_por_id(p.id).status)

    p.deletar()
