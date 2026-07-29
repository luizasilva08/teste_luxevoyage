"""
Viagem — modelo POO da tabela Viagem, pronto pra usar.

Equivalente à versão funcional em TEST/operacional/viagem.py.

Colunas da tabela (DATA/BLOCO 4/03_tables.sql):
    id_viagem      INT AUTO_INCREMENT PRIMARY KEY
    id_contrato    INT NOT NULL UNIQUE
    data_embarque  TIMESTAMP NOT NULL
    data_retorno   TIMESTAMP NOT NULL
    status_viagem  VARCHAR(50) NOT NULL DEFAULT 'Confirmada'
"""
from datetime import datetime
from typing import ClassVar

from pydantic import Field, field_validator, model_validator

from modelo_base import ModeloBase

# Únicos valores que aparecem nos dados reais (Confirmada/Em Andamento/
# Concluída/Cancelada) — mesma regra que já vale hoje no painel
# (STATUS_VIAGEM em FRONTEND/src/lib/painel.ts).
STATUS_VALIDOS = ("Confirmada", "Em Andamento", "Concluída", "Cancelada")


class Viagem(ModeloBase):
    TABELA: ClassVar[str] = "Viagem"
    PK: ClassVar[str] = "id_viagem"

    id_contrato: int
    data_embarque: datetime
    data_retorno: datetime
    status_viagem: str = "Confirmada"

    @field_validator("status_viagem")
    @classmethod
    def status_precisa_ser_valido(cls, valor: str) -> str:
        if valor not in STATUS_VALIDOS:
            raise ValueError(f"status_viagem precisa ser um de {STATUS_VALIDOS}, veio {valor!r}.")
        return valor

    @model_validator(mode="after")
    def retorno_depois_do_embarque(self) -> "Viagem":
        """Regra de negócio óbvia que o banco não garante sozinho: a
        volta não pode ser antes da ida."""
        if self.data_retorno < self.data_embarque:
            raise ValueError("data_retorno não pode ser antes de data_embarque.")
        return self


# ---------------------------------------------------------------------
# Exemplos de uso
# ---------------------------------------------------------------------
if __name__ == "__main__":
    v = Viagem(
        id_contrato=42,
        data_embarque=datetime(2026, 8, 1, 10, 0),
        data_retorno=datetime(2026, 8, 10, 18, 0),
    )
    v.salvar()
    print("criado com id:", v.id, "| status padrão:", v.status_viagem)

    v.status_viagem = "Em Andamento"
    v.salvar()
    print("depois do update:", Viagem.buscar_por_id(v.id).status_viagem)

    try:
        Viagem(id_contrato=1, data_embarque=datetime(2026, 8, 10), data_retorno=datetime(2026, 8, 1))
    except ValueError as e:
        print("validação pegou data de retorno antes do embarque:", next(l for l in str(e).splitlines() if "Value error" in l).strip())

    try:
        Viagem(id_contrato=1, data_embarque=datetime(2026, 1, 1), data_retorno=datetime(2026, 1, 2), status_viagem="Perdida")
    except ValueError as e:
        print("validação pegou status inválido:", next(l for l in str(e).splitlines() if "Value error" in l).strip())

    v.deletar()
