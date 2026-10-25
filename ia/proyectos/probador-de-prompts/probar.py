#!/usr/bin/env python3
"""Probador de prompts: manda cada prompt de un archivo a la API de OpenAI
y guarda las respuestas en un documento, para comparar sin copiar y pegar.

Uso:
  python probar.py                          # usa prompts.txt
  python probar.py mis_prompts.txt          # otro archivo
  python probar.py --modelo gpt-6.1-sol     # elige el modelo
  python probar.py --simular                # no llama a la API: prueba que todo esté bien

En prompts.txt, separa un prompt de otro con una línea que solo tenga ---

La clave se lee de la variable de entorno OPENAI_API_KEY. Este programa
nunca la guarda, nunca la imprime y solo la envía a api.openai.com.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

API = "https://api.openai.com/v1/chat/completions"


def leer_prompts(ruta):
    texto = Path(ruta).read_text(encoding="utf-8").replace("\r\n", "\n")
    return [p.strip() for p in texto.split("\n---\n") if p.strip()]


def preguntar(prompt, modelo, clave):
    cuerpo = json.dumps({"model": modelo, "messages": [{"role": "user", "content": prompt}]}).encode("utf-8")
    peticion = urllib.request.Request(API, data=cuerpo, method="POST", headers={
        "Authorization": "Bearer " + clave,
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(peticion, timeout=120) as r:
        return json.load(r)["choices"][0]["message"]["content"].strip()


def main():
    ap = argparse.ArgumentParser(description="Prueba tus prompts en la API de OpenAI.")
    ap.add_argument("archivo", nargs="?", default="prompts.txt", help="archivo con los prompts")
    ap.add_argument("--modelo", default="gpt-6.1-sol", help="modelo de OpenAI que quieres probar")
    ap.add_argument("--salida", default="respuestas.md", help="dónde guardar las respuestas")
    ap.add_argument("--simular", action="store_true", help="no llama a la API")
    a = ap.parse_args()

    prompts = leer_prompts(a.archivo)
    if not prompts:
        sys.exit(f"No encontré prompts en {a.archivo}")

    clave = os.environ.get("OPENAI_API_KEY", "")
    if not a.simular and not clave:
        sys.exit("Falta tu clave. Defínela así y vuelve a intentarlo:\n"
                 "  Windows:     set OPENAI_API_KEY=tu_clave\n"
                 "  Mac o Linux: export OPENAI_API_KEY=tu_clave")

    partes = [f"# Respuestas de {a.modelo}\n"]
    for i, prompt in enumerate(prompts, 1):
        print(f"[{i}/{len(prompts)}] Probando…", flush=True)
        if a.simular:
            respuesta = "(Simulado: no se llamó a la API.)"
        else:
            try:
                respuesta = preguntar(prompt, a.modelo, clave)
            except urllib.error.HTTPError as e:
                respuesta = f"(La API respondió con el error {e.code}.)"
            except urllib.error.URLError as e:
                respuesta = f"(No hubo conexión: {e.reason}.)"
        partes.append(f"## Prompt {i}\n\n```\n{prompt}\n```\n\n{respuesta}\n")

    Path(a.salida).write_text("\n".join(partes), encoding="utf-8")
    print(f"Listo: {a.salida}")


if __name__ == "__main__":
    main()
