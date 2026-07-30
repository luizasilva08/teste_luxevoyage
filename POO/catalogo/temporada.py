"""
Temporada — modelo POO da tabela Temporada, pronto pra usar.

Equivalente à versão funcional em TEST/catalogo/temporada.py.

Colunas da tabela (DATA/BLOCO 2/02_tables.sql):
    id_temporada  INT AUTO_INCREMENT PRIMARY KEY
    nome          VARCHAR(100) NOT NULL UNIQUE
    data_inicio   DATE NOT NULL
    data_fim      DATE NOT NULL
"""
from datetime import date
from typing import ClassVar

from pydantic import model_validator

from modelo_base import ModeloBase


class Temporada(ModeloBase):
    TABELA: ClassVar[str] = "Temporada"
    PK: ClassVar[str] = "id_temporada"

    nome: str
    data_inicio: date
    data_fim: date

    @model_validator(mode="after")
    def fim_depois_do_inicio(self) -> "Temporada":
        if self.data_fim < self.data_inicio:
            raise ValueError("data_fim não pode ser antes de data_inicio.")
        return self


if __name__ == "__main__":
    t = Temporada(nome="Alta temporada 2026", data_inicio=date(2026, 12, 1), data_fim=date(2027, 2, 28))
    t.salvar()
    print("criado com id:", t.id)

    try:
        Temporada(nome="Temporada inválida", data_inicio=date(2026, 3, 1), data_fim=date(2026, 1, 1))
    except ValueError as e:
        print("validação pegou datas invertidas:", next(l for l in str(e).splitlines() if "Value error" in l).strip())

    t.deletar()
