"""
integracao_exemplo.py — como plugar os modelos POO de volta na API.

Isso NÃO está montado no api_fastapi.py de produção — é o padrão/molde
pra quando os 5 domínios estiverem convertidos. A pessoa 5 (Operacional +
integração) usa este arquivo como ponto de partida quando o resto
terminar; até lá, a API continua rodando 100% com o código funcional
(TEST/*.py), sem risco de quebrar nada.

A ideia: hoje o api_fastapi.py tem 5 rotas genéricas (listar, buscar por
id, criar, atualizar, deletar) que funcionam pra qualquer uma das 25
tabelas olhando o REGISTRO (SRC/registro.py) e chamando
`getattr(modulo, "buscar_X_por_id")` etc. Com POO, a MESMA ideia
funciona, só que em vez de "achar uma função pelo nome", a rota chama um
método da classe — o corpo de cada rota fica praticamente idêntico.
"""
from typing import Any, Dict, Type

from fastapi import HTTPException

from modelo_base import ModeloBase

# Só o que já existe até agora (Estado, Cliente, Viagem,
# Pagamento_Contrato) — cada pessoa acrescenta as classes do próprio
# domínio aqui conforme for terminando. Quando REGISTRO_POO tiver as 25
# tabelas, ele substitui o REGISTRO atual (SRC/registro.py) por inteiro.
import sys
import pathlib

_RAIZ_PROJETO = pathlib.Path(__file__).resolve().parent.parent
for pasta in ("geografia", "clientes", "operacional"):
    caminho = _RAIZ_PROJETO / "POO" / pasta
    if str(caminho) not in sys.path:
        sys.path.insert(0, str(caminho))

from estado import Estado                        # noqa: E402
from cliente import Cliente                       # noqa: E402
from viagem import Viagem                          # noqa: E402
from pagamento_contrato import PagamentoContrato   # noqa: E402


REGISTRO_POO: Dict[str, Dict[str, Type[ModeloBase]]] = {
    "Geografia": {"Estado": Estado},
    "Clientes": {"Cliente": Cliente},
    "Operacional": {"Viagem": Viagem, "Pagamento_Contrato": PagamentoContrato},
    # "Parceiros": {...},   <- pessoa 1 acrescenta aqui
    # "Catalogo": {...},    <- pessoa 2 acrescenta aqui
    # "CRM": {...},         <- pessoa 3 acrescenta aqui
    # "Comercial": {...},   <- pessoa 4 acrescenta aqui
}


def _obter_classe(dominio: str, tabela: str) -> Type[ModeloBase]:
    classe = REGISTRO_POO.get(dominio, {}).get(tabela)
    if classe is None:
        raise HTTPException(status_code=404, detail="Domínio/tabela não encontrado.")
    return classe


# ---------------------------------------------------------------------
# As 5 rotas genéricas, do jeito que ficariam usando ModeloBase.
# Comparar com api_fastapi.py: a estrutura é a mesma, só troca
# `getattr(info["mod"], "buscar_X_por_id")(id)` por
# `classe.buscar_por_id(id)`.
# ---------------------------------------------------------------------
def api_listar_poo(dominio: str, tabela: str, campo: str | None = None,
                    valor: str | None = None, limit: int = 20, offset: int = 0):
    classe = _obter_classe(dominio, tabela)
    if campo and valor:
        registros = classe.buscar_por_campo(campo, valor, limit=limit)
    else:
        registros = classe.listar(limit=limit, offset=offset)
    return {"registros": [r.model_dump() for r in registros], "total": len(registros)}


def api_buscar_por_id_poo(dominio: str, tabela: str, id_valor: int):
    classe = _obter_classe(dominio, tabela)
    registro = classe.buscar_por_id(id_valor)
    if registro is None:
        raise HTTPException(status_code=404, detail="Registro não encontrado.")
    return registro.model_dump()


def api_criar_poo(dominio: str, tabela: str, dados: Dict[str, Any]):
    classe = _obter_classe(dominio, tabela)
    try:
        objeto = classe(**dados)   # aqui a validação do pydantic já roda sozinha
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
    objeto.salvar()
    return {"mensagem": "Registro criado com sucesso.", "id": objeto.id}


def api_atualizar_poo(dominio: str, tabela: str, id_valor: int, dados: Dict[str, Any]):
    classe = _obter_classe(dominio, tabela)
    objeto = classe.buscar_por_id(id_valor)
    if objeto is None:
        raise HTTPException(status_code=404, detail="Registro não encontrado.")
    for campo, valor in dados.items():
        if valor is not None and hasattr(objeto, campo):
            setattr(objeto, campo, valor)   # dispara validação de novo (validate_assignment=True)
    objeto.salvar()
    return {"mensagem": "Registro atualizado com sucesso."}


def api_deletar_poo(dominio: str, tabela: str, id_valor: int):
    classe = _obter_classe(dominio, tabela)
    objeto = classe.buscar_por_id(id_valor)
    if objeto is None:
        raise HTTPException(status_code=404, detail="Registro não encontrado.")
    objeto.deletar()
    return {"mensagem": "Registro excluído com sucesso."}


# ---------------------------------------------------------------------
# Quando REGISTRO_POO tiver as 25 tabelas, essas 5 funções substituem
# api_listar/api_buscar_por_id/api_criar/api_atualizar/api_deletar em
# SRC/api_fastapi.py (as rotas @app.get/@app.post/etc continuam iguais,
# só o CORPO da função muda pra chamar essas aqui). Até lá, este arquivo
# fica isolado, sem afetar a API de produção.
# ---------------------------------------------------------------------
