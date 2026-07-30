"""
AvaliacaoParceiro — modelo POO da tabela Avaliacoes_Parceiros, pronto pra usar.

Equivalente à versão funcional em TEST/parceiros/avaliacao_parceiro.py.

Colunas da tabela (DATA/BLOCO 2/02_tables.sql):
    id_avaliacao        INT AUTO_INCREMENT PRIMARY KEY
    id_parceiro         INT NOT NULL (FK -> Parceiros)
    id_usuario_interno  INT (FK -> Usuario_Interno)         -- aceita NULL:
                        é como o site distingue avaliação feita por um
                        cliente (None) de uma feita por um funcionário
    nota                INT CHECK (nota >= 1 AND nota <= 5)  -- replicado
                        abaixo como @field_validator, senão o erro só
                        apareceria depois que o banco recusasse
    comentarios         TEXT
"""
from typing import ClassVar, Optional

from pydantic import field_validator

from modelo_base import ModeloBase


class AvaliacaoParceiro(ModeloBase):
    TABELA: ClassVar[str] = "Avaliacoes_Parceiros"
    PK: ClassVar[str] = "id_avaliacao"

    id_parceiro: int
    id_usuario_interno: Optional[int] = None
    nota: Optional[int] = None
    comentarios: Optional[str] = None

    @field_validator("nota")
    @classmethod
    def nota_entre_1_e_5(cls, valor: Optional[int]) -> Optional[int]:
        if valor is not None and not (1 <= valor <= 5):
            raise ValueError(f"nota precisa estar entre 1 e 5, veio {valor}.")
        return valor


if __name__ == "__main__":
    a = AvaliacaoParceiro(id_parceiro=1, nota=5, comentarios="Atendimento excelente.")
    a.salvar()
    print("criado com id:", a.id)

    try:
        AvaliacaoParceiro(id_parceiro=1, nota=9)
    except ValueError as e:
        print("validação pegou nota fora do intervalo:", next(l for l in str(e).splitlines() if "Value error" in l).strip())

    a.deletar()
