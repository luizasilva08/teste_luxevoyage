"""
relatorios.py — catálogo de relatórios prontos do LuxeVoyage.

Cada relatório tem SQL fixo, escrito e revisado aqui — não é a mesma
coisa que o "SQL livre" do menu de terminal (esse aceita qualquer SELECT
digitado por quem está logado). Aqui a pessoa só escolhe um id de uma
lista pré-definida; não tem texto livre indo pro banco, então não tem
risco de injeção nem de alguém rodar uma consulta pesada por engano.

Cada relatório também carrega os "niveis" (Usuario_Interno.nivel_acesso)
que podem vê-lo — pensado por função, não só copiando a permissão bruta
da tabela: um Vendedor não precisa ver "Log de acessos", mas precisa ver
o funil de vendas dele.
"""

RELATORIOS = [
    # --- Comercial -----------------------------------------------------
    {
        "id": "funil_vendas",
        "titulo": "Funil de vendas por estágio",
        "descricao": "Quantas oportunidades (e quanto em valor estimado) estão em cada estágio do funil.",
        "categoria": "Comercial",
        "niveis": ("Admin", "Gerente", "Vendedor", "Suporte"),
        "sql": """
            SELECT estagio_funil AS rotulo, COUNT(*) AS total, SUM(valor_estimado) AS valor_total
            FROM Oportunidade_CRM
            GROUP BY estagio_funil
            ORDER BY total DESC
        """,
    },
    {
        "id": "propostas_status",
        "titulo": "Propostas por status",
        "descricao": "Quantas propostas foram enviadas, aceitas, recusadas ou expiraram, com o valor total de cada grupo.",
        "categoria": "Comercial",
        "niveis": ("Admin", "Gerente", "Vendedor"),
        "sql": """
            SELECT pr.status AS rotulo, COUNT(*) AS total, SUM(co.valor_total_calculado) AS valor_total
            FROM Propostas_Comerciais pr
            JOIN Cotacao_Personalizadas co ON co.id_cotacao = pr.id_cotacao
            GROUP BY pr.status
            ORDER BY total DESC
        """,
    },
    {
        "id": "ranking_consultores",
        "titulo": "Ranking de consultores",
        "descricao": "Oportunidades por consultor, quantas já fecharam e o valor estimado total sob responsabilidade de cada um.",
        "categoria": "Comercial",
        "niveis": ("Admin", "Gerente", "Vendedor"),
        "sql": """
            SELECT u.nome AS consultor, COUNT(*) AS total_oportunidades,
                   SUM(CASE WHEN o.estagio_funil = 'Fechado' THEN 1 ELSE 0 END) AS fechadas,
                   SUM(o.valor_estimado) AS valor_total_estimado
            FROM Oportunidade_CRM o
            JOIN Usuario_Interno u ON u.id_usuario_interno = o.id_usuario_interno
            GROUP BY u.id_usuario_interno, u.nome
            ORDER BY fechadas DESC, total_oportunidades DESC
        """,
    },
    {
        "id": "leads_sem_consultor",
        "titulo": "Leads sem consultor atribuído",
        "descricao": "Oportunidades que ainda não têm ninguém responsável — candidatas a assumir.",
        "categoria": "Comercial",
        "niveis": ("Admin", "Gerente", "Vendedor", "Suporte"),
        "sql": """
            SELECT o.id_oportunidade, c.nome AS cliente, o.estagio_funil, o.valor_estimado
            FROM Oportunidade_CRM o
            JOIN Cliente c ON c.id_cliente = o.id_cliente
            WHERE o.id_usuario_interno IS NULL
            ORDER BY o.id_oportunidade DESC
            LIMIT 200
        """,
    },
    {
        "id": "ticket_medio_pacote",
        "titulo": "Ticket médio por pacote",
        "descricao": "Valor médio das cotações de cada pacote, do mais caro pro mais barato.",
        "categoria": "Comercial",
        "niveis": ("Admin", "Gerente", "Vendedor"),
        "sql": """
            SELECT p.id_pacote, p.nome_pacote,
                   COUNT(*) AS cotacoes, ROUND(AVG(c.valor_total_calculado), 2) AS ticket_medio
            FROM Cotacao_Personalizadas c
            JOIN Pacote p ON p.id_pacote = c.id_pacote
            GROUP BY p.id_pacote, p.nome_pacote
            ORDER BY ticket_medio DESC
            LIMIT 20
        """,
    },
    {
        "id": "carga_trabalho_vendedores",
        "titulo": "Carga de trabalho dos vendedores",
        "descricao": "Quantas oportunidades ainda em aberto (nem fechadas, nem perdidas) cada vendedor está tocando.",
        "categoria": "Comercial",
        "niveis": ("Admin", "Gerente"),
        "sql": """
            SELECT u.nome AS consultor, u.cargo, COUNT(o.id_oportunidade) AS oportunidades_em_aberto
            FROM Usuario_Interno u
            LEFT JOIN Oportunidade_CRM o
                   ON o.id_usuario_interno = u.id_usuario_interno
                  AND o.estagio_funil NOT IN ('Fechado', 'Perdido')
            WHERE u.nivel_acesso = 'Vendedor'
            GROUP BY u.id_usuario_interno, u.nome, u.cargo
            ORDER BY oportunidades_em_aberto DESC
        """,
    },

    # --- Financeiro ------------------------------------------------------
    {
        "id": "pagamentos_status",
        "titulo": "Pagamentos por status",
        "descricao": "Quanto já está confirmado, pendente ou estornado, em quantidade e valor.",
        "categoria": "Financeiro",
        "niveis": ("Admin", "Gerente", "Operacoes"),
        "sql": """
            SELECT status_transacao AS rotulo, COUNT(*) AS total, SUM(valor_total) AS valor_total
            FROM Pagamento_Contrato
            GROUP BY status_transacao
            ORDER BY valor_total DESC
        """,
    },
    {
        "id": "faturamento_metodo_pagamento",
        "titulo": "Faturamento confirmado por método de pagamento",
        "descricao": "Só pagamentos já confirmados, somados por Pix/cartão/boleto/etc.",
        "categoria": "Financeiro",
        "niveis": ("Admin", "Gerente", "Operacoes"),
        "sql": """
            SELECT metodo_pagamento AS rotulo, COUNT(*) AS total, SUM(valor_total) AS valor_total
            FROM Pagamento_Contrato
            WHERE status_transacao = 'Confirmado'
            GROUP BY metodo_pagamento
            ORDER BY valor_total DESC
        """,
    },
    {
        "id": "parcelas_pendentes",
        "titulo": "Parcelas pendentes",
        "descricao": "Parcelas que ainda não foram pagas, por cliente — pra cobrança.",
        "categoria": "Financeiro",
        "niveis": ("Admin", "Gerente", "Operacoes"),
        "sql": """
            SELECT cl.nome AS cliente, pg.id_contrato, pg.numero_parcela, pg.total_parcelas,
                   pg.valor_total, pg.metodo_pagamento
            FROM Pagamento_Contrato pg
            JOIN Contrato_Digital cd ON cd.id_contrato = pg.id_contrato
            JOIN Propostas_Comerciais pr ON pr.id_proposta = cd.id_proposta
            JOIN Cotacao_Personalizadas co ON co.id_cotacao = pr.id_cotacao
            JOIN Oportunidade_CRM op ON op.id_oportunidade = co.id_oportunidade
            JOIN Cliente cl ON cl.id_cliente = op.id_cliente
            WHERE pg.status_transacao = 'Pendente'
            ORDER BY pg.valor_total DESC
            LIMIT 200
        """,
    },
    {
        "id": "contratos_status",
        "titulo": "Contratos por status",
        "descricao": "Assinados, em análise jurídica ou cancelados.",
        "categoria": "Financeiro",
        "niveis": ("Admin", "Gerente"),
        "sql": """
            SELECT status AS rotulo, COUNT(*) AS total
            FROM Contrato_Digital
            GROUP BY status
            ORDER BY total DESC
        """,
    },

    # --- Operacional -----------------------------------------------------
    {
        "id": "viagens_status",
        "titulo": "Viagens por status",
        "descricao": "Confirmadas, em andamento, concluídas ou canceladas.",
        "categoria": "Operacional",
        "niveis": ("Admin", "Gerente", "Operacoes", "Suporte"),
        "sql": """
            SELECT status_viagem AS rotulo, COUNT(*) AS total
            FROM Viagem
            GROUP BY status_viagem
            ORDER BY total DESC
        """,
    },
    {
        "id": "proximos_embarques",
        "titulo": "Próximos embarques",
        "descricao": "Viagens com embarque a partir de hoje, das mais próximas pras mais distantes.",
        "categoria": "Operacional",
        "niveis": ("Admin", "Gerente", "Operacoes", "Suporte"),
        "sql": """
            SELECT v.id_viagem, cl.nome AS cliente, p.nome_pacote,
                   v.data_embarque, v.data_retorno, v.status_viagem
            FROM Viagem v
            JOIN Contrato_Digital cd ON cd.id_contrato = v.id_contrato
            JOIN Propostas_Comerciais pr ON pr.id_proposta = cd.id_proposta
            JOIN Cotacao_Personalizadas co ON co.id_cotacao = pr.id_cotacao
            JOIN Oportunidade_CRM op ON op.id_oportunidade = co.id_oportunidade
            JOIN Cliente cl ON cl.id_cliente = op.id_cliente
            LEFT JOIN Pacote p ON p.id_pacote = co.id_pacote
            WHERE v.data_embarque >= NOW()
            ORDER BY v.data_embarque ASC
            LIMIT 50
        """,
    },
    {
        "id": "parceiros_mais_usados",
        "titulo": "Parceiros mais usados nas cotações",
        "descricao": "Quantas vezes cada parceiro entrou numa cotação, via os módulos vendidos.",
        "categoria": "Operacional",
        "niveis": ("Admin", "Gerente", "Operacoes"),
        "sql": """
            SELECT pa.razao_social, pa.tipo_parceiro, COUNT(*) AS total_usos
            FROM Item_Cotacao ic
            JOIN Modulos_Pacote mp ON mp.id_modulo = ic.id_modulo
            JOIN Servicos_Parceiros sp ON sp.id_servico_parceiro = mp.id_servico_parceiro
            JOIN Parceiros pa ON pa.id_parceiro = sp.id_parceiro
            GROUP BY pa.id_parceiro, pa.razao_social, pa.tipo_parceiro
            ORDER BY total_usos DESC
            LIMIT 20
        """,
    },
    {
        "id": "avaliacao_media_parceiros",
        "titulo": "Avaliação média por parceiro",
        "descricao": "Nota média (1 a 5) recebida por cada parceiro, incluindo avaliações de clientes.",
        "categoria": "Operacional",
        "niveis": ("Admin", "Gerente", "Operacoes"),
        "sql": """
            SELECT pa.razao_social, COUNT(*) AS total_avaliacoes, ROUND(AVG(av.nota), 2) AS nota_media
            FROM Avaliacoes_Parceiros av
            JOIN Parceiros pa ON pa.id_parceiro = av.id_parceiro
            GROUP BY pa.id_parceiro, pa.razao_social
            ORDER BY nota_media DESC
            LIMIT 20
        """,
    },
    {
        "id": "cobertura_parceiros_estado",
        "titulo": "Cobertura de parceiros por estado",
        "descricao": "Quantos parceiros ativos cobrem cada estado — ajuda a achar onde falta fornecedor.",
        "categoria": "Operacional",
        "niveis": ("Admin", "Gerente", "Operacoes"),
        "sql": """
            SELECT e.nome AS estado, COUNT(DISTINCT cp.id_parceiro) AS total_parceiros
            FROM Cobertura_Parceiros cp
            JOIN Municipio m ON m.id_municipio = cp.id_municipio
            JOIN Estado e ON e.id_estado = m.id_estado
            WHERE cp.status = 'Ativo'
            GROUP BY e.id_estado, e.nome
            ORDER BY total_parceiros DESC
        """,
    },
    {
        "id": "sla_status",
        "titulo": "Solicitações de SLA por status",
        "descricao": "Pedidos feitos a parceiros (disponibilidade, preço, etc.) e em que status estão.",
        "categoria": "Operacional",
        "niveis": ("Admin", "Gerente", "Operacoes", "Suporte"),
        "sql": """
            SELECT status AS rotulo, COUNT(*) AS total
            FROM Solicitacao_SLA
            GROUP BY status
            ORDER BY total DESC
        """,
    },

    # --- Catálogo ----------------------------------------------------------
    {
        "id": "destinos_procurados",
        "titulo": "Destinos mais procurados",
        "descricao": "Destinos com mais interesses registrados por clientes.",
        "categoria": "Catálogo",
        "niveis": ("Admin", "Gerente", "Operacoes", "Suporte", "Vendedor"),
        "sql": """
            SELECT m.nome AS destino, e.sigla AS estado, COUNT(*) AS total_interesses
            FROM Interesses_Cliente ic
            JOIN Municipio m ON m.id_municipio = ic.id_municipio_destino
            JOIN Estado e ON e.id_estado = m.id_estado
            GROUP BY m.id_municipio, m.nome, e.sigla
            ORDER BY total_interesses DESC
            LIMIT 20
        """,
    },
    {
        "id": "pacotes_status",
        "titulo": "Pacotes por status",
        "descricao": "Quantos pacotes estão em rascunho, publicados, ativos, em revisão ou inativos.",
        "categoria": "Catálogo",
        "niveis": ("Admin", "Gerente", "Operacoes"),
        "sql": """
            SELECT status AS rotulo, COUNT(*) AS total
            FROM Pacote
            GROUP BY status
            ORDER BY total DESC
        """,
    },
    {
        "id": "pacotes_sem_modulos",
        "titulo": "Pacotes sem nenhum módulo cadastrado",
        "descricao": "Qualidade de dado: pacote existe, mas ainda não tem serviço/parceiro vinculado.",
        "categoria": "Catálogo",
        "niveis": ("Admin", "Gerente", "Operacoes"),
        "sql": """
            SELECT p.id_pacote, p.nome_pacote, p.status
            FROM Pacote p
            LEFT JOIN Modulos_Pacote mp ON mp.id_pacote = p.id_pacote
            WHERE mp.id_modulo IS NULL
            ORDER BY p.id_pacote DESC
        """,
    },
    {
        "id": "preco_medio_temporada",
        "titulo": "Preço médio por temporada",
        "descricao": "Valor sugerido médio dos módulos, agrupado por temporada.",
        "categoria": "Catálogo",
        "niveis": ("Admin", "Gerente", "Operacoes"),
        "sql": """
            SELECT t.nome AS temporada, t.data_inicio, t.data_fim,
                   ROUND(AVG(ps.valor_sugerido), 2) AS preco_medio
            FROM Preco_Sazonal ps
            JOIN Temporada t ON t.id_temporada = ps.id_temporada
            GROUP BY t.id_temporada, t.nome, t.data_inicio, t.data_fim
            ORDER BY t.data_inicio DESC
        """,
    },
    {
        "id": "destaques_ativos",
        "titulo": "Destaques sazonais ativos hoje",
        "descricao": "Destinos em destaque na data de hoje, prontos pra aparecer na vitrine.",
        "categoria": "Catálogo",
        "niveis": ("Admin", "Gerente", "Operacoes"),
        "sql": """
            SELECT m.nome AS destino, e.sigla AS estado, d.classificacao, d.data_inicio, d.data_fim
            FROM Destaques_Sazonais d
            JOIN Municipio m ON m.id_municipio = d.id_municipio
            JOIN Estado e ON e.id_estado = m.id_estado
            WHERE CURDATE() BETWEEN d.data_inicio AND d.data_fim
            ORDER BY d.data_fim ASC
        """,
    },

    # --- Clientes ----------------------------------------------------------
    {
        "id": "clientes_por_regiao",
        "titulo": "Clientes por região de origem",
        "descricao": "De onde vêm os clientes cadastrados (só conta quem tem município de origem preenchido).",
        "categoria": "Clientes",
        "niveis": ("Admin", "Gerente", "Suporte", "Vendedor"),
        "sql": """
            SELECT e.regiao_nome AS regiao, COUNT(*) AS total_clientes
            FROM Cliente c
            JOIN Municipio m ON m.id_municipio = c.id_municipio_origem
            JOIN Estado e ON e.id_estado = m.id_estado
            GROUP BY e.regiao_nome
            ORDER BY total_clientes DESC
        """,
    },
    {
        "id": "clientes_sem_interacao",
        "titulo": "Oportunidades sem nenhuma interação registrada",
        "descricao": "Leads que existem mas ainda não tiveram nenhum contato anotado — risco de esfriar.",
        "categoria": "Clientes",
        "niveis": ("Admin", "Gerente", "Suporte", "Vendedor"),
        "sql": """
            SELECT cl.nome AS cliente, o.id_oportunidade, o.estagio_funil
            FROM Oportunidade_CRM o
            JOIN Cliente cl ON cl.id_cliente = o.id_cliente
            LEFT JOIN Historico_Interacoes hi ON hi.id_oportunidade = o.id_oportunidade
            WHERE hi.id_interacao IS NULL
            ORDER BY o.id_oportunidade DESC
            LIMIT 200
        """,
    },
    {
        "id": "consentimentos_lgpd",
        "titulo": "Consentimentos LGPD",
        "descricao": "Quantos consentimentos de cada tipo estão ativos ou revogados.",
        "categoria": "Clientes",
        "niveis": ("Admin", "Gerente", "Suporte"),
        "sql": """
            SELECT tipo_consentimento AS rotulo, status, COUNT(*) AS total
            FROM Consentimentos_LGPD
            GROUP BY tipo_consentimento, status
            ORDER BY tipo_consentimento, status
        """,
    },

    # --- Auditoria (sensível: só Admin/Gerente, mesma regra do CRUD) -----
    {
        "id": "logs_recentes",
        "titulo": "Log de acessos recentes",
        "descricao": "Últimas 200 ações registradas no sistema, com quem fez o quê.",
        "categoria": "Auditoria",
        "niveis": ("Admin", "Gerente"),
        "sql": """
            SELECT l.data_acesso, u.nome AS usuario_interno, l.tipo_operacao, l.id_cliente
            FROM Log_Acesso l
            LEFT JOIN Usuario_Interno u ON u.id_usuario_interno = l.id_usuario_interno
            ORDER BY l.data_acesso DESC
            LIMIT 200
        """,
    },
    {
        "id": "acoes_por_usuario",
        "titulo": "Ações por usuário interno",
        "descricao": "Quem fez mais o quê no sistema, segundo a trilha de auditoria.",
        "categoria": "Auditoria",
        "niveis": ("Admin", "Gerente"),
        "sql": """
            SELECT u.nome AS usuario_interno, l.tipo_operacao, COUNT(*) AS total
            FROM Log_Acesso l
            JOIN Usuario_Interno u ON u.id_usuario_interno = l.id_usuario_interno
            GROUP BY u.id_usuario_interno, u.nome, l.tipo_operacao
            ORDER BY total DESC
            LIMIT 50
        """,
    },
]

_POR_ID = {r["id"]: r for r in RELATORIOS}


def listar_para_nivel(nivel_acesso):
    """Metadados (sem o SQL) dos relatórios que esse nível de acesso pode ver."""
    return [
        {k: v for k, v in r.items() if k != "sql"}
        for r in RELATORIOS
        if nivel_acesso in r["niveis"]
    ]


def obter(id_relatorio, nivel_acesso):
    """Devolve o relatório (com SQL) se existir e esse nível puder vê-lo; senão None."""
    relatorio = _POR_ID.get(id_relatorio)
    if relatorio is None or nivel_acesso not in relatorio["niveis"]:
        return None
    return relatorio
