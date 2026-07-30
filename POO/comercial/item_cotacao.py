"""
ItemCotacao — modelo POO da tabela Item_Cotacao, pronto pra usar.

Equivalente à versão funcional em TEST/comercial/item_cotacao.py.

Colunas da tabela (DATA/BLOCO 4/03_tables.sql):
    id_item_cotacao  INT AUTO_INCREMENT PRIMARY KEY
    id_cotacao       INT NOT NULL (FK -> Cotacao_Personalizadas)
    id_modulo        INT NOT NULL (FK -> Modulos_Pacote)
    valor_aplicado   DECIMAL(10, 2) NOT NULL
    UNIQUE (id_cotacao, id_modulo)  -- o banco garante sozinho
"""
from decimal import Decimal
from typing import ClassVar

from pydantic import Field

from modelo_base import ModeloBase


class ItemCotacao(ModeloBase):
    TABELA: ClassVar[str] = "Item_Cotacao"
    PK: ClassVar[str] = "id_item_cotacao"

    id_cotacao: int
    id_modulo: int
    valor_aplicado: Decimal = Field(gt=0)


if __name__ == "__main__":
    i = ItemCotacao(id_cotacao=1, id_modulo=1, valor_aplicado=Decimal("459.90"))
    i.salvar()
    print("criado com id:", i.id)
    i.deletar()
