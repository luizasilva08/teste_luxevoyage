"""
criar_senha_cliente.py — define (ou reseta) a senha de login de um cliente
já cadastrado em Cliente (por exemplo, alguém que pediu uma cotação pelo
site e agora quer acompanhar isso logado).

Por que isso é um script de terminal, e não uma rota da API?
    Definir a senha de qualquer cliente é uma ação sensível. Deixar isso
    como um endpoint HTTP público (sem exigir já estar logado) seria uma
    porta aberta para qualquer pessoa "roubar" uma conta. Então, por
    enquanto, quem define a senha inicial é você mesmo, rodando este
    script localmente (com acesso direto ao banco) — mesma lógica do
    criar_senha_usuario.py, só que para Cliente em vez de Usuario_Interno.

Uso (a partir da pasta SRC/):

    python criar_senha_cliente.py email@do-cliente.com

O script pede a senha duas vezes (sem mostrar na tela) e grava o hash
no banco.
"""
import sys
import pathlib
import getpass

_RAIZ_PROJETO = pathlib.Path(__file__).resolve().parent.parent
_PASTA_TEST = _RAIZ_PROJETO / "TEST"
if str(_PASTA_TEST) not in sys.path:
    sys.path.insert(0, str(_PASTA_TEST))

from clientes import cliente  # noqa: E402
from auth import hash_senha   # noqa: E402


def main():
    if len(sys.argv) != 2:
        print("Uso: python criar_senha_cliente.py <email_do_cliente>")
        sys.exit(1)

    email = sys.argv[1].strip()
    cliente_encontrado = cliente.buscar_cliente_por_email(email)
    if cliente_encontrado is None:
        print(f"Nenhum cliente encontrado com o e-mail '{email}'.")
        print("Cadastre-o antes (menu de terminal, cotação pelo site ou API) e tente de novo.")
        sys.exit(1)

    print(f"Definindo senha para: {cliente_encontrado['nome']} ({cliente_encontrado['email_criptografado']})")
    senha = getpass.getpass("Nova senha: ")
    confirmacao = getpass.getpass("Confirme a nova senha: ")

    if senha != confirmacao:
        print("As senhas não conferem. Nada foi alterado.")
        sys.exit(1)

    if len(senha) < 6:
        print("Use uma senha com pelo menos 6 caracteres.")
        sys.exit(1)

    cliente.definir_senha(cliente_encontrado["id_cliente"], hash_senha(senha))
    print("Senha definida com sucesso. Já pode fazer login no site.")


if __name__ == "__main__":
    main()
