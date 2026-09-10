---
name: apple-design
description: Reglas y heurísticas concretas de diseño visual estilo Apple (apple.com, Human Interface Guidelines) — tipografía, espaciado, paleta, movimiento, jerarquía, componentes. Úsala cuando el usuario pida que una página, componente o app "se vea/sienta como Apple", "estilo Apple", "como apple.com", "minimalista premium", o describa ese lenguaje visual sin nombrar a Apple explícitamente (headlines enormes centrados, muchísimo espacio en blanco, fondos blanco/negro puro, animaciones suaves al hacer scroll, botones tipo pill). También aplica cuando el usuario pida "que se vea más premium/pulido" y el contexto sugiere un enfoque minimalista de producto. No la uses si el usuario pide otro lenguaje visual concreto (brutalist, retro, maximalista, glassmorphism corporativo genérico) — en ese caso usa frontend-design directamente con esa dirección.
metadata:
  pairs_with: frontend-design, artifact-design, web-page-builder
  output: reglas de diseño a aplicar durante la implementación, no un artefacto en sí mismo
---

# Apple Design

Un conjunto de reglas para que una página o componente adopte el lenguaje visual de apple.com y las Human Interface Guidelines: silencioso, espacioso, tipografía como protagonista, movimiento discreto. Esta skill no construye la página por ti — aporta la dirección estética concreta que le falta a una skill de construcción genérica (`frontend-design`, `artifact-design`, `web-page-builder`) cuando el pedido es "estilo Apple".

**Combínala, no la reemplaces.** Invoca primero la skill de construcción que aplique al medio (Artifact, componente React, página estática) y usa las reglas de aquí como la "Tone" / dirección estética de esa skill.

**No pises el brand del proyecto sin permiso.** Si el proyecto ya tiene una paleta e identidad definida (revisa `CLAUDE.md` / `tailwind.config.js`), aplica estas reglas de *estructura y sensación* (espaciado, tipografía, movimiento) pero conserva los colores de marca — a menos que el usuario pida explícitamente "usa los colores de Apple" o "blanco y negro total". El look Apple es tanto ritmo y aire como paleta; se puede lograr sensación premium sin abandonar el color de marca.

## Por qué funciona este lenguaje visual

El diseño de Apple no es "minimalismo" por estética vacía — cada regla sirve para que **una sola cosa a la vez** tenga toda la atención: el producto, el titular, el mensaje. El espacio en blanco no es espacio "vacío", es lo que le da peso a lo que sí está ahí. Entender esto ayuda a aplicar las reglas con criterio en vez de mecánicamente — si una página tiene que comunicar mucha información densa (un dashboard, una tabla), forzar el look Apple completo puede sacrificar la usabilidad; en esos casos, toma prestado el vocabulario tipográfico y de espaciado, no la escasez de contenido.

## Tipografía

- Usa la fuente del sistema como base: `-apple-system, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif` (o su equivalente de Tailwind: `font-sans` con esa pila configurada). No uses fuentes decorativas ni serif salvo que el usuario lo pida.
- Jerarquía extrema: los headlines son ENORMES (`clamp(2.5rem, 6vw, 6rem)` en hero sections, 700-800 de peso) y el texto de cuerpo es pequeño y contenido (`15-17px`, peso 400-500, ancho de línea corto — 45-65 caracteres).
- Tracking negativo en headlines grandes: `letter-spacing: -0.02em` a `-0.04em` cuanto más grande el tamaño. En texto de cuerpo, tracking normal o ligeramente positivo.
- Line-height ajustado en headlines (`1.0`–`1.1`), más aireado en cuerpo (`1.4`–`1.6`).
- Los headlines suelen ser frases cortas y contundentes, no oraciones completas — piensa en "Potencia. Belleza. Impresionante." no "Este producto tiene un rendimiento extraordinario."

## Espaciado y layout

