"""
recriptografar_clientes_seed.py — migração de RECUPERAÇÃO única.

Contexto: os 200 clientes de demonstração (dados fictícios, veja o
comentário no topo de DATA/BLOCO 3/04_atualiza_contatos_cliente.sql —
"não contem dados reais de ninguém") ficaram com CPF/e-mail/telefone
cifrados com uma CRIPTO_KEY que não existe mais em lugar nenhum. Como é
criptografia de verdade (AES-256-SIV), não tem como decifrar sem a
chave original — mas como são dados de seed, o texto original está
gravado, em claro, no próprio arquivo .sql que os populou. Este script
lê esses valores originais direto do .sql e re-grava cada cliente
cifrado com a CRIPTO_KEY ATUAL (a mesma que a API usa pra ler depois).

IMPORTANTE — rode isso com a CRIPTO_KEY que a API DE VERDADE usa (a
mesma configurada no ambiente onde o site roda), senão você só troca um
problema de chave por outro. Se você não tem certeza de qual é essa
chave, confirme isso ANTES de rodar este script.

Só cobre os id_cliente de 1 a 200 (os que vieram do seed). Qualquer
cliente cadastrado depois disso pelo site (id_cliente > 200) não está
neste arquivo — esses foram cifrados pela API na hora do cadastro, então
só têm problema se a CRIPTO_KEY da API também tiver mudado depois.

Uso (a partir da pasta SRC/, com a CRIPTO_KEY correta no .env):

    python recriptografar_clientes_seed.py
"""
import re
import sys
import pathlib

_RAIZ_PROJETO = pathlib.Path(__file__).resolve().parent.parent
_PASTA_TEST = _RAIZ_PROJETO / "TEST"
if str(_PASTA_TEST) not in sys.path:
    sys.path.insert(0, str(_PASTA_TEST))

from utils import execute_query   # noqa: E402
from criptografia import criptografar  # noqa: E402

_ARQUIVO_SEED = _RAIZ_PROJETO / "DATA" / "BLOCO 3" / "04_atualiza_contatos_cliente.sql"

_PADRAO_LINHA = re.compile(
    r"cpf_criptografado = '([^']*)', "
    r"email_criptografado = '([^']*)', "
    r"telefone_criptografado = '([^']*)' "
    r"WHERE id_cliente = (\d+)"
)


def _ler_valores_originais():
    texto = _ARQUIVO_SEED.read_text(encoding="utf-8")
    valores = {}
    for cpf, email, telefone, id_cliente in _PADRAO_LINHA.findall(texto):
        valores[int(id_cliente)] = (cpf, email, telefone)
    return valores


def main():
    valores = _ler_valores_originais()
    if not valores:
        print(f"Não achei nenhuma linha em {_ARQUIVO_SEED}. Nada a fazer.")
        return

    print(f"{len(valores)} clientes de seed encontrados no .sql original.")
    print("Isso vai SOBRESCREVER cpf/email/telefone desses clientes no banco,")
    print("recifrando com a CRIPTO_KEY atual. Confirma? (s/n)")
    if input("> ").strip().lower() != "s":
        print("Cancelado.")
        return

    atualizados = 0
    for id_cliente, (cpf, email, telefone) in valores.items():
        query = (
            "UPDATE Cliente SET cpf_criptografado = %s, email_criptografado = %s, "
            "telefone_criptografado = %s WHERE id_cliente = %s"
        )
        params = (criptografar(cpf), criptografar(email), criptografar(telefone), id_cliente)
        execute_query(query, params, commit=True)
        atualizados += 1

    print(f"\nPronto: {atualizados} cliente(s) recriptografado(s) com a chave atual.")
    print("Confira no site se os dados desses clientes já aparecem legíveis.")


if __name__ == "__main__":
    main()
