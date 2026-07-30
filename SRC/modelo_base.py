"""
modelo_base.py — camada comum de validação + persistência dos modelos
POO do LuxeVoyage.

Duas responsabilidades numa classe só, de propósito:
  1. Validação de dado (herda de pydantic.BaseModel) — "isso é um Cliente
     válido?" É checado toda vez que alguém cria ou atualiza um objeto,
     antes de qualquer query chegar no banco. Se o dado está errado, o
     erro estoura em Python, não em "mysql.connector.errors...".
  2. Persistência (salvar/buscar_por_id/listar/buscar_por_campo/deletar)
     — usa o MESMO execute_query() e a MESMA pool de conexões que o
     projeto inteiro já usa (utils.py/database.py). Nenhuma infra nova.

Cada tabela vira uma subclasse pequena: declara os campos (com
validação, se precisar) e alguns atributos de classe. Veja
POO/geografia/estado.py (exemplo simples) e POO/clientes/cliente.py
(exemplo com campo criptografado e validação customizada).

------------------------------------------------------------------------
GUIA RÁPIDO DOS 4 PILARES DE POO NESTE ARQUIVO (pra quem for avaliar):

  - HERANÇA:        ModeloBase herda de pydantic.BaseModel (ganha
                     validação de graça); Estado/Cliente/Viagem/... vão
                     herdar de ModeloBase (ganham salvar/buscar/deletar
                     de graça, sem reescrever SQL nenhum).
  - ENCAPSULAMENTO:  _campos_para_banco() e a cifra/decifra de dados
                     sensíveis ficam escondidas atrás de método "privado"
                     (prefixo _) — quem usa a classe nunca lida com SQL
                     nem com o dado criptografado na mão.
  - POLIMORFISMO:    os classmethods (buscar_por_id, listar, ...) são
                     escritos UMA vez aqui, mas se comportam diferente
                     em cada subclasse porque usam cls.TABELA/cls.PK —
                     o mesmo código, "personalizado" por quem chamou.
  - ABSTRAÇÃO:       quem usa Estado/Cliente/Viagem não precisa saber
                     que por baixo existe um INSERT/UPDATE/SELECT em
                     SQL — só chama .salvar(), .buscar_por_id(id) etc.
------------------------------------------------------------------------
"""
from __future__ import annotations

from typing import ClassVar, Optional

from pydantic import BaseModel, ConfigDict

from utils import execute_query, build_update_clause
from criptografia import criptografar, descriptografar