- El espacio en blanco es el material de diseño principal, no lo que sobra. Secciones con `padding` vertical generoso (`96px`–`200px` en desktop, nunca menos de `48px` en móvil).
- Layouts centrados y simétricos por defecto. El contenido vive en una columna central con `max-width` clara (`~980px`–`1200px` para texto, ancho completo para imágenes/producto).
- Una idea por sección, con aire de sobra entre secciones — no comprimas contenido para "aprovechar espacio". Si algo se siente apretado, sobra contenido, no falta espacio.
- Grillas simples: 1, 2 o 3 columnas, nunca layouts asimétricos complejos salvo para mostrar un producto de forma editorial.

## Color

- Paleta base: blanco puro (`#ffffff` o `#fbfbfd`, el "off-white" característico de Apple) y negro/casi-negro (`#000000` o `#1d1d1f`) como fondos alternados entre secciones (light/dark rhythm al hacer scroll).
- Grises intermedios para texto secundario (`#86868b` es el gris de apple.com para subtítulos y texto de apoyo).
- Un único acento de color, usado con moderación — para el producto mismo o un CTA puntual, nunca para decorar la interfaz. Si el proyecto tiene un color de marca (ver nota arriba), ese es el acento.
- Evita gradientes ruidosos, sombras de color, o paletas de más de 3-4 tonos por pantalla.

## Movimiento y animación

- Easing suave y "físico", nunca rebotes exagerados ni `ease-in`/`ease-out` lineales bruscos: `cubic-bezier(0.16, 1, 0.3, 1)` o `cubic-bezier(0.4, 0, 0.2, 1)` son buenos puntos de partida.
- Las animaciones existen para guiar la atención, no para impresionar por sí mismas — fade + subtle translateY (`12px`–`24px`) al entrar en viewport, escalas sutiles (`0.95`→`1`), nunca rotaciones ni efectos "juguetones".
- Duraciones cortas a medias (`300ms`–`600ms` para micro-interacciones, `600ms`–`900ms` para revelado de secciones grandes). Nada se siente lento ni instantáneo.
- Scroll storytelling: las secciones revelan su contenido progresivamente a medida que entran en viewport (fade-in, parallax sutil de imagen de producto), no todo de golpe al cargar.
- Respeta siempre `prefers-reduced-motion` — desactiva o reduce drásticamente la animación cuando el usuario lo prefiere.

## Componentes

- **Botones/CTAs**: minimalistas. Dos patrones típicos — texto + flecha (`Más información ›`, sin fondo, solo el texto y un chevron) o "pill" (bordes totalmente redondeados, `border-radius: 980px` o similar, fondo sólido o translúcido, padding generoso horizontal).
- **Bordes**: radios consistentes y generosos en tarjetas/imágenes (`12px`–`24px`), nunca esquinas vivas salvo en elementos de texto puro.
- **Profundidad**: sombras muy suaves y difusas (`box-shadow: 0 20px 40px rgba(0,0,0,0.08)`), nunca sombras duras ni skeuomorfismo. Glassmorphism discreto está permitido para navbars/overlays (`backdrop-filter: blur(20px)` sobre fondo semitransparente), pero como excepción puntual, no como base de toda la UI.
- **Imágenes/producto**: son las protagonistas visuales — grandes, de alta calidad, con espacio propio alrededor. El texto se subordina a la imagen, no compite con ella.

## Checklist rápido antes de entregar

- [ ] ¿Los headlines son dramáticamente más grandes que el cuerpo del texto, con tracking negativo?
- [ ] ¿Hay más espacio en blanco del que se sentiría "natural" a primera intención?
- [ ] ¿La paleta se reduce a blanco/negro/gris + un acento como máximo?
- [ ] ¿Las animaciones usan easing suave y existen para guiar la atención, no para lucirse?
- [ ] ¿Los botones son minimalistas (texto+flecha o pill), sin bordes duros ni gradientes llamativos?
- [ ] ¿Cada sección comunica una sola idea con espacio de sobra alrededor?
- [ ] Si el proyecto tiene marca propia, ¿se conservó su color respetando el resto de las reglas?
