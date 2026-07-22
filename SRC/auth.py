"""
auth.py — utilitários de autenticação (hash de senha + JWT).

Usado pelo api_fastapi.py para:
    - gerar/checar o hash de senha dos usuários internos (Usuario_Interno);
    - emitir um token JWT no login;
    - validar esse token nas rotas que exigem usuário logado.

Nada aqui fala com o banco de dados — só criptografia. Quem lê/grava no
banco continua sendo TEST/crm/usuario_interno.py, como todo o resto do
projeto.
"""
import os
import datetime
from typing import Optional

import bcrypt
import jwt
from dotenv import load_dotenv

load_dotenv()

# Chave usada para assinar os tokens. Em produção, defina JWT_SECRET no
# .env (uma string longa e aleatória). Sem isso, cai num valor padrão só
# para não quebrar em desenvolvimento — NÃO use esse padrão em produção.
JWT_SECRET = os.environ.get("JWT_SECRET", "troque-esta-chave-em-producao")
JWT_ALGORITHM = "HS256"
JWT_EXPIRA_HORAS = int(os.environ.get("JWT_EXPIRA_HORAS", "24"))


def hash_senha(senha: str) -> str:
    """Gera o hash bcrypt de uma senha em texto puro."""
    return bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def checar_senha(senha: str, senha_hash: Optional[str]) -> bool:
    """Compara uma senha em texto puro com um hash já salvo no banco."""
    if not senha_hash:
        return False
    try:
        return bcrypt.checkpw(senha.encode("utf-8"), senha_hash.encode("utf-8"))
    except ValueError:
        # hash malformado/antigo — trata como senha incorreta, não como erro 500
        return False


def criar_token(id_usuario_interno: int, email: str, nivel_acesso: str) -> str:
    """Gera um JWT contendo os dados mínimos do usuário logado."""
    agora = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        "sub": str(id_usuario_interno),
        "email": email,
        "nivel_acesso": nivel_acesso,
        "iat": agora,
        "exp": agora + datetime.timedelta(hours=JWT_EXPIRA_HORAS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decodificar_token(token: str) -> Optional[dict]:
    """Valida um JWT e devolve seu payload, ou None se inválido/expirado."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None
