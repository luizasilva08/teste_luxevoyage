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

Pra cada campo, o script testa 3 estados possíveis, NESSA ordem:
  1. É texto UTF-8 puro -> ainda não foi criptografado -> cifra agora.
  2. Não é texto puro, MAS decifra com a CRIPTO_KEY atual -> já está
     criptografado corretamente -> não mexe.
  3. Não é texto puro E não decifra com a CRIPTO_KEY atual -> estado
     indeterminado (bytes que essa chave não abre). A versão anterior
     deste script tratava esse caso como "já criptografado" e pulava
     silenciosamente — só que isso também é exatamente o que acontece
     quando a CRIPTO_KEY usada aqui é DIFERENTE da chave configurada
     onde a API/site rodam de verdade. Por isso agora esse caso é
     reportado à parte como PROBLEMA, em vez de escondido dentro de
     "já estavam OK".

Se o relatório final mostrar problemas, o mais provável é a CRIPTO_KEY
do .env usado aqui (rodando local) não ser a MESMA CRIPTO_KEY configurada
no ambiente onde a API roda de verdade (ex.: variável de ambiente do
servidor/host, não o arquivo .env local) — confirme os dois valores
antes de mais nada.

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
from criptografia import criptografar, _obter_cifrador  # noqa: E402

_CAMPOS = ("cpf_criptografado", "email_criptografado", "telefone_criptografado")


def _classificar(bruto):
    """Devolve ("texto_puro", valor) | ("ja_cifrado", None) | ("problema", None).

    Importante: usa _obter_cifrador().decrypt(...) diretamente, NÃO a
    função descriptografar() pública — aquela é feita pra nunca quebrar
    a tela (tem um "except Exception: devolve hex" por dentro), então
    ela nunca deixaria a gente enxergar uma falha de verdade aqui."""
    if isinstance(bruto, str):
        return "texto_puro", bruto
    dado = bytes(bruto)
    try:
        return "texto_puro", dado.decode("utf-8")
    except UnicodeDecodeError:
        pass
    # não é texto puro -- só é seguro chamar de "já criptografado" se a
    # CRIPTO_KEY atual REALMENTE conseguir decifrar (senão é bytes que
    # essa chave não entende, não necessariamente ciphertext válido)
    try:
        _obter_cifrador().decrypt(dado, None)
        return "ja_cifrado", None
    except Exception:
        return "problema", None


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
    problemas = []  # (id_cliente, campo)

    for linha in linhas:
        valores_novos = {}
        for campo in _CAMPOS:
            bruto = linha[campo]
            if bruto is None:
                continue
            estado, texto = _classificar(bruto)
            if estado == "texto_puro":
                valores_novos[campo] = criptografar(texto)
            elif estado == "problema":
                problemas.append((linha["id_cliente"], campo))
            # "ja_cifrado" -> não faz nada, já está correto

        if valores_novos:
            set_clause = ", ".join(f"{campo} = %s" for campo in valores_novos)
            params = list(valores_novos.values()) + [linha["id_cliente"]]
            execute_query(f"UPDATE Cliente SET {set_clause} WHERE id_cliente = %s", params, commit=True)
            convertidos += 1
        elif not any(c == linha["id_cliente"] for c, _ in problemas):
            ja_criptografados += 1

    print(f"\nPronto: {convertidos} cliente(s) criptografado(s) agora, {ja_criptografados} já estavam OK.")
    if problemas:
        print(f"\n{len(problemas)} campo(s) NÃO decifram com a CRIPTO_KEY atual (não são texto puro nem")
        print("ciphertext válido pra essa chave) — provável CRIPTO_KEY diferente da usada onde a API roda:")
        for id_cliente, campo in problemas:
            print(f"  - Cliente id={id_cliente}, campo={campo}")


if __name__ == "__main__":
    main()
