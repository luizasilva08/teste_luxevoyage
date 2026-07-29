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
"""
from __future__ import annotations

from typing import ClassVar, Optional

from pydantic import BaseModel, ConfigDict

from utils import execute_query, build_update_clause
from criptografia import criptografar, descriptografar


class ModeloBase(BaseModel):
    # valida de novo sempre que um atributo é reatribuído depois de
    # criado (ex.: `cliente.email_criptografado = "x"` também é checado,
    # não só na hora do __init__)
    model_config = ConfigDict(validate_assignment=True)

    # --- toda subclasse PRECISA sobrescrever isto -----------------------
    TABELA: ClassVar[str] = ""
    PK: ClassVar[str] = ""
    # nomes de campo que passam por criptografia.py antes de ir pro banco
    # (deixe vazio — a tupla () — se a tabela não tiver nenhum)
    CAMPOS_CRIPTOGRAFADOS: ClassVar[tuple[str, ...]] = ()

    # todo PK do projeto é INT AUTO_INCREMENT; representamos isso aqui de
    # forma genérica (fica None até o primeiro .salvar())
    id: Optional[int] = None

    # ---------------------------------------------------------------
    # Persistência
    # ---------------------------------------------------------------
    def _campos_para_banco(self) -> dict:
        """Todos os campos do modelo, exceto `id`, com os criptografados
        já cifrados — prontos pra virar colunas de um INSERT/UPDATE."""
        dados = self.model_dump(exclude={"id"})
        for campo in self.CAMPOS_CRIPTOGRAFADOS:
            if campo in dados and dados[campo] is not None:
                dados[campo] = criptografar(dados[campo])
        return dados

    def salvar(self) -> "ModeloBase":
        """INSERT se o objeto ainda não tem id; UPDATE se já tem.
        Retorna o próprio objeto (com `id` preenchido depois do INSERT)."""
        dados = self._campos_para_banco()
        if self.id is None:
            colunas = ", ".join(dados.keys())
            marcadores = ", ".join(["%s"] * len(dados))
            query = f"INSERT INTO {self.TABELA} ({colunas}) VALUES ({marcadores})"
            self.id = execute_query(query, tuple(dados.values()), commit=True)
        else:
            set_clause, params = build_update_clause(dados)
            if set_clause:
                query = f"UPDATE {self.TABELA} SET {set_clause} WHERE {self.PK} = %s"
                execute_query(query, params + [self.id], commit=True)
        return self

    def deletar(self) -> None:
        if self.id is None:
            raise ValueError("Esse registro ainda não foi salvo — não tem o que excluir.")
        execute_query(f"DELETE FROM {self.TABELA} WHERE {self.PK} = %s", (self.id,), commit=True)

    # ---------------------------------------------------------------
    # Busca (classmethods — chamados na classe, não numa instância:
    # Cliente.buscar_por_id(5), não cliente.buscar_por_id(5))
    # ---------------------------------------------------------------
    @classmethod
    def _da_linha(cls, linha: Optional[dict]):
        """Converte uma linha do banco (dict do mysql-connector) num
        objeto do modelo — troca a PK real (id_cliente, id_pacote...)
        pelo campo genérico `id` e descriptografa o que precisar."""
        if linha is None:
            return None
        linha = dict(linha)
        linha["id"] = linha.pop(cls.PK)
        for campo in cls.CAMPOS_CRIPTOGRAFADOS:
            if campo in linha:
                linha[campo] = descriptografar(linha[campo])
        return cls(**linha)

    @classmethod
    def buscar_por_id(cls, id_valor):
        linha = execute_query(f"SELECT * FROM {cls.TABELA} WHERE {cls.PK} = %s", (id_valor,), fetch="one")
        return cls._da_linha(linha)

    @classmethod
    def listar(cls, limit: int = 100, offset: int = 0):
        linhas = execute_query(
            f"SELECT * FROM {cls.TABELA} ORDER BY {cls.PK} LIMIT %s OFFSET %s",
            (limit, offset),
            fetch="all",
        ) or []
        return [cls._da_linha(l) for l in linhas]

    @classmethod
    def buscar_por_campo(cls, campo: str, valor, limit: int = 100):
        """Busca parcial (LIKE '%valor%') pra campos normais; igualdade
        exata pra campos criptografados (LIKE não funciona em
        ciphertext — é uma limitação técnica, não escolha de design)."""
        if campo in cls.CAMPOS_CRIPTOGRAFADOS:
            query = f"SELECT * FROM {cls.TABELA} WHERE {campo} = %s LIMIT %s"
            params = (criptografar(valor), limit)
        else:
            query = f"SELECT * FROM {cls.TABELA} WHERE {campo} LIKE %s LIMIT %s"
            params = (f"%{valor}%", limit)
        linhas = execute_query(query, params, fetch="all") or []
        return [cls._da_linha(l) for l in linhas]
