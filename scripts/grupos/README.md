# Subir grupos de WhatsApp / Telegram

Los grupos por sección que ves en NoHayCupo los aporta la comunidad. Se guardan
en un solo archivo (`web/src/data/grupos.json`) que **se genera con un script** a
partir de un Excel — nunca se edita a mano. Así cualquiera puede aportar y el
mantenedor solo revisa un diff pequeño y seguro.

## Lo que necesitás

- **Node.js** (gratis, de [nodejs.org](https://nodejs.org)). Nada más — el
  script no usa librerías.
- El **Excel de horarios** de tu carrera (el que ya trae código, nombre,
  sección, horario, días y catedrático por fila).

## Cómo se pone un grupo

1. Abrí el Excel. Cada fila es una sección de un curso.
2. En la columna **J** pegá el link del grupo de **WhatsApp** de esa sección.
   En la columna **K**, el de **Telegram**. Podés poner uno, el otro, o los dos.
3. Guardá el Excel.

Solo se aceptan estos formatos de link (nada de TikTok, Instagram, acortadores):

| Red      | Formato                                   |
|----------|-------------------------------------------|
| WhatsApp | `https://chat.whatsapp.com/XXXXXXXXXXXX`  |
| Telegram | `https://t.me/loquesea` · `https://t.me/+HASH` · `https://t.me/joinchat/HASH` |

Los parámetros de tracking (`?s=cl&...`) se limpian solos.

## Correr el script

Desde la raíz del proyecto:

```bash
node scripts/grupos/importar.mjs "ruta/a/tu-archivo.xlsx"
```

Opciones:

- `--periodo 2` — periodo del catálogo (1, 2, v1, v2). Por defecto `2`.
- `--catalogo archivo.json` — usar un catálogo local en vez de bajarlo.

El script:

1. Lee tu Excel.
2. Baja el **catálogo oficial** y verifica **cada fila con link**: que el
   código, el nombre, la sección, el horario, los días y el catedrático
   **coincidan** con lo real.
3. Si todo calza y el link es válido, lo agrega. **Si algo no coincide, te dice
   exactamente qué y no escribe nada.**

Cuando termina bien, actualiza `web/src/data/grupos.json`.

## Abrir el Pull Request

1. Revisá el diff de `web/src/data/grupos.json` (deberían verse solo tus links).
2. Subilo con un Pull Request en GitHub.
3. El mantenedor revisa y lo publica. ¡Gracias por aportar!

> Los grupos son **no oficiales**. Si ves spam o algo raro, avisá por
> Instagram [@ragosorio](https://www.instagram.com/ragosorio) y se quita.
