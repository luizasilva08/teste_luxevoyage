"""
Cliente — exemplo COMPLETO de modelo POO: campo criptografado
(CAMPOS_CRIPTOGRAFADOS), validação customizada (@field_validator) além
do que os tipos já garantem, e Optional pra campo que pode ficar vazio.

Use este arquivo como molde pra qualquer tabela que precise de mais do
que "só declarar o tipo" — que é o caso de Cliente (CPF tem formato),
Avaliacoes_Parceiros (nota de 1 a 5), Contrato_Digital (status só pode
ser um de poucos valores), etc.
"""
from typing import ClassVar, Optional

from pydantic import Field, field_validator

from modelo_base import ModeloBase


class Cliente(ModeloBase):
    TABELA: ClassVar[str] = "Cliente"
    PK: ClassVar[str] = "id_cliente"
    CAMPOS_CRIPTOGRAFADOS: ClassVar[tuple[str, ...]] = (
        "cpf_criptografado",
        "email_criptografado",
        "telefone_criptografado",
    )

    nome: str = Field(min_length=1)
    cpf_criptografado: Optional[str] = None
    email_criptografado: Optional[str] = None
    telefone_criptografado: Optional[str] = None
    cep: Optional[str] = Field(default=None, max_length=9)
    id_municipio_origem: Optional[int] = None

    # Roda toda vez que cpf_criptografado é definido (na criação e,
    # como ModeloBase tem validate_assignment=True, também se alguém
    # fizer `cliente.cpf_criptografado = "..."` depois.
    @field_validator("cpf_criptografado")
    @classmethod
    def cpf_precisa_ter_11_digitos(cls, valor: Optional[str]) -> Optional[str]:
        if valor is None:
            return valor
        digitos = "".join(c for c in valor if c.isdigit())
        if len(digitos) != 11:
            raise ValueError(f"CPF precisa ter 11 dígitos, veio {len(digitos)}.")
        return valor


# ---------------------------------------------------------------------
# Exemplos de uso
# ---------------------------------------------------------------------
if __name__ == "__main__":
    cliente = Cliente(
        nome="Ana Souza",
        cpf_criptografado="123.456.789-00",
        email_criptografado="ana@email.com",
        telefone_criptografado="(11) 91234-5678",
        cep="01001-000",
    )
    cliente.salvar()
    print("criado com id:", cliente.id)

    # cliente.cpf_criptografado guarda TEXTO PURO em memória — a
    # criptografia só acontece dentro de .salvar()/.buscar_*(), então o
    # resto do código (validação, telas, etc.) nunca precisa saber que
    # isso existe.

    encontrado = Cliente.buscar_por_id(cliente.id)
    print(encontrado.email_criptografado)  # já vem descriptografado

    # Isso aqui ESTOURA erro, antes de qualquer query ser montada:
    try:
        Cliente(nome="Teste", cpf_criptografado="123")
    except ValueError as e:
        print("validação pegou:", e)
