---
name: nuevo-tema
description: Agregar un tema visual nuevo (colores + miniatura del picker + opcional animación de bienvenida) a la web de NoHayCupo. Usar cuando se pida un tema, skin, modo de color o variante visual nueva de la app.
---

# Agregar un tema a NoHayCupo

La guía completa con la lista de tokens y las reglas de contraste está en
[docs/TEMAS.md](../../../docs/TEMAS.md) — leela primero. Resumen operativo:

1. **Tokens**: bloque `[data-theme="id"]` en `web/src/styles/global.css`
   redefiniendo TODOS los tokens (fondo/tarjeta/tinta/borde/acento/ok/warn/
   mal/sombra). Si es oscuro, sumarlo a la regla `color-scheme: dark` del
   inicio del archivo.
2. **Metadata**: entrada en `web/src/lib/cliente/temas.ts` (id, nombre,
   descripcion, oscuro, acento, acentoTinta, marco, animacion?). El picker,
   el favicon dinámico y la paleta de cursos salen solos de ahí.
3. **Miniatura**: rama en `web/src/components/MiniaturasTemas.tsx` con una
   escena SVG de 24×24 que REPRESENTE el tema (cancha, copa, florcita…), no
   un punto de color. Sin la rama, cae al punto de color del acento.
4. **Animación opcional**: `animacion: "<id>"` en la metadata + rama en
   `AnimacionTema` (web/src/components/Modales.tsx) + keyframes en global.css.
   Overlay `.anim-tema` (fixed, pointer-events none, z-index 300); presupuesto
   ~3.2 s (timer en `cambiarTema`); `prefers-reduced-motion` la apaga sola.
5. **Verificar contraste** (tinta/fondo ≥ 7:1, acento-tinta/acento ≥ 4.5:1)
   y correr `npm test` + `npm run build` en `web/`.

No tocar componentes: si un tema "necesita" cambiar un componente, el tema
está mal diseñado o falta un token — discutirlo antes.
