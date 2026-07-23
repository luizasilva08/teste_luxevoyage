"""
criptografar_clientes_existentes.py — migração ÚNICA: pega os dados de
CPF/e-mail/telefone que hoje estão em texto puro dentro das colunas
VARBINARY de Cliente (foi assim que o banco real ficou depois do
DATA/BLOCO 3/04_atualiza_contatos_cliente.sql) e re-grava criptografados
de verdade com AES-256-SIV (veja criptografia.py).

Depois que TEST/clientes/cliente.py passou a criptografar/descriptografar
automaticamente, qualquer linha ainda em texto puro fica ilegível pro
resto do sistema (a tela mostra o texto cru, sem decifrar) — rode este
script uma vez pra corrigir as linhas existentes.

É seguro rodar mais de uma vez: se um campo já não for texto UTF-8 válido
(ou seja, já foi criptografado), o script pula ele.

Uso (a partir da pasta SRC/, com CRIPTO_KEY já definida no .env):

    python criptografar_clientes_existentes.py
"""
import sys
import pathlib

_RAIZ_PROJETO = pathlib.Path(__file__).resolve().parent.parent
_PASTA_TEST = _RAIZ_PROJETO / "TEST"
if str(_PASTA_TEST) not in sys.path:
    sys.path.insert(0, str(_PASTA_TEST))

from utils import execute_query   # noqa: E402
from criptografia import criptografar  # noqa: E402

_CAMPOS = ("cpf_criptografado", "email_criptografado", "telefone_criptografado")


def main():
    linhas = execute_query(
        f"SELECT id_cliente, {', '.join(_CAMPOS)} FROM Cliente ORDER BY id_cliente",
        fetch="all",
    ) or []

    if not linhas:
        print("Nenhum cliente encontrado.")
        return

    print(f"{len(linhas)} clientes no banco. Confirma a criptografia de CPF/e-mail/telefone? (s/n)")
    if input("> ").strip().lower() != "s":
        print("Cancelado.")
        return

    convertidos = 0
    ja_criptografados = 0

    for linha in linhas:
        valores_novos = {}
        for campo in _CAMPOS:
            bruto = linha[campo]
            if bruto is None:
                continue
            if isinstance(bruto, str):
                texto = bruto
            else:
                try:
                    texto = bytes(bruto).decode("utf-8")
                except UnicodeDecodeError:
                    continue  # já não é texto puro — provavelmente já criptografado
            valores_novos[campo] = criptografar(texto)

        if not valores_novos:
            ja_criptografados += 1
            continue

        set_clause = ", ".join(f"{campo} = %s" for campo in valores_novos)
        params = list(valores_novos.values()) + [linha["id_cliente"]]
        execute_query(f"UPDATE Cliente SET {set_clause} WHERE id_cliente = %s", params, commit=True)
        convertidos += 1

    print(f"\nPronto: {convertidos} cliente(s) criptografado(s), {ja_criptografados} já estavam OK.")


if __name__ == "__main__":
    main()
