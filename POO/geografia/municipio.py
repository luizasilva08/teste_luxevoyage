"""
Municipio — modelo POO da tabela Municipio, pronto pra usar.

Equivalente à versão funcional em TEST/geografia/municipio.py.

Colunas da tabela (DATA/BLOCO 1/02_tables.sql):
    id_municipio  INT AUTO_INCREMENT PRIMARY KEY
    id_estado     INT NOT NULL (FK -> Estado)
    nome          VARCHAR(100) NOT NULL
    categoria     VARCHAR(50)               -- aceita NULL -> Optional
"""
from typing import ClassVar, Optional

from modelo_base import ModeloBase


class Municipio(ModeloBase):
    TABELA: ClassVar[str] = "Municipio"
    PK: ClassVar[str] = "id_municipio"

    id_estado: int
    nome: str
    categoria: Optional[str] = None


if __name__ == "__main__":
    m = Municipio(id_estado=1, nome="Gramado", categoria="Serra")
    m.salvar()
    print("criado com id:", m.id)

    achados = Municipio.buscar_por_campo("nome", "Gramado")
    print("buscar_por_campo:", len(achados), "resultado(s)")

    m.deletar()
