"""
DestaqueSazonal — modelo POO da tabela Destaques_Sazonais, pronto pra usar.

Equivalente à versão funcional em TEST/catalogo/destaque_sazonal.py.

Colunas da tabela (DATA/BLOCO 2/02_tables.sql):
    id_destaque    INT AUTO_INCREMENT PRIMARY KEY
    id_municipio   INT NOT NULL (FK -> Municipio)
    data_inicio    DATE NOT NULL
    data_fim       DATE NOT NULL
    classificacao  VARCHAR(50) NOT NULL
"""
from datetime import date
from typing import ClassVar

from pydantic import model_validator

from modelo_base import ModeloBase


class DestaqueSazonal(ModeloBase):
    TABELA: ClassVar[str] = "Destaques_Sazonais"
    PK: ClassVar[str] = "id_destaque"

    id_municipio: int
    data_inicio: date
    data_fim: date
    classificacao: str

    @model_validator(mode="after")
    def fim_depois_do_inicio(self) -> "DestaqueSazonal":
        if self.data_fim < self.data_inicio:
            raise ValueError("data_fim não pode ser antes de data_inicio.")
        return self


if __name__ == "__main__":
    d = DestaqueSazonal(id_municipio=1, data_inicio=date(2026, 12, 1), data_fim=date(2027, 1, 31),
                         classificacao="Destino do verão")
    d.salvar()
    print("criado com id:", d.id)
    d.deletar()
