# Probador de prompts

Cuando en un vídeo decimos «probados de verdad», es esto: cada prompt se manda a la API de OpenAI y se guarda la respuesta real. Ahora puedes hacerlo tú con los tuyos.

## Cómo se usa

1. Necesitas Python 3.8 o más nuevo. No hay que instalar nada más.
2. Escribe tus prompts en `prompts.txt`, separados por una línea con `---`.
3. Define tu clave de OpenAI en la terminal. **Nunca la escribas dentro del código.**

```
Windows:      set OPENAI_API_KEY=tu_clave
Mac o Linux:  export OPENAI_API_KEY=tu_clave
```

4. Ejecuta:

```
python probar.py
```

Las respuestas quedan en `respuestas.md`, cada una debajo de su prompt.

## Opciones

- `--modelo gpt-6.1-sol` para elegir el modelo.
- `--salida otro.md` para guardar en otro archivo.
- `--simular` para comprobar que todo funciona sin gastar saldo.

## Cuánto cuesta

Usa tu saldo de la API de OpenAI. Unos pocos prompts cuestan céntimos, pero revisa los precios del modelo que elijas antes de mandar cientos.

## Licencia

MIT. Úsalo, cámbialo y compártelo.
