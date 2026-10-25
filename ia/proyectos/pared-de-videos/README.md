# Pared de vídeos

La pared de móviles que se mueve en la portada de psychesai.com, lista para tu web. Solo HTML y CSS: **cero JavaScript**, cero librerías.

## Cómo se usa

1. Abre `index.html` en el navegador para verla.
2. Cambia cada recuadro por un fotograma de tus vídeos:

```
<img class="v" src="mi-video-1.webp" alt="">
```

3. Cada columna lleva su lista **dos veces**. Si cambias un vídeo, cámbialo en las dos copias: así el bucle no se nota.

## Cómo funciona

- Cada columna sube hasta la mitad exacta de su altura (`translateY(-50%)`), que es donde empieza la copia. Por eso el salto no se ve.
- La columna del medio va al revés y más lenta, para que no parezca una cinta.
- En el móvil se convierte en una fila que corre de lado.
- Si la persona pidió menos movimiento en su sistema, la pared se queda quieta.

## Licencia

MIT. Úsalo, cámbialo y compártelo.
