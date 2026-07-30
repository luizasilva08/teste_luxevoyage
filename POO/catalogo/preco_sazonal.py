"""
PrecoSazonal — modelo POO da tabela Preco_Sazonal, pronto pra usar.

Equivalente à versão funcional em TEST/catalogo/preco_sazonal.py.

Colunas da tabela (DATA/BLOCO 3/02_tables.sql):
    id_preco        INT AUTO_INCREMENT PRIMARY KEY
    id_modulo       INT NOT NULL (FK -> Modulos_Pacote)
    id_temporada    INT NOT NULL (FK -> Temporada)
    valor_sugerido  DECIMAL(10, 2) NOT NULL
    UNIQUE (id_modulo, id_temporada)  -- o banco garante sozinho
"""
from decimal import Decimal
from typing import ClassVar

from pydantic import Field

from modelo_base import ModeloBase


class PrecoSazonal(ModeloBase):
    TABELA: ClassVar[str] = "Preco_Sazonal"
    PK: ClassVar[str] = "id_preco"

    id_modulo: int
    id_temporada: int
    valor_sugerido: Decimal = Field(gt=0)


if __name__ == "__main__":
    p = PrecoSazonal(id_modulo=1, id_temporada=1, valor_sugerido=Decimal("459.90"))
    p.salvar()
    print("criado com id:", p.id)

    try:
        PrecoSazonal(id_modulo=1, id_temporada=1, valor_sugerido=Decimal("0"))
    except ValueError as e:
        print("validação pegou valor não positivo:", str(e).splitlines()[1].strip())

    p.deletar()
