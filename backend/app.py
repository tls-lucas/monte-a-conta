import io
import os
import tempfile
from datetime import datetime

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
import yagmail

load_dotenv()

app = Flask(__name__)
CORS(app)

OPERACOES = [
    ("soma", "+", "Soma"),
    ("subtracao", "−", "Subtração"),
    ("multiplicacao", "×", "Multiplicação"),
    ("divisao", "÷", "Divisão"),
]
NIVEIS = [1, 2, 3, 4]


def formatar_tempo(segundos):
    if segundos is None:
        return "—"
    segundos = round(float(segundos))
    minutos, segundos = divmod(segundos, 60)
    return f"{minutos:02d}:{segundos:02d}"


def gerar_pdf(resumo):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
        title="Relatório de Desempenho - Monte a Conta",
    )

    styles = getSampleStyleSheet()
    titulo = ParagraphStyle(
        "TituloMonteConta",
        parent=styles["Title"],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#5b4636"),
        spaceAfter=8,
    )
    subtitulo = ParagraphStyle(
        "SubtituloMonteConta",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#8a7a66"),
        spaceAfter=16,
    )
    secao = ParagraphStyle(
        "SecaoMonteConta",
        parent=styles["Heading2"],
        fontSize=14,
        textColor=colors.HexColor("#5b4636"),
        spaceBefore=10,
        spaceAfter=8,
    )

    por_operacao = resumo.get("porOperacao", {}) if isinstance(resumo, dict) else {}
    por_categoria = resumo.get("porCategoria", {}) if isinstance(resumo, dict) else {}

    total = sum(int(por_operacao.get(op, {}).get("quantidade", 0) or 0) for op, _, _ in OPERACOES)
    soma_tempos = sum(
        float(por_operacao.get(op, {}).get("media", 0) or 0)
        * int(por_operacao.get(op, {}).get("quantidade", 0) or 0)
        for op, _, _ in OPERACOES
    )
    media_geral = soma_tempos / total if total else None

    elementos = [
        Paragraph("Monte a Conta", titulo),
        Paragraph(
            f"Relatório de desempenho • Gerado em {datetime.now().strftime('%d/%m/%Y às %H:%M:%S')}",
            subtitulo,
        ),
        Paragraph("Resumo geral", secao),
    ]

    resumo_tabela = Table(
        [
            ["Indicador", "Resultado"],
            ["Total de fases concluídas", str(total)],
            ["Média geral", formatar_tempo(media_geral)],
        ],
        colWidths=[10 * cm, 7 * cm],
    )
    resumo_tabela.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#5b4636")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d8c7b3")),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#fdf6ec")),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    elementos.extend([resumo_tabela, Spacer(1, 12)])

    elementos.append(Paragraph("Desempenho por operação", secao))
    tabela = [["Operação", "Média geral", "Total", "1 díg.", "2 díg.", "3 díg.", "4 díg."]]

    for chave, simbolo, rotulo in OPERACOES:
        geral = por_operacao.get(chave, {}) or {}
        categorias = por_categoria.get(chave, {}) or {}
        linha = [
            f"{simbolo} {rotulo}",
            formatar_tempo(geral.get("media")),
            str(int(geral.get("quantidade", 0) or 0)),
        ]
        for nivel in NIVEIS:
            cat = categorias.get(str(nivel), categorias.get(nivel, {})) or {}
            linha.append(f"{formatar_tempo(cat.get('media'))} ({int(cat.get('quantidade', 0) or 0)}x)")
        tabela.append(linha)

    tabela_pdf = Table(tabela, colWidths=[3.2 * cm, 2.3 * cm, 1.5 * cm, 2.1 * cm, 2.1 * cm, 2.1 * cm, 2.1 * cm], repeatRows=1)
    tabela_pdf.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#5b4636")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d8c7b3")),
        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fdf6ec")]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 1), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elementos.append(tabela_pdf)
    elementos.append(Spacer(1, 14))
    elementos.append(Paragraph(
        "Os tempos são apresentados como médias por operação e nível de dígitos, usando os dados persistidos localmente pelo jogo.",
        styles["Normal"],
    ))

    doc.build(elementos)
    buffer.seek(0)
    return buffer


@app.get("/")
def inicio():
    return jsonify({
        "ok": True,
        "servico": "Monte a Conta - Relatórios",
        "mensagem": "Servidor de relatórios ativo. A interface do jogo continua sendo o App.js do Expo.",
        "rotas": ["GET /health", "POST /relatorios/pdf", "POST /relatorios/email"],
    })


@app.get("/health")
def health():
    return jsonify({"ok": True})


@app.post("/relatorios/pdf")
def relatorio_pdf():
    dados = request.get_json(silent=True) or {}
    pdf = gerar_pdf(dados.get("resumo", {}))
    return send_file(
        pdf,
        mimetype="application/pdf",
        as_attachment=True,
        download_name="relatorio-monte-a-conta.pdf",
    )


@app.post("/relatorios/email")
def relatorio_email():
    dados = request.get_json(silent=True) or {}
    email = str(dados.get("email", "")).strip()
    resumo = dados.get("resumo", {})

    if not email or "@" not in email:
        return jsonify({"ok": False, "erro": "Informe um endereço de e-mail válido."}), 400

    usuario = os.getenv("GMAIL_USER", "").strip()
    senha_app = os.getenv("GMAIL_APP_PASSWORD", "").strip()
    if not usuario or not senha_app:
        return jsonify({
            "ok": False,
            "erro": "GMAIL_USER e GMAIL_APP_PASSWORD não estão configurados no backend/.env.",
        }), 500

    pdf = gerar_pdf(resumo)
    caminho = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as arquivo:
            arquivo.write(pdf.getvalue())
            caminho = arquivo.name

        with yagmail.SMTP(usuario, senha_app) as cliente:
            cliente.send(
                to=email,
                subject="Relatório de desempenho - Monte a Conta",
                contents=(
                    "Olá!\n\n"
                    "Segue em anexo o relatório de desempenho do jogo Monte a Conta.\n\n"
                    "Este e-mail foi enviado automaticamente pelo sistema."
                ),
                attachments=caminho,
            )

        return jsonify({"ok": True, "mensagem": "Relatório enviado com sucesso."})
    except Exception as exc:
        app.logger.exception("Erro ao enviar relatório")
        return jsonify({"ok": False, "erro": f"Não foi possível enviar o relatório: {exc}"}), 500
    finally:
        if caminho and os.path.exists(caminho):
            os.remove(caminho)


if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "5000"))
    print(f"Servidor de relatórios ativo em http://localhost:{port}")
    print("A interface principal continua sendo o App.js do Expo.")
    app.run(host=host, port=port, debug=False)
