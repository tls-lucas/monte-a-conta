import io
import os
import re
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
NIVEIS = [1, 2, 3, 4, 5, 6]

# Modos sem divisão por nº de dígitos — vêm em resumo["porModo"].
MODOS = [
    ("dinheiro", "Fase de dinheiro"),
    ("contagem", "Fase de contagem"),
]


# Paleta de fallback: a mesma cara de sempre, usada quando o app não manda as
# cores (versões antigas do cliente ou chamada direta ao endpoint de PDF).
PALETA_PADRAO = {
    "escura": "#5b4636",
    "destaque": "#2f7ab8",
    "clara": "#fdf6ec",
    "borda": "#d8c7b3",
    "texto": "#5b4636",
}

HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


def formatar_tempo(segundos):
    if segundos is None:
        return "—"
    segundos = round(float(segundos))
    minutos, segundos = divmod(segundos, 60)
    return f"{minutos:02d}:{segundos:02d}"


def _canais(hex_cor):
    return tuple(int(hex_cor[i:i + 2], 16) for i in (1, 3, 5))


def _para_hex(r, g, b):
    limita = lambda v: max(0, min(255, int(round(v))))
    return f"#{limita(r):02x}{limita(g):02x}{limita(b):02x}"


def _luminancia(hex_cor):
    r, g, b = _canais(hex_cor)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255


def _misturar(hex_a, hex_b, t):
    ra, ga, ba = _canais(hex_a)
    rb, gb, bb = _canais(hex_b)
    return _para_hex(ra + (rb - ra) * t, ga + (gb - ga) * t, ba + (bb - ba) * t)


def _contraste(hex_fundo):
    """Preto ou branco, o que for legível sobre o fundo."""
    return colors.black if _luminancia(hex_fundo) > 0.6 else colors.white


def _escurecer_para_texto(hex_cor, alvo=0.45):
    """Puxa a cor para o escuro até ela sustentar leitura sobre fundo claro."""
    proporcao = 0.0
    resultado = hex_cor
    while _luminancia(resultado) > alvo and proporcao < 0.9:
        proporcao += 0.1
        resultado = _misturar(hex_cor, "#000000", proporcao)
    return resultado


def montar_paleta(cores):
    """
    Deriva as cores do relatório a partir do esquema escolhido no app
    ({numero, operador, igual}). O tom do número vira a cor de cabeçalho, o do
    operador vira o destaque dos números, e o do igual, bem clareado, vira o
    fundo das linhas alternadas.
    """
    if not isinstance(cores, dict):
        return dict(PALETA_PADRAO)

    def valida(chave):
        valor = cores.get(chave)
        return valor if isinstance(valor, str) and HEX.match(valor) else None

    numero, operador, igual = valida("numero"), valida("operador"), valida("igual")
    if not numero:
        return dict(PALETA_PADRAO)

    operador = operador or numero
    igual = igual or numero
    # cabeçalho sempre com corpo suficiente pra sustentar texto claro
    escura = numero if _luminancia(numero) < 0.62 else _misturar(numero, "#000000", 0.35)
    return {
        "escura": escura,
        # o destaque é usado como texto sobre fundo claro, então precisa de peso
        "destaque": _escurecer_para_texto(operador),
        "clara": _misturar(igual, "#ffffff", 0.88),
        "borda": _misturar(igual, "#ffffff", 0.55),
        "texto": _misturar(escura, "#000000", 0.15),
    }


