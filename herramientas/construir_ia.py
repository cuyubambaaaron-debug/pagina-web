#!/usr/bin/env python3
"""Construye la sección IA de psychesai.com a partir de ia/datos y ia/proyectos.

  python3 herramientas/construir_ia.py

Genera ia/prompts.html, ia/programas.html, ia/codigo/*.html y ia/descargas/*.zip.
Antes de publicar un proyecto lo pasa por el escáner: si encuentra un secreto,
datos privados, un archivo no permitido o algo que la etiqueta de seguridad no
declara, se detiene y no genera nada.
"""
import hashlib, html, io, json, re, sys, zipfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
IA = RAIZ / "ia"
sys.path.insert(0, str(IA / "proyectos" / "auditor-de-secretos"))
import revisar_secretos as auditor  # el mismo escáner que se publica

from pygments.lexers import get_lexer_for_filename, TextLexer
from pygments.token import Token

e = lambda s: html.escape(str(s), quote=True)

# ---------------------------------------------------------------- utilidades
def huella(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def ver(p):
    return huella(p)[:10]

def tam(n):
    return f"{n} B" if n < 1024 else f"{n/1024:.1f} KB"

LICENCIA = """MIT License

Copyright (c) 2026 PsychesAi (psychesai.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""

# ---------------------------------------------------------------- el escáner
PERMITIDAS = {".py", ".js", ".html", ".css", ".json", ".md", ".txt", ""}
CODIGO = {".py", ".js", ".html", ".css"}
MAX_ARCHIVO = 200_000
PRIVADO = [
    ("IP de un servidor", re.compile(r"\b(?!127\.0\.0\.1\b)(?!0\.0\.0\.0\b)(?:\d{1,3}\.){3}\d{1,3}\b")),
    ("Correo personal", re.compile(r"[\w.+-]+@(?!psychesai\.com\b)[\w-]+\.[\w.]+")),
    ("Ruta de un equipo", re.compile(r"(?:/home/|/root/|[A-Z]:\\Users\\)")),
]
RED = re.compile(r"\b(?:urllib\.request|http\.client|requests|socket|aiohttp|httpx)\b|\bfetch\(|XMLHttpRequest|WebSocket|navigator\.sendBeacon")
EJECUTA = re.compile(r"\b(?:subprocess|os\.system|os\.popen|eval\(|exec\(|child_process|ctypes)\b")
DOMINIO = re.compile(r"(?:https?|wss?)://([A-Za-z0-9.-]+)")
VARIABLE = re.compile(r"os\.environ(?:\.get)?[\[(]\s*[\"']([A-Z0-9_]+)|os\.getenv\(\s*[\"']([A-Z0-9_]+)|process\.env\.([A-Z0-9_]+)")
IMPORT = re.compile(r"^\s*(?:from\s+([A-Za-z_][\w]*)|import\s+([A-Za-z_][\w]*))", re.M)

class Rechazo(Exception):
    pass

def escanear(carpeta, meta):
    """Devuelve la etiqueta de seguridad calculada. Lanza Rechazo si algo no cuadra."""
    reales = sorted(p.name for p in carpeta.iterdir() if p.is_file() and p.name != "meta.json")
    if sorted(meta["archivos"]) != reales:
        raise Rechazo(f"{carpeta.name}: meta.json lista {sorted(meta['archivos'])} pero hay {reales}")
    for h in auditor.revisar(carpeta):
        raise Rechazo(f"{carpeta.name}: posible secreto en {h[0].name}:{h[1]} ({h[2]})")
    dominios, variables, deps, ejecuta, js, red = set(), set(), set(), False, 0, False
    locales = {Path(n).stem for n in reales}
    for nombre in reales:
        p = carpeta / nombre
        ext = p.suffix.lower()
        if ext not in PERMITIDAS:
            raise Rechazo(f"{nombre}: tipo de archivo no permitido ({ext})")
        datos = p.read_bytes()
        if len(datos) > MAX_ARCHIVO or b"\x00" in datos:
            raise Rechazo(f"{nombre}: binario o demasiado grande")
        texto = datos.decode("utf-8")
        for que, rx in PRIVADO:
            m = rx.search(texto)
            if m:
                raise Rechazo(f"{nombre}: {que} ({m.group(0)[:20]})")
        if ext not in CODIGO:
            continue
        dominios |= set(DOMINIO.findall(texto))
        variables |= {a or b or c for a, b, c in VARIABLE.findall(texto)}
        red |= bool(RED.search(texto))
        ejecuta |= bool(EJECUTA.search(texto))
        if ext == ".js":
            js += 1
        if ext == ".html":
            js += len(re.findall(r"<script\b", texto, re.I))
        if ext == ".py":
            for a, b in IMPORT.findall(texto):
                mod = a or b
                if mod not in sys.stdlib_module_names and mod not in locales and mod != "__future__":
                    deps.add(mod)
    d = meta["declara"]
    if red and not dominios:
        raise Rechazo(f"{carpeta.name}: usa la red pero no se sabe a dónde")
    if sorted(dominios) != sorted(d["internet"]):
        raise Rechazo(f"{carpeta.name}: se conecta a {sorted(dominios)} y declara {d['internet']}")
    if sorted(variables) != sorted(d["variables"]):
        raise Rechazo(f"{carpeta.name}: lee las variables {sorted(variables)} y declara {d['variables']}")
    if ejecuta:
        raise Rechazo(f"{carpeta.name}: ejecuta comandos del sistema; no se publica")
    return {"dominios": sorted(dominios), "variables": sorted(variables), "deps": sorted(deps), "js": js,
            "lee": d["lee"], "escribe": d["escribe"], "n": len(reales)}

def empaquetar(carpeta, meta, destino):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for nombre in sorted(meta["archivos"]):
            info = zipfile.ZipInfo(f"{carpeta.name}/{nombre}", date_time=(2026, 1, 1, 0, 0, 0))
            info.external_attr = 0o644 << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, (carpeta / nombre).read_bytes())
    destino.write_bytes(buf.getvalue())
    return hashlib.sha256(buf.getvalue()).hexdigest(), len(buf.getvalue())

# ---------------------------------------------------------------- resaltado y markdown
def clase(t):
    if t in Token.Comment: return "c"
    if t in Token.Literal.String: return "s"
    if t in Token.Literal.Number: return "m"
    if t in Token.Keyword: return "k"
    if t in Token.Name.Tag: return "t"
    if t in Token.Name.Attribute: return "a"
    if t in Token.Name.Function or t in Token.Name.Class: return "f"
    if t in Token.Name.Builtin: return "b"
    if t in Token.Operator or t in Token.Punctuation: return "o"
    if t in Token.Name.Property or t in Token.Name.Variable: return "p"
    return ""

def resaltar(nombre, texto):
    try:
        lexer = get_lexer_for_filename(nombre, stripnl=False, ensurenl=False)
    except Exception:
        lexer = TextLexer(stripnl=False, ensurenl=False)
    lineas, actual = [], []
    for t, v in lexer.get_tokens(texto):
        c = clase(t)
        trozos = v.split("\n")
        for i, trozo in enumerate(trozos):
            if i:
                lineas.append("".join(actual)); actual = []
            if trozo:
                actual.append(f'<span class="{c}">{e(trozo)}</span>' if c else e(trozo))
    lineas.append("".join(actual))
    if lineas and lineas[-1] == "" and texto.endswith("\n"):
        lineas.pop()
    return "\n".join(f'<span class="l">{l}</span>' for l in lineas)

def en_linea(s):
    s = e(s)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+)\)", r'<a href="\2" rel="noopener noreferrer nofollow">\1</a>', s)
    return s

def markdown(md):
    out, lista, cod, buf = [], None, False, []
    def cerrar():
        nonlocal lista
        if lista: out.append(f"</{lista}>"); lista = None
    for linea in md.split("\n"):
        if linea.startswith("```"):
            if cod:
                out.append("<pre><code>" + e("\n".join(buf)) + "</code></pre>"); buf = []; cod = False
            else:
                cerrar(); cod = True
            continue
        if cod:
            buf.append(linea); continue
        m = re.match(r"(#{1,3}) (.*)", linea)
        if m:
            cerrar(); n = len(m.group(1)); out.append(f"<h{n}>{en_linea(m.group(2))}</h{n}>"); continue
        m = re.match(r"(\d+)\. (.*)", linea) or re.match(r"- (.*)", linea)
        if m:
            tipo = "ol" if linea[0].isdigit() else "ul"
            if lista != tipo:
                cerrar(); lista = tipo
                out.append(f'<ol start="{m.group(1)}">' if tipo == "ol" else "<ul>")
            out.append(f"<li>{en_linea(m.groups()[-1])}</li>"); continue
        cerrar()
        if linea.strip():
            out.append(f"<p>{en_linea(linea)}</p>")
    cerrar()
    return "\n".join(out)

# ---------------------------------------------------------------- plantilla común
V_INICIO = ver(RAIZ / "inicio.css")
V_IA = ver(IA / "ia.css")
V_JS = ver(IA / "ia.js")
CSP = ("default-src 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; "
       "font-src https://fonts.gstatic.com; img-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'")

def pagina(R, titulo, descripcion, canonica, actual, cuerpo, conteos, estricta=False, estilos_en_linea=False):
    tabs = []
    for clave, nombre, href in [("prompts", "Trucos y prompts", "ia/prompts.html"),
                                ("codigo", "Códigos y proyectos", "ia/codigo/"),
                                ("programas", "Programas recomendados", "ia/programas.html")]:
        cur = ' aria-current="page"' if clave == actual else ""
        tabs.append(f'<a href="{R}{href}"{cur}>{nombre}<small>{conteos[clave]}</small></a>')
    tabs.append('<a href="' + R + '#tutoriales">Tutoriales<small>pronto</small></a>')
    meta_csp = f'<meta http-equiv="Content-Security-Policy" content="{CSP}">\n' if estricta else ""
    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
{meta_csp}<title>{e(titulo)} — PsychesAi</title>
<meta name="description" content="{e(descripcion)}">
<link rel="canonical" href="https://psychesai.com/{canonica}">
<link rel="icon" href="{R}favicon.svg" type="image/svg+xml" sizes="any">
<meta name="theme-color" content="#0a0a0f">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta property="og:title" content="{e(titulo)} — PsychesAi">
<meta property="og:description" content="{e(descripcion)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200;12..96,400;12..96,600;12..96,800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{R}inicio.css?v={V_INICIO}">
<link rel="stylesheet" href="{R}ia/ia.css?v={V_IA}">
</head>
<body>
<header class="top">
  <a class="brand" href="{R}">Psyches<span>Ai</span></a>
  <button class="menu" type="button" aria-expanded="false" aria-controls="nav">Menú</button>
  <nav id="nav">
    <a href="{R}#ia">IA</a><a href="{R}#curiosidades">Curiosidades</a><a href="{R}#historias">Historias</a><a href="{R}#mapas">Mapas</a><a href="{R}#poemas">Poemas</a><a href="{R}#opinion">Opinión</a><a class="cta" href="{R}#apps">Apps</a>
  </nav>
</header>
<main>
{cuerpo[0]}
<nav class="ia-tabs" aria-label="Secciones de IA">{"".join(tabs)}</nav>
<div class="ia-main">
{cuerpo[1]}
</div>
</main>
<footer class="foot">
  <a class="brand" href="{R}">Psyches<span>Ai</span></a>
  <nav><a href="{R}#ia">IA</a><a href="{R}#curiosidades">Curiosidades</a><a href="{R}#historias">Historias</a><a href="{R}#mapas">Mapas</a><a href="{R}#poemas">Poemas</a><a href="{R}#opinion">Opinión</a></nav>
  <span>© 2026 · <a href="mailto:hola@psychesai.com">hola@psychesai.com</a></span>
</footer>
<script src="{R}ia/ia.js?v={V_JS}" defer></script>
</body>
</html>
"""

def hero(R, migas, h1a, h1b, lede):
    return f"""<section class="ia-hero">
  <p class="mono"><a href="{R}#ia">Contenido IA</a> · {e(migas)}</p>
  <h1>{e(h1a)} <span class="thin">{e(h1b)}</span></h1>
  <p class="lede">{lede}</p>
</section>"""

# ---------------------------------------------------------------- páginas
def con_huecos(p):
    return re.sub(r"\[([^\]]+)\]", lambda m: f"<mark>[{m.group(1)}]</mark>", e(p))

def construir_prompts(datos, conteos):
    R = "../"
    cats = datos["categorias"]
    todos = [p for g in datos["grupos"] for p in g["prompts"]]
    cuenta = {c: sum(p["c"] == c for p in todos) for c in cats}
    filtros = [f'<button type="button" data-c="todos" aria-pressed="true">Todos<span>{len(todos)}</span></button>']
    filtros += [f'<button type="button" data-c="{c}" aria-pressed="false">{e(n)}<span>{cuenta[c]}</span></button>' for c, n in cats.items() if cuenta[c]]
    bloques, n = [], 0
    for g in datos["grupos"]:
        cab = (f'<img src="{R}assets/canales/{g["imagen"]}" alt="Fotograma del vídeo «{e(g["titulo"])}»" loading="lazy">'
               if g.get("imagen") else '<span class="sinimg" aria-hidden="true">✦</span>')
        cartas = []
        for p in g["prompts"]:
            n += 1
            truco = f'<p class="pr-truco">{e(p["truco"])}</p>' if p.get("truco") else ""
            cartas.append(f"""<article class="pr" data-c="{p['c']}" id="p{n}">
  <div class="pr-h"><b>{e(p['t'])}</b><i>{e(cats[p['c']])}</i></div>
  <div class="pr-caja"><p class="pr-texto" id="t{n}">{con_huecos(p['p'])}</p></div>
  {truco}
  <button class="copiar" type="button" data-copiar="#t{n}">Copiar prompt</button>
</article>""")
        bloques.append(f"""<section class="grupo" id="{g['id']}">
  <div class="grupo-h">{cab}<div><h2>{e(g['titulo'])}</h2><p>{e(g['sub'])}</p></div></div>
  <div class="prs">{''.join(cartas)}</div>
</section>""")
    cuerpo = (hero(R, "Trucos y prompts", "Trucos y", "prompts",
                   f"Los {len(todos)} prompts de nuestros vídeos, completos. Toca <b>Copiar</b>, pégalo en ChatGPT, Claude o Gemini y cambia lo que está en <span class=\"pr-texto\"><mark>[amarillo]</mark></span> por lo tuyo."),
              f'<div class="filtros" role="group" aria-label="Filtrar por tema">{"".join(filtros)}</div>\n' + "\n".join(bloques) +
              '\n<p class="aviso-ia"><b>Antes de pegar nada:</b> no metas contraseñas, números de tarjeta ni tu DNI en un chat de IA. Para contratos y cartas, tapa los datos personales; la IA no los necesita para ayudarte.</p>')
    (IA / "prompts.html").write_text(pagina(R, "Trucos y prompts", f"Los {len(todos)} prompts de los vídeos de @rainy.ia, listos para copiar: trabajo, dinero, trámites, aprender y para reírte.",
                                            "ia/prompts", "prompts", cuerpo, conteos), encoding="utf-8")

def construir_programas(datos, conteos):
    R = "../"
    bloques = []
    for v in datos["videos"]:
        filas = []
        for i, h in enumerate(v["herramientas"], 1):
            filas.append(f"""<li class="herr">
  <span class="herr-n">{i}</span>
  <img class="herr-logo" src="{R}assets/logos/{h['logo']}" alt="Logo de {e(h['n'])}" width="64" height="64" loading="lazy">
  <div class="herr-t">
    <h3>{e(h['n'])} <span>{e(h['para'])} · gratis</span></h3>
    <p>{e(h['d'])}</p>
    <p class="ojo">{e(h['ojo'])}</p>
  </div>
  <a class="herr-ir" href="{e(h['u'])}" target="_blank" rel="noopener noreferrer nofollow">Abrir ↗</a>
</li>""")
        bloques.append(f"""<section class="vid vid-{v['tema']}" id="{v['id']}">
  <div class="vid-h">
    <img src="{R}assets/canales/{v['imagen']}" alt="Fotograma del vídeo «{e(v['titulo'])}»" loading="lazy">
    <div><p class="vid-de">Del vídeo</p><h2>{e(v['titulo'])}</h2><p class="vid-sub">{e(v['sub'])}</p></div>
  </div>
  <ol class="herrs">{''.join(filas)}</ol>
</section>""")
    rk = datos["ranking"]
    rfilas = []
    for cat, modelo, empresa, logos in rk["filas"]:
        imgs = "".join(f'<img src="{R}assets/logos/{l}" alt="" width="36" height="36" loading="lazy">' for l in logos)
        rfilas.append(f'<div class="rank-f"><span>{e(cat)}</span><div class="rank-m"><span class="rank-logos">{imgs}</span><b>{e(modelo)}</b></div><em>{e(empresa)}</em></div>')
    cuerpo = (hero(R, "Programas recomendados", "Programas", "recomendados",
                   "Lo que recomendamos en cada vídeo, agrupado por el vídeo del que vienes. Con lo bueno y lo que hay que saber."),
              f"""{''.join(bloques)}
<section class="vid vid-arena" id="ranking">
  <div class="vid-h solo"><div><p class="vid-de">{e(rk['fecha'])}</p><h2>{e(rk['titulo'])}</h2><p class="vid-sub">{e(rk['sub'])}</p></div></div>
  <div class="rank">{''.join(rfilas)}</div>
  <p class="fuente">Fuente: <a href="{e(rk['fuente_url'])}" target="_blank" rel="noopener noreferrer nofollow">{e(rk['fuente'])}</a>. Cambia cada mes.</p>
</section>""")
    (IA / "programas.html").write_text(pagina(R, "Programas recomendados", "Las IAs que recomendamos en cada vídeo de @rainy.ia, agrupadas por vídeo, y el ranking de la mejor IA para cada cosa.",
                                              "ia/programas", "programas", cuerpo, conteos), encoding="utf-8")


MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
COLOR_LANG = {".py": ("Python", "#3572A5"), ".html": ("HTML", "#e34c26"), ".css": ("CSS", "#663399"),
              ".js": ("JavaScript", "#f1e05a"), ".md": ("Markdown", "#5b6274"), ".txt": ("Texto", "#8b949e"), "": ("Otros", "#8b949e")}

def fecha_corta(f):
    a, m, d = f.split("-")
    return f"{int(d)} {MESES[int(m) - 1]} {a}"

def informe(slug, et, hz, n):
    """La salida del escáner, tal cual, en texto plano."""
    filas = [
        ("archivos", f"{n} (solo texto)"),
        ("secretos", "0"),
        ("datos privados", "0"),
        ("conexiones", ", ".join(et["dominios"]) or "ninguna"),
        ("variables", ", ".join(et["variables"]) or "ninguna"),
        ("lee", et["lee"].lower()),
        ("escribe", et["escribe"].lower()),
        ("dependencias", str(len(et["deps"]))),
        ("javascript", str(et["js"])),
        ("comandos", "no"),
    ]
    cuerpo = "\n".join(f'<span class="d">{e(k):<15}</span>{e(v)}' for k, v in filas)
    return (f'<pre class="term"><span class="d">$</span> revisar {e(slug)}\n{cuerpo}\n'
            f'<span class="d">{"sha256(zip)":<15}</span>{hz}\n<span class="okk">APROBADO</span></pre>')

def barra_lenguajes(carpeta, archivos):
    por = {}
    for a in archivos:
        ext = Path(a).suffix.lower()
        if a == "LICENSE":
            continue
        por[ext] = por.get(ext, 0) + (carpeta / a).stat().st_size
    total = sum(por.values()) or 1
    orden = sorted(por.items(), key=lambda x: -x[1])
    x, rects, leyenda = 0.0, [], []
    for ext, b in orden:
        nombre, color = COLOR_LANG.get(ext, COLOR_LANG[""])
        w = 100 * b / total
        rects.append(f'<rect x="{x:.2f}" y="0" width="{w:.2f}" height="8" fill="{color}"/>')
        leyenda.append(f'<li><svg width="8" height="8" aria-hidden="true"><circle cx="4" cy="4" r="4" fill="{color}"/></svg><b>{nombre}</b> {w:.1f} %</li>')
        x += w
    return (f'<svg class="langbar" viewBox="0 0 100 8" preserveAspectRatio="none" role="img" aria-label="Lenguajes">{"".join(rects)}</svg>'
            f'<ul class="leyenda">{"".join(leyenda)}</ul>')

def cabecera_sobria(R, ruta_html, lede):
    return f"""<section class="gh-hero">
  <p class="mono"><a href="{R}#ia">Contenido IA</a> / <a href="{R}ia/codigo/">Códigos y proyectos</a></p>
  <h1>{ruta_html}</h1>
  <p>{lede}</p>
</section>"""

def construir_codigo(proyectos, conteos):
    R = "../../"
    (IA / "codigo").mkdir(exist_ok=True)
    desc = IA / "descargas"; desc.mkdir(exist_ok=True)
    sumas, filas, log = [], [], []
    for carpeta, meta, et in proyectos:
        slug = carpeta.name
        nzip = f"{slug}-{meta['version']}.zip"
        hz, pz = empaquetar(carpeta, meta, desc / nzip)
        sumas.append(f"{hz}  {nzip}")
        log.append(f"ok  {slug:<22} internet={(','.join(et['dominios']) or 'no'):<16} variables={(','.join(et['variables']) or 'no'):<16} deps={len(et['deps'])}")
        lista, vistas = [], []
        readme = (carpeta / "README.md").read_text(encoding="utf-8")
        vistas.append(f'<section id="readme" class="gh-box"><div class="gh-bar"><span>README.md</span></div><div class="md">{markdown(readme)}</div></section>')
        for nombre in meta["archivos"]:
            datos = (carpeta / nombre).read_bytes()
            texto = datos.decode("utf-8")
            fid = "f-" + re.sub(r"[^a-z0-9]+", "-", nombre.lower())
            lineas = texto.count("\n") + (0 if texto.endswith("\n") else 1)
            lista.append(f'<a href="#{fid}"><span class="fi" aria-hidden="true"></span><span class="fn">{e(nombre)}</span>'
                         f'<span class="fc">v{e(meta["version"])}</span><span class="fs">{tam(len(datos))}</span></a>')
            vistas.append(f"""<section id="{fid}" class="gh-box">
  <div class="gh-bar"><span><a href="#readme">{e(slug)}</a> / <b>{e(nombre)}</b></span><span>{lineas} líneas · {tam(len(datos))} <button class="copiar chico" type="button" data-copiar="#c-{fid}">Copiar</button></span></div>
  <pre class="cod"><code id="c-{fid}">{resaltar(nombre, texto)}</code></pre>
  <div class="gh-bar pie"><span>sha256 {huella(carpeta / nombre)}</span></div>
</section>""")
        cuerpo = (cabecera_sobria(R, f'<span class="due">psychesai</span> / <b>{e(slug)}</b> <span class="lbl">Público</span>', e(meta["resumen"])),
                  f"""<div class="gh-lay">
  <div class="gh-col">
    <div class="gh-box">
      <div class="gh-bar"><span><b>PsychesAi</b> publicó la versión {e(meta['version'])}</span><span>{fecha_corta(meta['fecha'])} · {len(meta['archivos'])} archivos</span></div>
      <div class="gh-files">{''.join(lista)}</div>
    </div>
    <div class="vistas">{''.join(vistas)}</div>
  </div>
  <aside class="gh-side">
    <h2>Acerca de</h2>
    <p>{e(meta['resumen'])}</p>
    <p class="gh-dato">Licencia {e(meta['licencia'])} · v{e(meta['version'])}</p>
    <a class="gh-zip" href="../descargas/{nzip}" download>Descargar ZIP <span>{tam(pz)}</span></a>
    <h2 id="seguridad">Seguridad</h2>
    <p>Esto es lo que encontró el escáner antes de publicarlo. Si algo no cuadrara, esta página no existiría.</p>
    {informe(slug, et, hz, len(meta['archivos']))}
    <details class="gh-verif"><summary>Comprobar que tu descarga es la misma</summary>
      <code>certutil -hashfile {nzip} SHA256</code><code>shasum -a 256 {nzip}</code><p>El resultado debe ser igual a <b>sha256(zip)</b>.</p>
    </details>
    <h2>Lenguajes</h2>
    {barra_lenguajes(carpeta, meta['archivos'])}
  </aside>
</div>""")
        (IA / "codigo" / f"{slug}.html").write_text(
            pagina(R, meta["titulo"], meta["resumen"], f"ia/codigo/{slug}", "codigo", cuerpo, conteos, estricta=True), encoding="utf-8")
        ext_principal = ".py" if meta["lenguaje"] == "Python" else ".html"
        lang, color = COLOR_LANG[ext_principal]
        filas.append(f"""<a class="gh-repo" href="{slug}.html">
  <div class="gh-repo-n"><b>{e(slug)}</b><span class="lbl">Público</span></div>
  <p>{e(meta['resumen'])}</p>
  <div class="gh-repo-m"><span><svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="5" fill="{color}"/></svg>{e(meta['lenguaje'])}</span><span>{e(meta['licencia'])}</span><span>{"Se conecta a " + e(", ".join(et['dominios'])) if et['dominios'] else "Sin conexión a internet"}</span><span>Actualizado el {fecha_corta(meta['fecha'])}</span></div>
</a>""")
    (desc / "SHA256SUMS.txt").write_text("\n".join(sumas) + "\n", encoding="utf-8")
    log_html = e("\n".join(log))
    cuerpo = (cabecera_sobria(R, "Códigos y proyectos",
                              "Código que usamos de verdad, abierto. Puedes leer cada archivo antes de descargarlo."),
              f"""<div class="gh-box">
  <div class="gh-bar"><span>{len(proyectos)} repositorios</span><span>Licencia MIT</span></div>
  {''.join(filas)}
</div>
<section class="gh-seg">
  <div>
    <h2>Seguridad</h2>
    <p>Antes de publicar, un programa revisa cada archivo: que no haya claves, tokens, IPs ni correos privados, que no sea un ejecutable y que no se conecte a ningún sitio que no diga. Si algo falla, no se publica.</p>
    <p>Ese programa también es público: es el <a href="auditor-de-secretos.html">auditor de secretos</a>. Y las huellas de todas las descargas están en <a href="../descargas/SHA256SUMS.txt">SHA256SUMS.txt</a>.</p>
  </div>
  <pre class="term"><span class="d">$</span> python3 herramientas/construir_ia.py
{log_html}
<span class="okk">{len(proyectos)} aprobados, 0 rechazados</span></pre>
</section>""")
    (IA / "codigo" / "index.html").write_text(
        pagina(R, "Códigos y proyectos", "Código abierto de PsychesAi: léelo antes de descargarlo. Cada proyecto pasa un escáner de seguridad y lleva su huella SHA-256.",
               "ia/codigo/", "codigo", cuerpo, conteos, estricta=True), encoding="utf-8")


# ---------------------------------------------------------------- main
def main():
    proyectos = []
    for carpeta in sorted((IA / "proyectos").iterdir()):
        if not carpeta.is_dir():
            continue
        lic = carpeta / "LICENSE"
        if not lic.exists():
            lic.write_text(LICENCIA, encoding="utf-8")
        meta = json.loads((carpeta / "meta.json").read_text(encoding="utf-8"))
        try:
            et = escanear(carpeta, meta)
        except Rechazo as r:
            sys.exit(f"RECHAZADO: {r}")
        proyectos.append((carpeta, meta, et))
        print(f"ok  {carpeta.name}: internet={et['dominios'] or 'no'} variables={et['variables'] or 'no'} deps={len(et['deps'])}")
    orden = {"probador-de-prompts": 0, "auditor-de-secretos": 1, "pared-de-videos": 2}
    proyectos.sort(key=lambda x: orden.get(x[0].name, 9))
    prompts = json.loads((IA / "datos" / "prompts.json").read_text(encoding="utf-8"))
    programas = json.loads((IA / "datos" / "programas.json").read_text(encoding="utf-8"))
    conteos = {"prompts": sum(len(g["prompts"]) for g in prompts["grupos"]), "codigo": len(proyectos), "programas": sum(len(v["herramientas"]) for v in programas["videos"])}
    construir_prompts(prompts, conteos)
    construir_programas(programas, conteos)
    construir_codigo(proyectos, conteos)
    print("Construido:", conteos)

if __name__ == "__main__":
    main()
