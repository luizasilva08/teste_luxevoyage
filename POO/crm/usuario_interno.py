"""
UsuarioInterno — modelo POO da tabela Usuario_Interno, pronto pra usar.

Equivalente à versão funcional em TEST/crm/usuario_interno.py.

Colunas da tabela (DATA/BLOCO 1/02_tables.sql — sem contar salt/senha_hash,
que são detalhe de autenticação e não entram aqui, mesma decisão já
tomada em POO/clientes/cliente.py):
    id_usuario_interno  INT AUTO_INCREMENT PRIMARY KEY
    nome                VARCHAR(255) NOT NULL
    cargo               VARCHAR(100)                -- aceita NULL -> Optional
    email_corporativo   VARCHAR(255) NOT NULL UNIQUE
    nivel_acesso        VARCHAR(50) NOT NULL

nivel_acesso não tem CHECK no banco, mas o valor só pode ser um dos 5
níveis que o resto do sistema já reconhece (ver
FRONTEND/src/lib/permissoes.ts) — por isso a validação abaixo.
"""
from typing import ClassVar, Optional

from pydantic import EmailStr, field_validator

from modelo_base import ModeloBase

NIVEIS_VALIDOS = ("Admin", "Gerente", "Operacoes", "Suporte", "Vendedor")


class UsuarioInterno(ModeloBase):
    TABELA: ClassVar[str] = "Usuario_Interno"
    PK: ClassVar[str] = "id_usuario_interno"

    nome: str
    cargo: Optional[str] = None
    email_corporativo: EmailStr
    nivel_acesso: str

    @field_validator("nivel_acesso")
    @classmethod
    def nivel_precisa_ser_valido(cls, valor: str) -> str:
        if valor not in NIVEIS_VALIDOS:
            raise ValueError(f"nivel_acesso precisa ser um de {NIVEIS_VALIDOS}, veio {valor!r}.")
        return valor


if __name__ == "__main__":
    u = UsuarioInterno(nome="Carla Souza", cargo="Consultora", email_corporativo="carla@luxevoyage.com",
                        nivel_acesso="Vendedor")
    u.salvar()
    print("criado com id:", u.id)

    try:
        UsuarioInterno(nome="Teste", email_corporativo="teste@luxevoyage.com", nivel_acesso="Estagiario")
    except ValueError as e:
        print("validação pegou nível inválido:", next(l for l in str(e).splitlines() if "Value error" in l).strip())

    u.deletar()