def gerar_pdf(resumo, cores=None):
    paleta = montar_paleta(cores)
    cor_escura = colors.HexColor(paleta["escura"])
    cor_destaque = colors.HexColor(paleta["destaque"])
    cor_clara = colors.HexColor(paleta["clara"])
    cor_borda = colors.HexColor(paleta["borda"])
    cor_texto = colors.HexColor(paleta["texto"])
    cor_sobre_escura = _contraste(paleta["escura"])
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
        textColor=cor_texto,
        spaceAfter=8,
    )
    subtitulo = ParagraphStyle(
        "SubtituloMonteConta",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor(_misturar(paleta["texto"], "#ffffff", 0.45)),
        spaceAfter=16,
    )
    secao = ParagraphStyle(
        "SecaoMonteConta",
        parent=styles["Heading2"],
        fontSize=14,
        textColor=cor_texto,
        spaceBefore=10,
        spaceAfter=8,
    )

    por_operacao = resumo.get("porOperacao", {}) if isinstance(resumo, dict) else {}
    por_categoria = resumo.get("porCategoria", {}) if isinstance(resumo, dict) else {}
    por_modo = resumo.get("porModo", {}) if isinstance(resumo, dict) else {}

    def quantidade_de(dados):
        return int((dados or {}).get("quantidade", 0) or 0)

    def media_de(dados):
        return float((dados or {}).get("media", 0) or 0)

    # As fases de dinheiro e de contagem são contabilizadas à parte: elas medem
    # outra habilidade e entrariam distorcendo a média das contas.
    total_contas = sum(quantidade_de(por_operacao.get(op)) for op, _, _ in OPERACOES)
    soma_contas = sum(
        media_de(por_operacao.get(op)) * quantidade_de(por_operacao.get(op)) for op, _, _ in OPERACOES
    )
    media_contas = soma_contas / total_contas if total_contas else None

    total_modos = sum(quantidade_de(por_modo.get(chave)) for chave, _ in MODOS)

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
            ["Contas concluídas", str(total_contas)],
            ["Média das contas", formatar_tempo(media_contas)],
            ["Fases de dinheiro e contagem", str(total_modos)],
        ],
        colWidths=[10 * cm, 7 * cm],
    )
    resumo_tabela.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), cor_escura),
        ("TEXTCOLOR", (0, 0), (-1, 0), cor_sobre_escura),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.5, cor_borda),
        ("BACKGROUND", (0, 1), (-1, -1), cor_clara),
        ("TEXTCOLOR", (0, 1), (-1, -1), cor_texto),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    elementos.extend([resumo_tabela, Spacer(1, 12)])

    elementos.append(Paragraph("Desempenho por operação", secao))
    tabela = [["Operação", "Média", "Total"] + [f"{n} díg." for n in NIVEIS]]

    for chave, simbolo, rotulo in OPERACOES:
        geral = por_operacao.get(chave, {}) or {}
        categorias = por_categoria.get(chave, {}) or {}
        linha = [
            f"{simbolo} {rotulo}",
            formatar_tempo(geral.get("media")),
            str(quantidade_de(geral)),
        ]
        for nivel in NIVEIS:
            cat = categorias.get(str(nivel), categorias.get(nivel, {})) or {}
            linha.append(f"{formatar_tempo(cat.get('media'))} ({quantidade_de(cat)}x)")
        tabela.append(linha)

    tabela_pdf = Table(tabela, colWidths=[2.9 * cm, 1.8 * cm, 1.2 * cm] + [1.85 * cm] * len(NIVEIS), repeatRows=1)
    tabela_pdf.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), cor_escura),
        ("TEXTCOLOR", (0, 0), (-1, 0), cor_sobre_escura),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 7.5),
        ("GRID", (0, 0), (-1, -1), 0.4, cor_borda),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, cor_clara]),
        ("TEXTCOLOR", (0, 1), (-1, -1), cor_texto),
        ("TEXTCOLOR", (1, 1), (1, -1), cor_destaque),
        ("FONTNAME", (1, 1), (1, -1), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 1), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elementos.append(tabela_pdf)
    elementos.append(Spacer(1, 14))

    elementos.append(Paragraph("Fases sem níveis de dígitos", secao))
    tabela_modos = [["Modo", "Média", "Fases concluídas"]]
    for chave, rotulo in MODOS:
        dados = por_modo.get(chave, {}) or {}
        tabela_modos.append([rotulo, formatar_tempo(dados.get("media")), str(quantidade_de(dados))])

    tabela_modos_pdf = Table(tabela_modos, colWidths=[8 * cm, 4.5 * cm, 4.5 * cm], repeatRows=1)
    tabela_modos_pdf.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), cor_escura),
        ("TEXTCOLOR", (0, 0), (-1, 0), cor_sobre_escura),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("GRID", (0, 0), (-1, -1), 0.4, cor_borda),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, cor_clara]),
        ("TEXTCOLOR", (0, 1), (-1, -1), cor_texto),
        ("TEXTCOLOR", (1, 1), (1, -1), cor_destaque),
        ("FONTNAME", (1, 1), (1, -1), "Helvetica-Bold"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (1, 1), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elementos.append(tabela_modos_pdf)
    elementos.append(Spacer(1, 14))

    elementos.append(Paragraph(
        "Os tempos são apresentados como médias por operação e nível de dígitos, usando os dados persistidos localmente pelo jogo. "
        "As fases de dinheiro e de contagem têm médias próprias e não entram no cálculo da média das contas, por medirem outra habilidade.",
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
    pdf = gerar_pdf(dados.get("resumo", {}), dados.get("cores"))
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

    pdf = gerar_pdf(resumo, dados.get("cores"))
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
