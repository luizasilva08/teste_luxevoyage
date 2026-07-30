"""
InteresseCliente — modelo POO da tabela Interesses_Cliente, pronto pra usar.

Equivalente à versão funcional em TEST/clientes/interesse_cliente.py.

Colunas da tabela (DATA/BLOCO 3/02_tables.sql):
    id_interesse          INT AUTO_INCREMENT PRIMARY KEY
    id_cliente            INT NOT NULL (FK -> Cliente)
    id_municipio_destino  INT NOT NULL (FK -> Municipio)
    status                VARCHAR(50)              -- aceita NULL -> Optional
"""
from typing import ClassVar, Optional

from modelo_base import ModeloBase


class InteresseCliente(ModeloBase):
    TABELA: ClassVar[str] = "Interesses_Cliente"
    PK: ClassVar[str] = "id_interesse"

    id_cliente: int
    id_municipio_destino: int
    status: Optional[str] = None


if __name__ == "__main__":
    i = InteresseCliente(id_cliente=1, id_municipio_destino=1, status="Ativo")
    i.salvar()
    print("criado com id:", i.id)
    i.deletar()
