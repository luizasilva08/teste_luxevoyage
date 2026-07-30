"""
ModuloPacote — modelo POO da tabela Modulos_Pacote, pronto pra usar.

Equivalente à versão funcional em TEST/catalogo/modulo_pacote.py.

Colunas da tabela (DATA/BLOCO 2/02_tables.sql):
    id_modulo            INT AUTO_INCREMENT PRIMARY KEY
    id_pacote            INT NOT NULL (FK -> Pacote)
    id_servico_parceiro  INT NOT NULL (FK -> Servicos_Parceiros)
    obrigatorio          BOOLEAN NOT NULL DEFAULT TRUE
    UNIQUE (id_pacote, id_servico_parceiro)  -- o banco garante sozinho
"""
from typing import ClassVar

from modelo_base import ModeloBase


class ModuloPacote(ModeloBase):
    TABELA: ClassVar[str] = "Modulos_Pacote"
    PK: ClassVar[str] = "id_modulo"

    id_pacote: int
    id_servico_parceiro: int
    obrigatorio: bool = True


if __name__ == "__main__":
    m = ModuloPacote(id_pacote=1, id_servico_parceiro=1)
    m.salvar()
    print("criado com id:", m.id, "| obrigatorio padrão:", m.obrigatorio)
    m.deletar()
