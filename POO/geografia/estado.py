"""
Estado — modelo POO da tabela Estado, pronto pra usar.

Equivalente à versão funcional em TEST/geografia/estado.py (mesmas
colunas, mesmo comportamento), só que como classe: valida o dado antes
de qualquer query, e os métodos de banco (salvar/buscar/listar/deletar)
vêm prontos de ModeloBase — aqui só declaramos os campos.

Colunas da tabela (DATA/BLOCO 1/02_tables.sql):
    id_estado    INT AUTO_INCREMENT PRIMARY KEY
    sigla        VARCHAR(2)  NOT NULL UNIQUE
    nome         VARCHAR(50) NOT NULL
    regiao_nome  VARCHAR(50) NOT NULL
    timezone     VARCHAR(50) NOT NULL
"""
from typing import ClassVar

from pydantic import Field, field_validator

from modelo_base import ModeloBase

REGIOES_VALIDAS = ("Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul")


class Estado(ModeloBase):
    TABELA: ClassVar[str] = "Estado"
    PK: ClassVar[str] = "id_estado"

    # NOT NULL no banco -> sem Optional, sem valor padrão
    sigla: str = Field(min_length=2, max_length=2)
    nome: str = Field(min_length=1)
    regiao_nome: str
    timezone: str

    @field_validator("sigla")
    @classmethod
    def sigla_em_maiuscula(cls, valor: str) -> str:
        """'sp' vira 'SP' — evita duplicar estado por causa de caixa."""
        return valor.upper()

    @field_validator("regiao_nome")
    @classmethod
    def regiao_precisa_ser_uma_das_cinco(cls, valor: str) -> str:
        if valor not in REGIOES_VALIDAS:
            raise ValueError(
                f"regiao_nome precisa ser uma de {REGIOES_VALIDAS}, veio {valor!r}."
            )
        return valor


# ---------------------------------------------------------------------
# Exemplos de uso — cada linha comentada corresponde a uma função que
# existiria em TEST/geografia/estado.py na versão funcional; aqui é
# tudo método/classmethod de Estado.
# ---------------------------------------------------------------------
if __name__ == "__main__":
    # criar_estado(...) -> instanciar + .salvar()
    sp = Estado(sigla="sp", nome="São Paulo", regiao_nome="Sudeste", timezone="America/Sao_Paulo")
    sp.salvar()
    print("criado com id:", sp.id, "| sigla normalizada:", sp.sigla)

    # buscar_estado_por_id(id) -> Estado.buscar_por_id(id)
    encontrado = Estado.buscar_por_id(sp.id)
    print("buscar_por_id:", encontrado)

    # listar_estados(limit, offset) -> Estado.listar(limit, offset)
    primeiros_10 = Estado.listar(limit=10)
    print(f"listar: {len(primeiros_10)} estado(s)")

    # buscar_estados_por_campo(campo, valor) -> Estado.buscar_por_campo(...)
    # busca PARCIAL (LIKE '%valor%'), então "Paulo" já acha "São Paulo"
    achados = Estado.buscar_por_campo("nome", "Paulo")
    print(f"buscar_por_campo: {len(achados)} estado(s) com 'Paulo' no nome")

    # atualizar_estado(id, **campos) -> trocar atributo(s) + .salvar() de novo
    # (com validate_assignment=True na ModeloBase, isso já valida sozinho)
    encontrado.timezone = "America/Bahia"
    encontrado.salvar()
    print("depois do update:", Estado.buscar_por_id(sp.id).timezone)

    # validação pega erro ANTES de qualquer query — nem chega a tentar salvar
    try:
        Estado(sigla="SP", nome="Estado Fantasma", regiao_nome="Nordestão", timezone="UTC")
    except ValueError as e:
        print("validação pegou região inválida:", str(e).splitlines()[2].strip())

    # deletar_estado(id) -> .deletar()
    encontrado.deletar()
    print("depois do delete:", Estado.buscar_por_id(sp.id))