class ModeloBase(BaseModel):
    """Classe-mãe de todo modelo POO do projeto. Nunca é usada
    diretamente (não existe uma tabela "ModeloBase") — só serve pra
    Estado, Cliente, Viagem etc. herdarem dela."""

    # Por padrão, o Pydantic só valida os dados quando o objeto é
    # criado (Estado(...)). Com validate_assignment=True, ele valida
    # de novo toda vez que um atributo é trocado depois de criado
    # (ex.: estado.sigla = "xx"), fechando uma brecha que existiria se
    # a validação só rodasse uma vez no __init__.
    model_config = ConfigDict(validate_assignment=True)

    # ---------------------------------------------------------------
    # Atributos de CLASSE (ClassVar) — são o "contrato" que toda
    # subclasse precisa preencher. Diferente de um atributo normal
    # (que muda de objeto pra objeto, tipo o nome de cada Estado),
    # estes são fixos pra tabela inteira: Estado.TABELA é sempre
    # "Estado", não importa qual objeto Estado estamos olhando.
    # ---------------------------------------------------------------
    TABELA: ClassVar[str] = ""    # nome da tabela no banco (ex.: "Cliente")
    PK: ClassVar[str] = ""        # nome real da coluna de chave primária (ex.: "id_cliente")
    # nomes de campo que passam por criptografia.py antes de ir pro
    # banco. Fica vazio ( () ) por padrão porque a MAIORIA das tabelas
    # não tem dado sensível — só Cliente sobrescreve isso.
    CAMPOS_CRIPTOGRAFADOS: ClassVar[tuple[str, ...]] = ()

    # Todo PK do projeto é INT AUTO_INCREMENT. Em vez de cada subclasse
    # reinventar um "id_cliente: Optional[int]", "id_pacote: Optional[int]"
    # etc., a base já declara um `id` genérico — assim toda classe tem a
    # MESMA cara por fora (sp.id, cliente.id, viagem.id), e é a própria
    # ModeloBase que traduz esse `id` pro nome real da coluna (ver
    # _da_linha() mais abaixo). É None até o primeiro .salvar(), porque
    # antes de salvar o banco ainda não gerou nenhum id pra esse objeto.
    id: Optional[int] = None

    # ---------------------------------------------------------------
    # Persistência: transformar o objeto Python em algo que o banco entende
    # ---------------------------------------------------------------
    def _campos_para_banco(self) -> dict:
        """Pega os atributos do objeto (menos o id, que o banco cuida
        sozinho) e cifra os campos sensíveis. Prefixo `_` = método
        "privado"/interno: é detalhe de implementação, ninguém fora da
        classe deveria chamar isso direto (ENCAPSULAMENTO)."""
        dados = self.model_dump(exclude={"id"})
        for campo in self.CAMPOS_CRIPTOGRAFADOS:
            if campo in dados and dados[campo] is not None:
                dados[campo] = criptografar(dados[campo])
        return dados

    def salvar(self) -> "ModeloBase":
        """INSERT se o objeto ainda não tem id (nunca foi salvo);
        UPDATE se já tem (já existe uma linha no banco pra atualizar).
        Um único método serve pra criar OU atualizar — quem usa a
        classe não precisa saber qual dos dois vai acontecer por baixo
        (ABSTRAÇÃO). Retorna o próprio objeto pra permitir encadear
        chamadas, tipo Estado(...).salvar()."""
        dados = self._campos_para_banco()
        if self.id is None:
            # não tem id ainda -> é um registro novo -> INSERT
            colunas = ", ".join(dados.keys())
            marcadores = ", ".join(["%s"] * len(dados))
            query = f"INSERT INTO {self.TABELA} ({colunas}) VALUES ({marcadores})"
            # execute_query devolve o id gerado pelo AUTO_INCREMENT;
            # guardamos ele no próprio objeto, então da próxima vez que
            # chamar .salvar() ele já sabe que é UPDATE, não INSERT.
            self.id = execute_query(query, tuple(dados.values()), commit=True)
        else:
            # já tem id -> já existe no banco -> UPDATE só do que mudou
            set_clause, params = build_update_clause(dados)
            if set_clause:
                query = f"UPDATE {self.TABELA} SET {set_clause} WHERE {self.PK} = %s"
                execute_query(query, params + [self.id], commit=True)
        return self

    def deletar(self) -> None:
        """Apaga a linha correspondente a este objeto. self.TABELA e
        self.PK são os mesmos atributos de classe que cada subclasse
        já declarou — por isso este método serve pra qualquer tabela
        sem precisar ser reescrito (HERANÇA fazendo o trabalho)."""
        if self.id is None:
            raise ValueError("Esse registro ainda não foi salvo — não tem o que excluir.")
        execute_query(f"DELETE FROM {self.TABELA} WHERE {self.PK} = %s", (self.id,), commit=True)

    # ---------------------------------------------------------------
    # Busca: transformar o que o banco devolve de volta em objeto Python
    #
    # São @classmethod (chamados na CLASSE, não numa instância já
    # criada: Cliente.buscar_por_id(5), não cliente.buscar_por_id(5))
    # porque, antes de buscar, ainda não existe nenhum objeto — é a
    # própria classe que vai "fabricar" um a partir do que voltar do
    # banco.
    # ---------------------------------------------------------------
    @classmethod
    def _da_linha(cls, linha: Optional[dict]):
        """Converte uma linha crua do banco (um dict, ex.:
        {"id_cliente": 5, "nome": "Ana", "cpf_criptografado": b"..."})
        num objeto do modelo certo.

        O parâmetro `cls` é o pulo do gato do POLIMORFISMO aqui: este
        método está escrito UMA única vez na classe-mãe, mas quando
        Cliente.buscar_por_id(...) chama ele, `cls` vale Cliente; quando
        Estado.buscar_por_id(...) chama, `cls` vale Estado. Mesmo
        código, resultado diferente dependendo de quem chamou."""
        if linha is None:
            return None
        linha = dict(linha)
        # troca o nome real da PK (id_cliente, id_pacote...) pelo
        # atributo genérico `id` que a base declarou
        linha["id"] = linha.pop(cls.PK)
        for campo in cls.CAMPOS_CRIPTOGRAFADOS:
            if campo in linha:
                linha[campo] = descriptografar(linha[campo])
        # cls(**linha) chama o __init__ do Pydantic -> valida de novo
        # o dado que veio do banco, mesma validação de quando o objeto
        # é criado à mão
        return cls(**linha)

    @classmethod
    def buscar_por_id(cls, id_valor):
        """SELECT ... WHERE <PK da tabela certa> = id_valor. Genérico
        porque usa cls.TABELA/cls.PK em vez de nome de tabela fixo."""
        linha = execute_query(f"SELECT * FROM {cls.TABELA} WHERE {cls.PK} = %s", (id_valor,), fetch="one")
        return cls._da_linha(linha)

    @classmethod
    def listar(cls, limit: int = 100, offset: int = 0):
        """Lista paginada (LIMIT/OFFSET) — mesma ideia de listar_estados,
        listar_clientes etc. da versão funcional antiga, só que um
        método só serve pra qualquer tabela."""
        linhas = execute_query(
            f"SELECT * FROM {cls.TABELA} ORDER BY {cls.PK} LIMIT %s OFFSET %s",
            (limit, offset),
            fetch="all",
        ) or []
        return [cls._da_linha(l) for l in linhas]

    @classmethod
    def buscar_por_campo(cls, campo: str, valor, limit: int = 100):
        """Busca parcial (LIKE '%valor%') pra campo normal — assim
        buscar "sil" já acha "Silva". Pra campo criptografado isso não
        funciona (LIKE não enxerga dentro de um dado cifrado), então
        nesse caso a busca é por igualdade exata, cifrando o valor de
        busca também antes de comparar. É limitação técnica da
        criptografia determinística, não uma escolha de design."""
        if campo in cls.CAMPOS_CRIPTOGRAFADOS:
            query = f"SELECT * FROM {cls.TABELA} WHERE {campo} = %s LIMIT %s"
            params = (criptografar(valor), limit)
        else:
            query = f"SELECT * FROM {cls.TABELA} WHERE {campo} LIKE %s LIMIT %s"
            params = (f"%{valor}%", limit)
        linhas = execute_query(query, params, fetch="all") or []
        return [cls._da_linha(l) for l in linhas]
