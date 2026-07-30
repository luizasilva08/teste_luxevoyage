"""
integracao_exemplo.py — como plugar os modelos POO de volta na API.

Isso NÃO está montado no api_fastapi.py de produção — é o padrão/molde
pra quando a equipe decidir trocar de vez. Até lá, a API continua
rodando 100% com o código funcional (TEST/*.py), sem risco de quebrar
nada.

A ideia: hoje o api_fastapi.py tem 5 rotas genéricas (listar, buscar por
id, criar, atualizar, deletar) que funcionam pra qualquer uma das 25
tabelas olhando o REGISTRO (SRC/registro.py) e chamando
`getattr(modulo, "buscar_X_por_id")` etc. Com POO, a MESMA ideia
funciona, só que em vez de "achar uma função pelo nome", a rota chama um
método da classe — o corpo de cada rota fica praticamente idêntico.

REGISTRO_POO abaixo já cobre as 25 tabelas (espelha exatamente
SRC/registro.py), então esse arquivo é o candidato completo pra
substituir o REGISTRO funcional quando a equipe quiser migrar de vez.
"""
from typing import Any, Dict, Type

from fastapi import HTTPException

from modelo_base import ModeloBase

import sys
import pathlib

_RAIZ_PROJETO = pathlib.Path(__file__).resolve().parent.parent
for pasta in ("geografia", "parceiros", "catalogo", "clientes", "crm",
              "comercial", "operacional", "auditoria"):
    caminho = _RAIZ_PROJETO / "POO" / pasta
    if str(caminho) not in sys.path:
        sys.path.insert(0, str(caminho))

from estado import Estado                              # noqa: E402
from municipio import Municipio                         # noqa: E402
from parceiro import Parceiro                           # noqa: E402
from cobertura_parceiro import CoberturaParceiro         # noqa: E402
from servico_parceiro import ServicoParceiro             # noqa: E402
from avaliacao_parceiro import AvaliacaoParceiro         # noqa: E402
from pacote import Pacote                                # noqa: E402
from temporada import Temporada                          # noqa: E402
from modulo_pacote import ModuloPacote                    # noqa: E402
from preco_sazonal import PrecoSazonal                    # noqa: E402
from destaque_sazonal import DestaqueSazonal              # noqa: E402
from cliente import Cliente                               # noqa: E402
from interesse_cliente import InteresseCliente            # noqa: E402
from consentimento_lgpd import ConsentimentoLGPD          # noqa: E402
from usuario_interno import UsuarioInterno                # noqa: E402
from oportunidade_crm import OportunidadeCRM               # noqa: E402
from historico_interacao import HistoricoInteracao         # noqa: E402
from solicitacao_sla import SolicitacaoSLA                 # noqa: E402
from cotacao_personalizada import CotacaoPersonalizada     # noqa: E402
from item_cotacao import ItemCotacao                        # noqa: E402
from proposta_comercial import PropostaComercial            # noqa: E402
from contrato_digital import ContratoDigital                 # noqa: E402
from viagem import Viagem                                    # noqa: E402
from pagamento_contrato import PagamentoContrato              # noqa: E402
from log_acesso import LogAcesso                              # noqa: E402


REGISTRO_POO: Dict[str, Dict[str, Type[ModeloBase]]] = {
    "Geografia": {"Estado": Estado, "Municipio": Municipio},
    "Parceiros": {
        "Parceiros": Parceiro,
        "Cobertura_Parceiros": CoberturaParceiro,
        "Servicos_Parceiros": ServicoParceiro,
        "Avaliacoes_Parceiros": AvaliacaoParceiro,
    },
    "Catalogo": {
        "Pacote": Pacote,
        "Temporada": Temporada,
        "Modulos_Pacote": ModuloPacote,
        "Preco_Sazonal": PrecoSazonal,
        "Destaques_Sazonais": DestaqueSazonal,
    },
    "Clientes": {
        "Cliente": Cliente,
        "Interesses_Cliente": InteresseCliente,
        "Consentimentos_LGPD": ConsentimentoLGPD,
    },
    "CRM": {
        "Usuario_Interno": UsuarioInterno,
        "Oportunidade_CRM": OportunidadeCRM,
        "Historico_Interacoes": HistoricoInteracao,
        "Solicitacao_SLA": SolicitacaoSLA,
    },
    "Comercial": {
        "Cotacao_Personalizadas": CotacaoPersonalizada,
        "Item_Cotacao": ItemCotacao,
        "Propostas_Comerciais": PropostaComercial,
        "Contrato_Digital": ContratoDigital,
    },
    "Operacional": {"Viagem": Viagem, "Pagamento_Contrato": PagamentoContrato},
    "Auditoria": {"Log_Acesso": LogAcesso},
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
