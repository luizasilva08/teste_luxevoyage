"""
criptografia.py — criptografia simétrica (AES-256-SIV) dos dados sensíveis
do Cliente (CPF, e-mail, telefone).

Por que AES-SIV (RFC 5297) e não um AES-GCM "comum": o e-mail precisa
continuar pesquisável por igualdade (login, evitar cliente duplicado ao
pedir cotação). Com um AES-GCM comum, o nonce é aleatório a cada chamada
— o mesmo e-mail vira um ciphertext diferente toda vez, e um
"WHERE email_criptografado = %s" no banco nunca bate. AES-SIV é
determinístico (mesmo texto + mesma chave = sempre o mesmo ciphertext) e
ainda autenticado (detecta adulteração), então dá pra usar direto num
WHERE sem abrir mão da proteção do dado em repouso.

A chave fica em CRIPTO_KEY no .env — 64 bytes em hex (128 caracteres).
São 64 bytes porque o AES-SIV usa duas subchaves de 256 bits (uma pra
autenticação, outra pra cifrar); não é a chave "duplicada à toa".

Gere a sua com:
    python -c "import secrets; print(secrets.token_hex(64))"

NUNCA reutilize uma chave de exemplo em produção, e nunca commite a
chave de verdade no git (ela mora só no .env, que já está no .gitignore).
"""
import os

from cryptography.hazmat.primitives.ciphers.aead import AESSIV
from dotenv import load_dotenv

load_dotenv()

_CHAVE_HEX = os.environ.get("CRIPTO_KEY")
_cifrador = None


def _obter_cifrador() -> AESSIV:
    global _cifrador
    if _cifrador is None:
        if not _CHAVE_HEX:
            raise RuntimeError(
                "CRIPTO_KEY não definida no .env. Gere uma com: "
                'python -c "import secrets; print(secrets.token_hex(64))"'
            )
        _cifrador = AESSIV(bytes.fromhex(_CHAVE_HEX))
    return _cifrador


def criptografar(texto):
    """Criptografa uma string; retorna bytes prontos pra gravar numa
    coluna VARBINARY/BLOB. None passa direto (campo opcional, ex.: cliente
    sem telefone)."""
    if texto is None:
        return None
    return _obter_cifrador().encrypt(texto.encode("utf-8"), None)


def descriptografar(dado):
    """Descriptografa bytes vindos do banco de volta pra string.
    None passa direto. Se vier uma string (linha antiga, ainda sem
    passar pela migração) ou algo que não descriptografa, devolve como
    veio — melhor mostrar um dado estranho do que derrubar a tela."""
    if dado is None:
        return None
    if isinstance(dado, str):
        return dado
    try:
        return _obter_cifrador().decrypt(bytes(dado), None).decode("utf-8")
    except Exception:
        return dado.hex() if isinstance(dado, (bytes, bytearray)) else dado
