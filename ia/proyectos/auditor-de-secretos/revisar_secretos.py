#!/usr/bin/env python3
"""Auditor de secretos: revisa una carpeta antes de subirla a GitHub y avisa
si encuentra claves de API, tokens, contraseñas o llaves privadas.

Uso:
  python revisar_secretos.py               # revisa la carpeta actual
  python revisar_secretos.py mi-proyecto   # revisa otra carpeta

Devuelve 0 si está limpia y 1 si encontró algo. Nunca imprime el secreto
completo: solo los primeros caracteres, para que lo reconozcas.
Solo lee archivos. No borra, no cambia nada y no se conecta a internet.
"""
import re
import sys
from pathlib import Path

# Cada regla: (nombre, patrón). Son las mismas que usa PsychesAi
# antes de publicar cualquier código en su web.
REGLAS = [
    ("Clave de OpenAI o Anthropic", r"\bsk-(?:proj-|svcacct-|admin-|ant-)?[A-Za-z0-9_\-]{20,}"),
    ("Token de GitHub", r"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{22,}"),
    ("Clave de AWS", r"\bAKIA[0-9A-Z]{16}\b"),
    ("Clave de Google", r"\bAIza[0-9A-Za-z_\-]{35}\b"),
    ("Token de Slack", r"\bxox[baprs]-[A-Za-z0-9-]{10,}"),
    ("Clave secreta de Stripe", r"\b(?:sk|rk)_live_[A-Za-z0-9]{20,}"),
    ("Llave privada", r"-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----"),
    ("Token JWT", r"\beyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}"),
    ("Usuario y contraseña dentro de una URL", r"\b[a-z][a-z0-9+.\-]*://[^/\s:@]+:[^/\s@]+@"),
    ("Contraseña o clave escrita en el código",
     r"(?i)\b(?:api[_-]?key|secret|token|password|passwd|contrase(?:ñ|n)a|clave)\b[\"']?\s*[:=]\s*[\"'][^\"'\s]{8,}[\"']"),
]

# Archivos que no deberían subirse nunca, se lea lo que se lea dentro.
NOMBRES_PELIGROSOS = {".env", ".env.local", ".env.production", "id_rsa", "id_ed25519",
                      ".npmrc", ".pypirc", "credentials.json", ".git-credentials"}

CARPETAS_IGNORADAS = {".git", "node_modules", ".venv", "venv", "__pycache__", "dist", "build"}
TAMANO_MAXIMO = 2_000_000  # bytes: los archivos más grandes no se leen


def es_texto(datos):
    return b"\x00" not in datos[:4096]


def tapar(secreto):
    return secreto[:6] + "…" if len(secreto) > 6 else "…"


def revisar(carpeta):
    hallazgos = []
    compiladas = [(n, re.compile(p)) for n, p in REGLAS]
    for ruta in sorted(Path(carpeta).rglob("*")):
        if any(parte in CARPETAS_IGNORADAS for parte in ruta.parts) or not ruta.is_file():
            continue
        if ruta.name in NOMBRES_PELIGROSOS:
            hallazgos.append((ruta, 0, "Archivo que no debe subirse", ruta.name))
            continue
        if ruta.stat().st_size > TAMANO_MAXIMO:
            continue
        datos = ruta.read_bytes()
        if not es_texto(datos):
            continue
        for numero, linea in enumerate(datos.decode("utf-8", "replace").splitlines(), 1):
            for nombre, patron in compiladas:
                m = patron.search(linea)
                if m:
                    hallazgos.append((ruta, numero, nombre, tapar(m.group(0))))
    return hallazgos


def main():
    carpeta = sys.argv[1] if len(sys.argv) > 1 else "."
    if not Path(carpeta).is_dir():
        sys.exit(f"No existe la carpeta: {carpeta}")
    hallazgos = revisar(carpeta)
    if not hallazgos:
        print(f"Limpio: no encontré secretos en {carpeta}")
        return 0
    print(f"Encontré {len(hallazgos)} posible(s) secreto(s):\n")
    for ruta, numero, nombre, muestra in hallazgos:
        donde = f"{ruta}:{numero}" if numero else str(ruta)
        print(f"  {donde}  ·  {nombre}  ·  {muestra}")
    print("\nSácalos del código, guárdalos en variables de entorno y, si ya los subiste, cámbialos.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
