"""
Pagamento_Contrato — modelo POO da tabela Pagamento_Contrato, pronto pra usar.

Equivalente à versão funcional em TEST/operacional/pagamento_contrato.py.

Colunas da tabela (DATA/BLOCO 4/03_tables.sql):
    id_pagamento      INT AUTO_INCREMENT PRIMARY KEY
    id_contrato       INT NOT NULL
    metodo_pagamento  VARCHAR(50) NOT NULL
    valor_total       DECIMAL(10,2) NOT NULL
    numero_parcela    INT NOT NULL DEFAULT 1
    total_parcelas    INT NOT NULL DEFAULT 1
    status_transacao  VARCHAR(50) NOT NULL DEFAULT 'Pendente'
"""
from decimal import Decimal
from typing import ClassVar

from pydantic import Field, field_validator, model_validator

from modelo_base import ModeloBase

# Valores reais encontrados em DATA/BLOCO 4/02_inserts.sql
METODOS_VALIDOS = (
    "Pix", "Boleto Bancário", "Transferência Bancária",
    "Cartão de Crédito", "Cartão de Débito",
)
STATUS_VALIDOS = ("Pendente", "Confirmado", "Estornado", "Recusado")


class PagamentoContrato(ModeloBase):
    TABELA: ClassVar[str] = "Pagamento_Contrato"
    PK: ClassVar[str] = "id_pagamento"

    id_contrato: int
    metodo_pagamento: str
    valor_total: Decimal = Field(gt=0)
    numero_parcela: int = Field(default=1, ge=1)
    total_parcelas: int = Field(default=1, ge=1)
    status_transacao: str = "Pendente"

    @field_validator("metodo_pagamento")
    @classmethod
    def metodo_precisa_ser_valido(cls, valor: str) -> str:
        if valor not in METODOS_VALIDOS:
            raise ValueError(f"metodo_pagamento precisa ser um de {METODOS_VALIDOS}, veio {valor!r}.")
        return valor

    @field_validator("status_transacao")
    @classmethod
    def status_precisa_ser_valido(cls, valor: str) -> str:
        if valor not in STATUS_VALIDOS:
            raise ValueError(f"status_transacao precisa ser um de {STATUS_VALIDOS}, veio {valor!r}.")
        return valor

    @model_validator(mode="after")
    def parcela_dentro_do_total(self) -> "PagamentoContrato":
        """Regra de negócio: não existe parcela 3 de 2."""
        if self.numero_parcela > self.total_parcelas:
            raise ValueError(
                f"numero_parcela ({self.numero_parcela}) não pode ser maior que "
                f"total_parcelas ({self.total_parcelas})."
            )
        return self


# ---------------------------------------------------------------------
# Exemplos de uso
# ---------------------------------------------------------------------
if __name__ == "__main__":
    p = PagamentoContrato(
        id_contrato=42,
        metodo_pagamento="Pix",
        valor_total=Decimal("1250.00"),
        numero_parcela=1,
        total_parcelas=3,
    )
    p.salvar()
    print("criado com id:", p.id, "| status padrão:", p.status_transacao)

    p.status_transacao = "Confirmado"
    p.salvar()
    print("depois do update:", PagamentoContrato.buscar_por_id(p.id).status_transacao)

    try:
        PagamentoContrato(id_contrato=1, metodo_pagamento="Pix", valor_total=Decimal("100"),
                           numero_parcela=5, total_parcelas=3)
    except ValueError as e:
        print("validação pegou parcela fora do total:", next(l for l in str(e).splitlines() if "Value error" in l).strip())

    try:
        PagamentoContrato(id_contrato=1, metodo_pagamento="Dinheiro Vivo", valor_total=Decimal("100"))
    except ValueError as e:
        print("validação pegou método inválido:", next(l for l in str(e).splitlines() if "Value error" in l).strip())

    p.deletar()
