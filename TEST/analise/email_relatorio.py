"""
analise/email_relatorio.py — envia o relatório (CSVs tratados + gráficos PNG)
por e-mail para o supervisor, usando a API oficial do Gmail (OAuth 2.0).

Como funciona:
    1. Roda o pipeline de análise (se ainda não tiver rodado), gerando os
       arquivos em saida/dados_tratados/*.csv e saida/graficos/*.png
    2. Compacta tudo em um único .zip (mais simples de anexar e de abrir)
    3. Envia por e-mail via analise/gmail_api.py (login OAuth, sem senha)

Configuração necessária (uma vez só):
    - Ver o passo a passo completo no topo de analise/gmail_api.py
      (criar projeto no Google Cloud, ativar Gmail API, gerar
      credentials.json e colocar na pasta CRUD-ANALISE/)
    - Preencher no .env (copie o .env.example se ainda não tiver um):

        EMAIL_REMETENTE=matheus_schneider150@estudante.sesisenai.org.br
        EMAIL_DESTINATARIO=joao.valentim@edu.sc.senai.br

Na primeira vez que rodar, uma aba do navegador vai abrir pedindo login
e permissão — depois disso fica automático (usa o token.json salvo).
"""
import os
import zipfile
from datetime import datetime

from dotenv import load_dotenv

load_dotenv()

PASTA_GRAFICOS = os.path.join("saida", "graficos")
PASTA_CSVS = os.path.join("saida", "dados_tratados")
PASTA_ZIPS = os.path.join("saida", "email_enviados")


def _listar_arquivos(pasta, extensao):
    if not os.path.isdir(pasta):
        return []
    return [
        os.path.join(pasta, nome)
        for nome in sorted(os.listdir(pasta))
        if nome.lower().endswith(extensao)
    ]


def _compactar_relatorio():
    """Junta todos os CSVs tratados e PNGs de gráficos em um único .zip."""
    csvs = _listar_arquivos(PASTA_CSVS, ".csv")
    pngs = _listar_arquivos(PASTA_GRAFICOS, ".png")

    if not csvs and not pngs:
        return None, []

    os.makedirs(PASTA_ZIPS, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")
    caminho_zip = os.path.join(PASTA_ZIPS, f"relatorio_luxevoyage_{timestamp}.zip")

    with zipfile.ZipFile(caminho_zip, "w", zipfile.ZIP_DEFLATED) as zf:
        for arquivo in csvs + pngs:
            zf.write(arquivo, arcname=os.path.basename(arquivo))

    return caminho_zip, csvs + pngs


def enviar_relatorio_email(rodar_pipeline_antes=True):
    """
    Gera (opcional) e envia o relatório por e-mail.

    rodar_pipeline_antes: se True, roda o pipeline de análise antes de
    montar o e-mail, garantindo que os CSVs/PNGs estejam atualizados.
    """
    remetente = os.getenv("EMAIL_REMETENTE")
    destinatario = os.getenv("EMAIL_DESTINATARIO")

    faltando = [
        nome
        for nome, valor in [
            ("EMAIL_REMETENTE", remetente),
            ("EMAIL_DESTINATARIO", destinatario),
        ]
        if not valor
    ]
    if faltando:
        print("\n❌ Faltam variáveis no .env: " + ", ".join(faltando))
        print("   Preencha o .env (veja o .env.example) antes de tentar enviar.")
        return False

    if rodar_pipeline_antes:
        print("\n>>> Rodando o pipeline de análise antes de enviar o e-mail...")
        from main_analise import rodar_pipeline_completo
        rodar_pipeline_completo()

    print("\n>>> Compactando CSVs e gráficos em um .zip...")
    caminho_zip, arquivos_incluidos = _compactar_relatorio()

    if caminho_zip is None:
        print("❌ Nenhum CSV ou PNG encontrado em saida/. Rode a análise primeiro (opção 3).")
        return False

    print(f"   {len(arquivos_incluidos)} arquivo(s) incluído(s) em: {caminho_zip}")

    try:
        from analise import gmail_api
    except ImportError as e:
        print(f"❌ Faltam pacotes da Gmail API: {e}")
        print("   Rode: pip install -r requirements.txt")
        return False

    assunto = f"LuxeVoyage — Relatório de Análise ({datetime.now().strftime('%d/%m/%Y')})"
    corpo = (
        "Olá,\n\n"
        "Segue em anexo o relatório de análise de dados do LuxeVoyage "
        "(CSVs tratados + gráficos em PNG, compactados em .zip).\n\n"
        "Gerado automaticamente pelo sistema.\n"
    )

    print(f"\n>>> Enviando e-mail para {destinatario}...")
    try:
        id_mensagem = gmail_api.enviar_email(
            remetente=remetente,
            destinatario=destinatario,
            assunto=assunto,
            corpo=corpo,
            anexos=[caminho_zip],
        )
        print(f"✅ E-mail enviado com sucesso! ID: {id_mensagem}")
        return True
    except FileNotFoundError as e:
        print(f"❌ {e}")
        return False
    except Exception as e:
        print(f"❌ Erro ao enviar e-mail: {e}")
        return False


if __name__ == "__main__":
    enviar_relatorio_email()
