# Auditor de secretos

Antes de subir tu proyecto a GitHub, pásale esto. Busca **claves de API, tokens, contraseñas y llaves privadas** que se te hayan quedado dentro del código.

Es el mismo escáner que usamos en PsychesAi: ningún código se publica en esta web si no lo pasa.

## Cómo se usa

1. Necesitas Python 3.8 o más nuevo. No hay que instalar nada más.
2. Abre una terminal en la carpeta donde lo descargaste.
3. Ejecuta:

```
python revisar_secretos.py ruta/a/tu-proyecto
```

Si está limpio, te lo dice. Si encuentra algo, te muestra el archivo, la línea y solo los primeros caracteres del secreto.

## Qué detecta

- Claves de OpenAI, Anthropic, Google, AWS, Stripe y Slack
- Tokens de GitHub y tokens JWT
- Llaves privadas (SSH, TLS)
- Contraseñas escritas en el código y URLs con usuario y contraseña
- Archivos que nunca deberían subirse, como `.env` o `id_rsa`

## Si encontró algo

1. Saca el secreto del código y léelo desde una variable de entorno.
2. Si ya lo subiste a GitHub, **cámbialo**: borrarlo del código no basta, porque sigue en el historial.

## Licencia

MIT. Úsalo, cámbialo y compártelo.
