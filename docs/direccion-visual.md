# Dirección visual y sistema de diseño — Contact Manager

> **Estado:** dirección visual aprobada (D-V1–D-V9). Documento actualizado; no
> implementa nada.
> **Alcance:** identidad visual, tokens, tipografía, componentes, composición,
> responsive, movimiento y accesibilidad.
> **Base técnica:** Next.js 16.4.5 (App Router), React 19.3.1, TypeScript 5.9.3,
> Tailwind CSS v4, Prisma 7.10.1, PostgreSQL 17.
> **Documento de arquitectura:** [`fase-3-arquitectura.md`](./fase-3-arquitectura.md).

> **Sincronización:** `docs/fase-3-arquitectura.md` §13.3 (N-05) ya refleja
> D-V1, D-V8 y D-V9: tema oscuro por defecto, tema claro soportado y persistencia
> con `localStorage`. Este documento sigue siendo la especificación visual; no
> autoriza implementación.

## Leyenda de decisiones

| Etiqueta | Significado |
|---|---|
| **[APROBADA]** | Decisión tomada por el usuario y registrada en §11.1. No se reabre sin una petición explícita. |
| **[P]** | Decisión propuesta por este documento; puede ajustarse durante la revisión. |
| **[A]** | Requiere aprobación explícita antes de implementarse, porque cambia una decisión previa o afecta a varias pantallas. |
| **[R]** | Restricción técnica derivada de la arquitectura o del stack actual. No es negociable sin reabrir la arquitectura. |

### Decisiones aprobadas (resumen)

| ID | Decisión aprobada | Consecuencia principal |
|---|---|---|
| **D-V1** | Dark-first: el tema oscuro es el predeterminado y la identidad principal. | El tema claro sigue disponible; no es dark-only. |
| **D-V2** | Geist Sans + Geist Mono. | Tipografía base y monoespaciada para identificadores. |
| **D-V3** | Contenedor de 1024 px. | Coincide con el `max-w-5xl` actual. |
| **D-V4** | Navegación activa con `usePathname` en un Client Component pequeño. | El header y el layout siguen siendo Server Components. |
| **D-V5** | Sin Bento Grid inicialmente. | La home es una lista clara, no un dashboard. |
| **D-V6** | Mapa de colores aprobado para Amigo, Trabajo, Familia y Otro. | Badges y avatares usan colores estables por categoría. |
| **D-V7** | No reutilizar `public/icons.svg`. | Su retirada queda para una tarea de limpieza. |
| **D-V8** | Temas oscuro y claro; oscuro predeterminado. | Ambos temas requieren tokens completos y ratios verificados por par (§9.1). |
| **D-V9** | Persistencia con `localStorage` y clase en el elemento raíz. | Sin cookies; se documenta la estrategia anti-flash. |

Las decisiones **D-V1**, **D-V8** y **D-V9** se desarrollan conjuntamente en
§3.9 y §3.10.

---

## 0. Resumen ejecutivo

**Concepto:** *señal en la oscuridad*.

Contact Manager no debe parecer un panel administrativo genérico. Debe sentirse
como una consola personal, precisa y silenciosa: un lienzo azul-negro profundo,
tipografía nítida, superficies apenas separadas del fondo y **una sola señal
luminosa por vista** para indicar dónde actuar.

La identidad se apoya en tres ideas:

1. **Oscuro por convicción, no por moda.** El fondo profundo reduce ruido y hace
   que los datos de contacto —nombre, teléfono, correo— sean los protagonistas.
2. **Luz con significado.** El cian no decora: marca la acción principal, el foco
   y el estado activo. El violeta aporta profundidad; el menta confirma.
3. **Minimalismo funcional.** Menos bordes, menos sombras, menos tarjetas
   anidadas. La jerarquía se construye con espacio, escala tipográfica y color
   semántico, no con efectos.

**Frase guía:** «Una consola personal, no un dashboard corporativo».

**Lo que esta dirección evita deliberadamente:**

- Neon en todos los elementos, gradientes decorativos y glassmorphism masivo.
- Tarjetas dentro de tarjetas, sombras difusas y bordes por todas partes.
- Animaciones que retrasan una acción o compiten con la lectura.
- Estética de panel de administración con sidebar, métricas vacías y widgets.
- Iconografía de librería pesada o ilustraciones genéricas de stock.

---

## 1. Concepto e identidad visual

### 1.1 Metáfora

La interfaz se inspira en una **constelación de contactos**: puntos de luz
separados por espacio negativo, conectados por una retícula invisible. Esa
metáfora se usa con moderación:

- Un halo radial muy tenue en el fondo de la página de inicio (opcional, nunca
  detrás del texto).
- Un punto de color en avatares y badges de categoría.
- Líneas finas de 1 px como única separación entre superficies.

No se dibujan constelaciones literales, partículas animadas ni fondos de estrellas.

### 1.2 Personalidad

| Atributo | Cómo se traduce |
|---|---|
| **Preciso** | Alineaciones estrictas, números tabulares, espaciado consistente. |
| **Calmado** | Pocos acentos, movimiento breve, sin urgencia visual falsa. |
| **Tecnológico** | Monoespaciada para identificadores, cian como señal, bordes finos. |
| **Humano** | Lenguaje directo en español, avatares con iniciales, estados vacíos útiles. |
| **Profesional** | Contraste alto, foco visible, formularios claros, errores explícitos. |

### 1.3 Firma visual

1. Fondo `#080D16` con superficies `#111B2A` separadas por bordes de 1 px.
2. Un único acento cian `#00D5FF` por vista para la acción principal.
3. Tipografía sans geométrica con *tracking* negativo solo en titulares.
4. Radios medios (10–16 px), nunca píldoras salvo en badges y chips.
5. Espacio negativo generoso: el vacío también es jerarquía.
6. Glassmorphism limitado a la barra de navegación (posición según P-V1) y al fondo de modales.
7. El tema claro existe con tokens propios, pero la identidad principal es oscura.

---

## 2. Principios de diseño

| # | Principio | Implicación práctica | Límite / anti-patrón |
|---|---|---|---|
| 1 | **Dark-first** | El tema oscuro es la identidad y el valor por defecto. | No usar negro puro `#000`; el tema claro está soportado, pero no es la identidad principal. |
| 2 | **Minimalismo funcional** | Cada elemento debe tener una función: navegar, leer, actuar o dar estado. | Sin adornos, ilustraciones decorativas ni widgets sin datos. |
| 3 | **Jerarquía clara** | Un `h1` por página; tamaño, peso y color en ese orden. | Sin titulares gigantes que empujen el contenido útil fuera de pantalla. |
| 4 | **Tipografía legible** | Cuerpo mínimo 16 px, interlineado 1.5–1.6, longitud 65–75 caracteres. | Sin texto gris claro sobre fondo claro ni 12 px para párrafos. |
| 5 | **Contraste suficiente** | Texto normal ≥ 4.5:1; texto grande ≥ 3:1; controles ≥ 3:1. | No confiar en el color como única señal. |
| 6 | **Acentos moderados** | Cian para acción/foco; violeta para profundidad; menta para éxito. | No más de un botón primario visible por bloque. |
| 7 | **Transparencia con propósito** | Blur solo en la navbar (posición según P-V1) y el backdrop de modales. | Sin tarjetas de vidrio apiladas ni blur sobre texto. |
| 8 | **Microinteracciones suaves** | 120–240 ms. Para movimiento y geometría, solo `transform` y `opacity`; las transiciones de `color`, `background-color`, `border-color` y `outline-color` están permitidas y no son animaciones de movimiento. | Sin rebotes, parallax ni animaciones de entrada en cada sección. |
| 9 | **Mobile-first** | Diseñar a 320 px y ampliar; objetivos táctiles de 44 px. | Sin acciones disponibles solo con hover. |
| 10 | **Consistencia** | Mismos tokens, radios, alturas y espaciados en todas las rutas. | Sin excepciones visuales por página sin justificación. |
| 11 | **Dos temas completos** | Oscuro y claro comparten tokens semánticos y se validan por separado. | Ningún tema puede quedar incompleto ni reutilizar valores sin verificar. |

### 2.1 Reglas de oro

- **Una acción primaria por vista (P-V5).** En la lista es «Nuevo contacto»; en
  el detalle es «Editar»; en el formulario es «Guardar».
- **El color nunca va solo.** Favorito, error, éxito y categoría siempre llevan
  icono o texto además del color.
- **Superficies antes que sombras (P-V4).** En oscuro, la elevación se expresa
  con un escalón de superficie y un borde, no con sombras grandes.
- **El foco es sagrado.** Nunca `outline: none` sin un reemplazo visible.
- **El movimiento no bloquea.** Ninguna animación impide leer o pulsar.

---

## 3. Paleta y tokens semánticos

### 3.1 Evaluación de la paleta inicial

La propuesta inicial es coherente: el fondo profundo y el texto claro dan un
contraste excelente; el cian funciona como señal; el menta comunica éxito. Se
hacen **cuatro ajustes justificados**:

1. **El violeta `#786BFF` no sirve como texto pequeño sobre `surface`.** Su
   contraste es **4.40:1**, por debajo de 4.5:1. Se conserva para rellenos,
   gráficos y bordes, y se añade `--color-secondary-text: #9A90FF` para texto
   (6.43:1 sobre `surface`).
2. **El texto blanco sobre violeta no cumple.** `#FFFFFF` sobre `#786BFF` da
   **3.93:1**. Si se usa un botón violeta relleno, el texto debe ser oscuro:
   `--color-on-secondary: #080D16` (4.95:1).
3. **Los bordes decorativos no deben usarse como bordes de controles.** Un borde
   de input necesita ≥ 3:1. Se separan `--color-border` (divisores) y
   `--color-border-strong` (controles), este último `#557092` (3.39:1 sobre
   `surface`).
4. **El placeholder no puede ser `muted` al 70 % de opacidad.** Esa mezcla da
   `#728296` sobre `surface`, con **4.41:1**, por debajo de 4.5:1. Se añade
   `--color-placeholder` (`#8A9EB4` en oscuro, **6.29:1**; `#5A6E86` en claro,
   **5.24:1**).

Todos los ratios de este documento se recalcularon con el umbral **0.04045** de
la fórmula de luminancia relativa de WCAG 2.x. Los pares exactos de primer plano
y fondo están en §9.1.

### 3.2 Tokens base (tema oscuro, por defecto)

| Token | Valor | Uso | Par verificado |
|---|---|---|---|
| `--color-bg` | `#080D16` | Fondo principal de la aplicación. | — |
| `--color-bg-subtle` | `#0B1220` | Secciones alternas, fondo de inputs deshabilitados. | — |
| `--color-surface` | `#111B2A` | Tarjetas, navbar, inputs, superficies base. | — |
| `--color-surface-hover` | `#162338` | Hover de tarjetas y filas. | — |
| `--color-surface-elevated` | `#172337` | Modales, toasts, menús, elementos elevados. | — |
| `--color-surface-overlay` | `rgba(8, 13, 22, 0.72)` | Backdrop de modales. | — |
| `--color-border` | `#223149` | Divisores y bordes decorativos de 1 px. | No aplica (decorativo). |
| `--color-border-strong` | `#557092` | Bordes de inputs, selects y controles. | 3.39:1 sobre `surface`. |
| `--color-text` | `#E8F1FA` | Texto principal. | 17.04:1 sobre `bg`; 15.15:1 sobre `surface`. |
| `--color-muted` | `#9BAEC4` | Texto secundario, ayudas, metadatos. | 8.56:1 sobre `bg`; 7.62:1 sobre `surface`. |
| `--color-text-disabled` | `#6B7E96` | Texto y iconos deshabilitados. | 4.16:1 sobre `surface`. |
| `--color-placeholder` | `#8A9EB4` | Texto de placeholder en inputs y búsqueda. | 6.29:1 sobre `surface`; 7.07:1 sobre `bg`. |
| `--color-primary` | `#00D5FF` | Acción principal, enlaces, foco de marca. | 11.08:1 sobre `bg`; 9.85:1 sobre `surface`. |
| `--color-primary-hover` | `#5CE6FF` | Hover de acciones primarias. | — |
| `--color-primary-active` | `#00B8DE` | Estado pulsado. | — |
| `--color-on-primary` | `#041018` | Texto e iconos sobre cian. | 10.95:1 sobre `primary`. |
| `--color-secondary` | `#786BFF` | Rellenos, gráficos y acentos secundarios. | 4.95:1 sobre `bg`; **no usar como texto pequeño sobre `surface`**. |
| `--color-secondary-text` | `#9A90FF` | Texto e iconos secundarios. | 7.23:1 sobre `bg`; 6.43:1 sobre `surface`. |
| `--color-secondary-hover` | `#8B80FF` | Hover de elementos secundarios. | — |
| `--color-on-secondary` | `#080D16` | Texto sobre relleno violeta. | 4.95:1 sobre `secondary`. |
| `--color-accent` | `#A3FFCB` | Confirmación, éxito, estados positivos. | 16.42:1 sobre `bg`; 14.60:1 sobre `surface`. |
| `--color-on-accent` | `#04140C` | Texto sobre menta. | 15.96:1 sobre `accent`. |
| `--color-focus` | `#7CE7FF` | Anillo de foco visible. | 13.65:1 sobre `bg`; 12.13:1 sobre `surface`. |
| `--color-favorite` | `#FFD166` | Estrella de favorito. | 13.49:1 sobre `bg`; 12.00:1 sobre `surface`. |
| `--color-danger` | `#FF6B81` | Error, borrado, acciones destructivas. | 7.11:1 sobre `bg`; 6.32:1 sobre `surface`. |
| `--color-danger-text` | `#FF8A9A` | Texto de error sobre superficies oscuras. | 7.70:1 sobre `surface`. |
| `--color-on-danger` | `#1A060A` | Texto e iconos sobre relleno de peligro. | 7.14:1 sobre `danger`. |

> **Ratios:** todos recalculados con el umbral 0.04045. Los pares exactos de
> primer plano y fondo, junto con el umbral aplicable, están en §9.1.

> **Nota sobre `--color-secondary`:** se mantiene el valor inicial porque es
> correcto para superficies grandes y gráficos. La corrección afecta solo al uso
> como texto.

### 3.3 Estados semánticos

Cada estado tiene un color de texto/icono y una superficie tintada para fondos de
badges, banners y toasts. Los contrastes indicados son texto sobre su superficie.

| Estado | Texto/icono | Superficie | Ratio del par | Uso |
|---|---|---|---|---|
| **Success** | `#4ADE80` | `#0F2A1D` | 8.80:1 | Contacto guardado, restauración correcta. |
| **Warning** | `#FBBF24` | `#2E2410` | 9.14:1 | Cambios sin guardar, advertencia no bloqueante. |
| **Error** | `#FF8A9A` | `#33141C` | 7.44:1 | Validación, fallo de red, borrado fallido. |
| **Info** | `#60A5FA` | `#10233D` | 6.21:1 | Información contextual, límites del MVP. |

Tokens:

```text
--color-success: #4ADE80;
--color-success-surface: #0F2A1D;
--color-warning: #FBBF24;
--color-warning-surface: #2E2410;
--color-error: #FF8A9A;
--color-error-surface: #33141C;
--color-info: #60A5FA;
--color-info-surface: #10233D;
```

`--color-danger` y `--color-error` comparten familia, pero se separan por
semántica: `danger` para acciones destructivas, `error` para estados de fallo.

### 3.4 Categorías de contacto

La arquitectura fija el enum `Role` con cuatro valores: `Amigo`, `Trabajo`,
`Familia`, `Otro`. Se adopta la siguiente correspondencia estable, siempre
acompañada del texto de la categoría (D-V6 aprobada):

| Categoría | Texto | Superficie | Contraste |
|---|---|---|---|
| **Amigo** | `#A3FFCB` | `#10251C` | 13.60:1 |
| **Trabajo** | `#7CC7FF` | `#102132` | 8.92:1 |
| **Familia** | `#FFB4A2` | `#2A1817` | 9.91:1 |
| **Otro** | `#C4B5FD` | `#1D1930` | 9.22:1 |

Tokens:

```text
--color-cat-amigo: #A3FFCB;
--color-cat-amigo-surface: #10251C;
--color-cat-trabajo: #7CC7FF;
--color-cat-trabajo-surface: #102132;
--color-cat-familia: #FFB4A2;
--color-cat-familia-surface: #2A1817;
--color-cat-otro: #C4B5FD;
--color-cat-otro-surface: #1D1930;
```

**Regla:** el badge siempre muestra el nombre de la categoría. El color es un
refuerzo, nunca la única información.

### 3.5 Favoritos

- Estrella rellena `--color-favorite` para el estado activo.
- Estrella con contorno `--color-muted` para el estado inactivo.
- El botón usa `aria-pressed` y un `aria-label` explícito («Marcar como
  favorito» / «Quitar de favoritos»).
- No se usa solo un cambio de color: cambia el relleno del icono y el texto
  accesible.

### 3.6 Elevación

En el tema oscuro las sombras pierden efectividad; en el claro se usan con
moderación. La elevación se expresa así (P-V4):

| Nivel | Superficie | Borde | Sombra |
|---|---|---|---|
| 0 — Fondo | `--color-bg` | — | Ninguna. |
| 1 — Tarjeta | `--color-surface` | `--color-border` | Ninguna por defecto. |
| 2 — Hover | `--color-surface-hover` | `--color-border-strong` | Ninguna. |
| 3 — Flotante | `--color-surface-elevated` | `--color-border-strong` | `0 12px 32px rgba(0, 0, 0, 0.32)`. |

La sombra del nivel 3 se reserva para modales, toasts y menús. Nunca para
tarjetas de contacto. En el tema claro, la sombra equivalente es
`0 12px 32px rgba(11, 21, 36, 0.12)`.

### 3.7 Tokens obligatorios de la arquitectura

La arquitectura (§13.3, N-05) exige estos ocho tokens. Este documento los conserva
sin renombrarlos:

```text
--color-bg
--color-surface
--color-text
--color-muted
--color-border
--color-accent
--color-danger
--color-focus
```

El resto son extensiones. **No se debe romper el contrato de nombres** sin
reabrir N-05. Ambos temas deben definir el mismo conjunto de tokens: el tema
claro no puede omitir estados, placeholder, categorías ni tokens de peligro.

### 3.8 Estrategia de implementación (futura, no aplicada)

La implementación prevista usa Tailwind CSS v4 y variables CSS. No se aplica en
esta tarea.

**1. Tokens semánticos y utilidades**

Los ocho tokens obligatorios de N-05 (`--color-bg`, `--color-surface`,
`--color-text`, `--color-muted`, `--color-border`, `--color-accent`,
`--color-danger`, `--color-focus`) se declaran en el bloque `@theme` de Tailwind
v4. Ese bloque emite las variables en `:root` y genera las utilidades
(`bg-bg`, `text-text`, `border-border`, `text-muted`, etc.).

```css
/* globals.css — ilustrativo; NO aplicado en esta tarea */
@import "tailwindcss";

/* Tema oscuro: valores por defecto */
@theme {
  --color-bg: #080D16;
  --color-surface: #111B2A;
  --color-text: #E8F1FA;
  --color-muted: #9BAEC4;
  --color-border: #223149;
  --color-accent: #A3FFCB;
  --color-danger: #FF6B81;
  --color-focus: #7CE7FF;
  /* extensiones: surface-hover, placeholder, on-danger, categorías, etc. */
}

/* Tema claro: sobrescribe los mismos tokens, no los renombra */
html.light {
  --color-bg: #F6F9FC;
  --color-surface: #FFFFFF;
  --color-text: #0B1524;
  --color-muted: #52657C;
  --color-border: #D5E0EB;
  --color-accent: #0B7A4B;
  --color-danger: #C2334D;
  --color-focus: #0066CC;
  /* el resto de tokens claros, con los mismos nombres */
}
```

**2. Por qué no se usa `@theme inline` para los colores**

`@theme inline` inserta el valor de una variable en la utilidad en lugar de
referenciarla. Si se escribe `@theme inline { --color-bg: var(--color-bg); }`,
la variable se referencia a sí misma y queda inválida (referencia circular). Por
eso los colores se declaran directamente en `@theme` y se sobrescriben en
`html.light`.

`@theme inline` solo se usa cuando un token debe apoyarse en otra variable con
**nombre distinto**, por ejemplo una fuente:

```css
@theme inline {
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
```

Nunca se escribe `--font-sans: var(--font-sans)` ni se declara un `--color-*`
con `@theme inline` apuntando a sí mismo. Sobrescribir el mismo nombre en
`html.light` sí es correcto: es la forma de cambiar de tema sin duplicar
utilidades.

**3. Tema por clase, no por `prefers-color-scheme`**

El tema se selecciona con una clase exclusiva en `<html>`: `dark` o `light`.
El servidor renderiza `class="dark"`; el script de §3.10 la sustituye por
`light` si hay una preferencia guardada. Las clases no se acumulan.

Si se usan utilidades `dark:`, hay que configurar la variante para que dependa
de la clase:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

Sin esa directiva, Tailwind v4 usa `prefers-color-scheme` para `dark:`, lo que
contradice D-V1/D-V8/D-V9. La recomendación es no usar `dark:` para colores de
tema: los tokens semánticos ya cambian con la clase. `dark:` se reserva para
excepciones puntuales.

**4. Reglas**

- El tema oscuro vive en `:root` (valores por defecto) y el claro en
  `html.light`, con el mismo conjunto de tokens.
- `color-scheme: dark` en `:root` y `color-scheme: light` en `html.light`
  alinean controles nativos, scrollbars y campos.
- **Nunca** se dispersan hexadecimales en componentes. Los únicos hexadecimales
  viven en `globals.css` (o en el archivo de tokens que se apruebe).
- Incluir también `--color-placeholder` y `--color-on-danger` en ambos temas.
- No se crean dos juegos de nombres para los colores: el token semántico y la
  variable de Tailwind coinciden (`--color-*`). La distinción entre capas solo
  es necesaria cuando un token referencia otra variable, como las fuentes.

> **Restricción [R]:** la arquitectura prohíbe CSS Modules, librerías de UI y
> `styled-components`. La implementación debe ser Tailwind v4 + variables CSS.

### 3.9 Tema claro (aprobado, no identidad principal)

**D-V1 + D-V8:** el tema oscuro es el predeterminado y la identidad principal;
el tema claro está soportado y debe ser completo. No es un tema «opcional» ni un
experimento: comparte el mismo contrato de tokens y se valida de forma
independiente.

| Token | Valor claro | Uso | Par verificado |
|---|---|---|---|
| `--color-bg` | `#F6F9FC` | Fondo principal. | — |
| `--color-bg-subtle` | `#EEF3F8` | Secciones alternas, inputs deshabilitados. | — |
| `--color-surface` | `#FFFFFF` | Tarjetas, navbar, inputs. | — |
| `--color-surface-hover` | `#F1F6FB` | Hover de tarjetas y filas. | — |
| `--color-surface-elevated` | `#FFFFFF` | Modales, toasts, menús. | — |
| `--color-surface-overlay` | `rgba(11, 21, 36, 0.45)` | Backdrop de modales. | — |
| `--color-border` | `#D5E0EB` | Divisores decorativos. | No aplica. |
| `--color-border-strong` | `#6E859D` | Bordes de inputs y controles. | 3.81:1 sobre `surface`; 3.61:1 sobre `bg`. |
| `--color-text` | `#0B1524` | Texto principal. | 17.33:1 sobre `bg`; 18.31:1 sobre `surface`. |
| `--color-muted` | `#52657C` | Texto secundario. | 5.66:1 sobre `bg`; 5.98:1 sobre `surface`. |
| `--color-text-disabled` | `#7A8B9E` | Texto deshabilitado. | 3.49:1 sobre `surface` (exento, legible). |
| `--color-placeholder` | `#5A6E86` | Placeholder de inputs. | 5.24:1 sobre `surface`; 4.96:1 sobre `bg`. |
| `--color-primary` | `#007A99` | Acción principal, enlaces. | 4.68:1 sobre `bg`; 4.95:1 sobre `surface`. |
| `--color-primary-hover` | `#00657F` | Hover primario. | Blanco sobre él: 6.63:1. |
| `--color-primary-active` | `#00536A` | Estado pulsado. | Blanco sobre él: 8.59:1. |
| `--color-on-primary` | `#FFFFFF` | Texto sobre primario. | 4.95:1 sobre `primary`. |
| `--color-secondary` | `#5B4DE0` | Rellenos y acentos secundarios. | 5.55:1 sobre `bg`; 5.86:1 sobre `surface`. |
| `--color-secondary-text` | `#5B4DE0` | Texto e iconos secundarios. | 5.86:1 sobre `surface`. |
| `--color-secondary-hover` | `#4A3DCC` | Hover secundario. | — |
| `--color-on-secondary` | `#FFFFFF` | Texto sobre violeta. | 5.86:1 sobre `secondary`. |
| `--color-accent` | `#0B7A4B` | Confirmación y éxito. | 5.10:1 sobre `bg`; 5.39:1 sobre `surface`. |
| `--color-on-accent` | `#FFFFFF` | Texto sobre menta. | 5.39:1 sobre `accent`. |
| `--color-focus` | `#0066CC` | Anillo de foco. | 5.27:1 sobre `bg`; 5.57:1 sobre `surface`. |
| `--color-favorite` | `#8A5A00` | Estrella de favorito. | 5.93:1 sobre `surface`. |
| `--color-danger` | `#C2334D` | Error, borrado. | 5.13:1 sobre `bg`; 5.42:1 sobre `surface`. |
| `--color-danger-text` | `#A81F39` | Texto de error. | 7.19:1 sobre `surface`. |
| `--color-on-danger` | `#FFFFFF` | Texto sobre peligro relleno. | 5.42:1 sobre `danger`. |
| `--color-success` | `#0B6B3A` | Estado positivo. | 5.97:1 sobre `success-surface`. |
| `--color-success-surface` | `#E8F7EE` | Fondo de éxito. | — |
| `--color-warning` | `#8A5A00` | Advertencia. | 5.49:1 sobre `warning-surface`. |
| `--color-warning-surface` | `#FFF6DC` | Fondo de advertencia. | — |
| `--color-error` | `#A81F39` | Error. | 6.31:1 sobre `error-surface`. |
| `--color-error-surface` | `#FDECEF` | Fondo de error. | — |
| `--color-info` | `#1D4ED8` | Información. | 5.91:1 sobre `info-surface`. |
| `--color-info-surface` | `#EAF1FE` | Fondo de información. | — |
| `--color-cat-amigo` | `#0B6B3A` | Texto Amigo. | 5.97:1 sobre su superficie. |
| `--color-cat-amigo-surface` | `#E8F7EE` | Fondo Amigo. | — |
| `--color-cat-trabajo` | `#0B5C8A` | Texto Trabajo. | 6.44:1 sobre su superficie. |
| `--color-cat-trabajo-surface` | `#E8F4FB` | Fondo Trabajo. | — |
| `--color-cat-familia` | `#9A3B2A` | Texto Familia. | 6.13:1 sobre su superficie. |
| `--color-cat-familia-surface` | `#FDEEE9` | Fondo Familia. | — |
| `--color-cat-otro` | `#5B3FA8` | Texto Otro. | 6.71:1 sobre su superficie. |
| `--color-cat-otro-surface` | `#F1EDFD` | Fondo Otro. | — |

El cian original `#00D5FF` **no** se usa como texto o borde de control sobre
blanco: su contraste es insuficiente. En claro se sustituye por `#007A99`.
Todos los pares exactos y los umbrales aplicables están en §9.1.

### 3.10 Estrategia de temas aprobada (D-V1 + D-V8 + D-V9)

Las tres decisiones se aplican conjuntamente:

1. **Tema predeterminado:** oscuro. Si no existe una preferencia almacenada, se
   usa el tema oscuro. No se consulta `prefers-color-scheme` para elegir tema.
2. **Tema claro disponible:** el usuario puede cambiarlo y la interfaz completa
   —páginas, componentes y estados— debe funcionar en ambos temas.
3. **Persistencia:** `localStorage` con la clave namespaced
   `contact-manager-theme`, con los valores `dark` o `light`. **No se usan
   cookies** (D-V9).
4. **Selección de tokens:** una clase en el elemento raíz `<html>`: `dark` o
   `light`, mutuamente excluyentes. El tema oscuro se define en `:root`; el
   claro en `html.light`. La mecánica CSS se detalla en §3.8.
5. **Sin destello del tema incorrecto:** el servidor renderiza
   `<html class="dark">` por defecto. Un script pequeño y bloqueante en el
   `<head>`, ejecutado antes del primer pintado, lee `localStorage` y **sustituye**
   la clase `dark` por `light` solo si el valor guardado es exactamente `light`;
   cualquier otro valor (ausente, corrupto o `dark`) mantiene el oscuro. No se
   acumulan ambas clases. El script debe ir envuelto en `try/catch` para que un
   fallo de almacenamiento no rompa la página.
6. **Hidratación:** el `<html>` lleva `suppressHydrationWarning`, porque la
   clase puede diferir entre el HTML del servidor y el DOM tras el script. No se
   lee `localStorage` durante el render de componentes; solo en el script de
   arranque y en el `ThemeToggle` cliente.
7. **`ThemeToggle` (M6):** Client Component pequeño que alterna la clase,
   actualiza `localStorage` y expone un `aria-label` claro. No se implementa en
   esta tarea.
8. **Sin JavaScript:** la página sigue funcionando en oscuro; el selector de
   tema no está disponible. Es un degrade aceptable.
9. **CSP futura:** si se añade una Content Security Policy, el script inline
   necesitará `nonce` o hash. Queda como decisión de implementación.
10. **Arquitectura sincronizada:** §13.3 de `docs/fase-3-arquitectura.md`
    (N-05) ya refleja D-V1, D-V8 y D-V9. Cualquier cambio futuro debe mantener
    esa coherencia; no se reintroduce `prefers-color-scheme` como selector ni un
    modo «sistema».

---

## 4. Tipografía y escala

### 4.1 Familia tipográfica

**Decisión aprobada (D-V2):** **Geist Sans** como tipografía principal y
**Geist Mono** para identificadores, códigos y datos que deben alinearse. Las
familias están aprobadas; lo que sigue pendiente es el mecanismo de carga.

Justificación:

- Geist está diseñada para interfaces: altura de x alta, formas geométricas
  neutras y buena legibilidad en tamaños pequeños.
- Encaja con la dirección «SaaS futurista + minimalismo funcional» sin caer en
  una fuente display llamativa.
- `next/font/google` forma parte de Next.js y **no añade dependencias**, pero
  **descarga las fuentes durante el build**. Si el build no tiene conexión,
  puede fallar; **no hay fallback automático** a una fuente del sistema.

**Mecanismos de carga (pendientes; no cambian la familia):**

1. **`next/font/local`** con archivos `.woff2` de Geist versionados en el
   repositorio. Requiere incorporar los archivos en una tarea posterior; no se
   descargan aquí.
2. **`next/font/google`** con Geist, solo si el entorno de build tiene red.
3. **Pila del sistema** (`ui-sans-serif, system-ui, -apple-system, "Segoe UI",
   sans-serif`) únicamente como *fallback* si Geist no está disponible. No es
   una familia aprobada ni sustituye a D-V2; adoptarla como fuente principal
   requeriría reabrir la decisión.

**Inter** no forma parte de D-V2 ni se propone como sustituto de Geist.

> **Restricción [R]:** no hay fuentes locales en el repositorio ni dependencias
> de fuentes instaladas. `next/font/google` descarga en tiempo de build y puede
> fallar sin red. Si el CI debe compilar sin conexión, hay que usar
> `next/font/local` con archivos versionados o la pila del sistema como
> *fallback*. **No se descarga nada en esta tarea.**

### 4.2 Pesos

| Peso | Uso |
|---|---|
| 400 | Cuerpo de texto, descripciones, metadatos. |
| 500 | Etiquetas, botones, badges, navegación. |
| 600 | Títulos, nombres de contacto, énfasis. |
| 700 | Solo cifras destacadas o el logotipo textual; nunca párrafos. |

No se usa 300 ni 200: en fondos oscuros y tamaños pequeños reducen la legibilidad.

### 4.3 Escala tipográfica

Escala de escritorio (≥ 1024 px):

| Rol | Tamaño | Interlineado | Tracking | Peso | Uso |
|---|---|---|---|---|---|
| **Display** | 48 px | 52 px (1.08) | −0.03em | 600 | Solo home o página de bienvenida; nunca en formularios. |
| **H1** | 36 px | 44 px (1.22) | −0.02em | 600 | Título de página. |
| **H2** | 28 px | 36 px (1.29) | −0.015em | 600 | Secciones principales. |
| **H3** | 20 px | 28 px (1.40) | −0.01em | 600 | Subsecciones, títulos de tarjeta destacada. |
| **Body large** | 18 px | 29 px (1.60) | 0 | 400 | Introducciones, texto de About. |
| **Body** | 16 px | 26 px (1.62) | 0 | 400 | Texto general. |
| **Small** | 14 px | 22 px (1.57) | 0 | 400 | Metadatos, ayudas, texto secundario. |
| **Label** | 13 px | 18 px (1.38) | 0.01em | 500 | Etiquetas de formulario, navegación. |
| **Caption** | 12 px | 16 px (1.33) | 0.01em | 400 | Timestamps, notas al pie. |
| **Overline** | 12 px | 16 px (1.33) | 0.08em | 600 | Categoría sobre un título; mayúsculas. |

Escala móvil (< 640 px):

| Rol | Tamaño | Interlineado |
|---|---|---|
| Display | 36 px | 40 px |
| H1 | 30 px | 36 px |
| H2 | 24 px | 32 px |
| H3 | 18 px | 26 px |
| Body large | 17 px | 27 px |
| Body | 16 px | 26 px |
| Small | 14 px | 22 px |

### 4.4 Reglas tipográficas

- Longitud de línea: **65–75 caracteres** en texto corrido; máximo 80.
- No usar mayúsculas sostenidas salvo `overline` y códigos.
- Números de teléfono, conteos y fechas: `font-variant-numeric: tabular-nums`.
- Identificadores UUID, códigos de error y rutas: Geist Mono a 13–14 px.
- No usar más de tres tamaños distintos en una misma tarjeta.
- El texto nunca se justifica; alineación a la izquierda.
- No usar `text-shadow` ni texto con gradiente.
- El placeholder de un input no sustituye a la etiqueta.

### 4.5 Implementación futura

Ambos ejemplos cargan **Geist**; son mecanismos de carga alternativos, no
cambios de familia.

```tsx
// Ilustrativo; NO aplicado en esta tarea.
// Requiere red en build. Sin conexión, next/font/google puede fallar:
// no recurre automáticamente a la pila del sistema.
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
```

Alternativa sin red, también ilustrativa: `next/font/local` con archivos
versionados. Requiere incorporar los `.woff2` al repositorio en una tarea
posterior.

```tsx
// Ilustrativo; los archivos NO existen todavía en el repositorio.
import localFont from "next/font/local";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff2",
  variable: "--font-geist-sans",
});
```

El archivo debe ser una fuente **Geist**; el nombre es ilustrativo. La pila del
sistema solo se usaría como *fallback*, no como sustituto aprobado.

Luego, en `globals.css`, mapear `--font-sans` y `--font-mono` a esas variables
con `@theme inline` (nombres de origen distintos, §3.8). El `layout.tsx`
añadiría las clases de variable al `<html>`.

---

## 5. Sistema visual de componentes

> **No se implementa nada en esta tarea.** Esta sección define cómo deben verse y
> comportarse los componentes cuando se construyan en los hitos
> correspondientes.

### 5.1 Navbar y navegación

**Anatomía:** marca textual + enlaces principales + (futuro) `ThemeToggle`.

- Posición: `position: sticky; top: 0; z-index: 40` (P-V1). La barra se adhiere
  al borde superior al hacer scroll, sin convertirse en `fixed`.
- Altura: `min-height: 56px` en móvil y `64px` en escritorio; `height: auto`
  (P-V1). No se usa una altura rígida: si los enlaces envuelven en pantallas
  pequeñas, la barra crece y el contenido no se recorta.
- Fondo: `--color-bg` con 80 % de opacidad y `backdrop-filter: blur(12px)`
  (P-V1). Borde inferior de 1 px `--color-border`.
- Marca: «Contact Manager» en 16–18 px, peso 600, color `--color-text`.
- Enlaces: 14 px, peso 500, color `--color-muted`; hover `--color-text`;
  `aria-current="page"` en el activo con color `--color-primary` y un subrayado
  de 2 px.
- Enlaces actuales: Inicio, Buscar, Nuevo contacto, Acerca de.
- Distribución: `display: flex; flex-wrap: wrap; gap` y `min-width: 0` en los
  elementos. En móvil, marca arriba y navegación en una segunda fila. No se usa
  menú hamburguesa: los enlaces deben envolver sin desbordamiento horizontal.
- **Estado activo (D-V4 aprobada):** se implementará un Client Component pequeño
  `SiteNav` que usa `usePathname` para comparar la ruta actual y aplicar
  `aria-current="page"`. `SiteHeader` sigue siendo Server Component y renderiza
  `<SiteNav />`; el layout raíz no se convierte en cliente. Esta decisión es
  arquitectónica y **no se implementa en esta tarea**.
- **Rutas y coincidencia (evita falsos activos):** `SiteNav` recibe la lista de
  enlaces y compara `usePathname()` con cada `href`. Reglas:
  - `/` solo está activo con comparación exacta (`pathname === "/"`); usar
    `startsWith("/")` marcaría «Inicio» en todas las rutas.
  - `/search` y `/about` están activos si `pathname === href` o
    `pathname.startsWith(href + "/")`.
  - `/contact/new` solo está activo en esa ruta (o en subrutas con
    `href + "/"`), nunca en `/contact/[id]` ni en `/contact/[id]/edit`.
  - En `/contact/[id]` y `/contact/[id]/edit` no se marca ningún enlace de la
    barra como activo: el detalle y la edición no están representados en ella.
  - Solo un enlace lleva `aria-current="page"` a la vez.
- **Desplazamiento a anclas:** el documento raíz usa `scroll-padding-top` y los
  destinos con `id` usan `scroll-margin-top`, para que la barra sticky no oculte
  el título ni el foco. Valores propuestos: `112px` en móvil (barra de dos filas)
  y `88px` desde `sm`; se ajustan si la altura real cambia.
- **Si en el futuro se usa `fixed`:** reservar en el contenido un `padding-top`
  igual a la altura real de la barra. Con `sticky` no se necesita ese espacio.
- El enlace «Saltar al contenido» se añadirá como primer elemento focusable
  (pendiente de implementación).
- **No** se usa sidebar: el MVP es de una sola colección de contactos.

### 5.2 Botones

**Alturas:** `sm` 32 px, `md` 40 px, `lg` 48 px. En móvil, la acción principal
usa `lg` o ancho completo. Radio: 10 px (`md`) / 12 px (`lg`) (P-V3).

| Variante | Fondo | Texto | Borde | Hover | Uso |
|---|---|---|---|---|---|
| **Primario** | `--color-primary` | `--color-on-primary` | Ninguno | `--color-primary-hover` | Guardar, crear, confirmar. |
| **Secundario** | `--color-surface` | `--color-text` | `--color-border-strong` | `--color-surface-hover` + borde `--color-primary` | Cancelar, acciones alternativas. |
| **Terciario / ghost** | Transparente | `--color-muted` | Ninguno | `--color-text` + fondo `--color-surface` | Enlaces de acción, «Volver». |
| **Peligro (outline)** | Transparente | `--color-danger-text` | `--color-danger` | Fondo `--color-error-surface` | Borrar un contacto. |
| **Peligro (relleno)** | `--color-danger` | `--color-on-danger` | Ninguno | Aclarar 8 % | Confirmación final de borrado. |

Estados:

- **Hover:** transición de 150 ms solo de color, borde y fondo.
- **Active:** bajar la luminosidad; sin `scale` para no mover el layout.
- **Focus:** anillo de 2 px `--color-focus` con `outline-offset: 2px`; nunca se
  elimina el outline.
- **Disabled:** fondo `--color-bg-subtle`, texto `--color-text-disabled`, borde
  `--color-border`; `cursor: not-allowed`; `aria-disabled="true"` cuando
  corresponda. El estado no depende solo del color: se reduce la opacidad y se
  mantiene el texto legible.
- **Loading:** spinner de 16 px + texto «Guardando…»; el botón conserva su
  ancho para evitar saltos.

Reglas:

- Un solo botón primario por bloque de acciones (P-V5).
- Los botones de icono tienen 40×40 px como mínimo y `aria-label`.
- No se usan botones con solo icono para acciones destructivas.

### 5.3 Inputs y formularios

**Anatomía:** etiqueta visible + control + ayuda/error.

- Etiqueta: 13 px, peso 500, color `--color-text`, separada 6 px del control.
- Control: altura 40 px en escritorio y 44 px en móvil; fondo
  `--color-surface`; borde 1 px `--color-border-strong`; radio 10 px; padding
  horizontal 12–14 px; texto 16 px (evita el zoom automático en iOS).
- Placeholder: `--color-placeholder` (`#8A9EB4` en oscuro, 6.29:1 sobre
  `surface`; `#5A6E86` en claro, 5.24:1 sobre `surface`). No se usa opacidad
  sobre `muted`: al 70 % daría 4.41:1, por debajo de 4.5:1. El placeholder nunca
  sustituye a la etiqueta y desaparece al escribir.
- Foco: borde `--color-primary` + anillo de 2 px `--color-focus` con offset 2 px.
- Error: borde `--color-danger`, icono + mensaje de 12–13 px
  `--color-danger-text`; `aria-invalid="true"` y `aria-describedby` apuntando al
  mensaje.
- Ayuda: 12–13 px `--color-muted`, debajo del control.
- Deshabilitado: fondo `--color-bg-subtle`, texto `--color-text-disabled`,
  borde `--color-border`; no se usa solo opacidad.
- `select`: mismo estilo, chevron SVG inline de 16 px, sin `appearance` nativo
  inconsistente.
- `textarea`: mínimo 4 líneas, `resize: vertical`.
- Checkbox: 20×20 px, borde `--color-border-strong`, check cian sobre fondo
  `--color-primary` cuando está marcado; etiqueta clicable.
- Búsqueda: icono de lupa a la izquierda, altura 44 px, botón de limpiar de
  32×32 px cuando haya texto (cliente, M6).
- Agrupación: campos relacionados en `fieldset` con `legend` visible o
  visualmente oculto; separación de 16–24 px entre campos.
- Acciones del formulario: al final, alineadas a la derecha en escritorio y a
  ancho completo en móvil; la primaria a la derecha del DOM o primera en móvil.

### 5.4 Tarjetas de contacto

**Anatomía:** avatar + nombre + badge de categoría + línea de contacto +
favorito + acciones.

- Fondo `--color-surface`; borde 1 px `--color-border`; radio 14 px (P-V3);
  padding 16 px móvil / 20 px escritorio.
- Sin sombra por defecto (P-V4). Hover: borde `--color-primary` al 40 % y fondo
  `--color-surface-hover`; transición 150 ms.
- Avatar 48 px; nombre 16 px/600; línea secundaria 14 px `--color-muted`.
- Badge de categoría junto al nombre o debajo; nunca flotando sin contexto.
- Favorito en la esquina superior derecha, objetivo de 40×40 px.
- Acciones (editar, borrar) siempre visibles o accesibles con `focus-within`;
  **nunca solo con hover**, porque excluye a teclado y táctil.
- La tarjeta completa no es un enlace si contiene botones: el nombre y el área
  principal enlazan al detalle; los botones quedan fuera del enlace.
- Foco: anillo en el elemento interactivo, no en toda la tarjeta, para no
  confundir.
- En grid, todas las tarjetas tienen la misma altura mínima; el contenido se
  alinea arriba.

### 5.5 Avatares

- Forma circular; tamaños 32, 40, 48 y 64 px.
- **Avatar con imagen: fuera del MVP.** La arquitectura no incluye un campo
  `avatar`; el MVP usa siempre iniciales. Si se añade en el futuro, la imagen
  usará `object-fit: cover` y `alt` con el nombre del contacto.
- Si no hay imagen: iniciales (máximo dos), 14–16 px/600, fondo de la categoría
  (`--color-cat-*-surface`) y texto de la categoría (`--color-cat-*`).
- El color de fondo se deriva de la categoría, no de un hash aleatorio, para que
  sea estable y significativo.
- Borde de 1 px `--color-border` para separar del fondo cuando el avatar es
  oscuro.
- No se usan gradientes en avatares.

### 5.6 Badges de categoría

- Forma píldora (`border-radius: 999px`), altura 24 px, padding 8 px, texto
  12 px/500.
- Fondo `--color-cat-*-surface`, texto `--color-cat-*`, borde 1 px del mismo
  color al 30 % (opcional).
- Incluyen el nombre de la categoría; opcionalmente un punto de 6 px.
- No se usan badges para estados que requieran acción; para eso, botones o
  toasts.
- El badge de favorito, si existe, usa estrella + texto o `aria-label`.

### 5.7 Iconos

> **D-V7 solo prohíbe reutilizar `public/icons.svg`.** La estrategia de
> reemplazo —SVG inline propio y sin librería de iconos— es P-V6 y sigue siendo
> una propuesta pendiente de aprobación.

- Set inline SVG propio, 20 px por defecto y 24 px en navegación (P-V6).
- Trazo 1.75 px, extremos y uniones redondeados, `currentColor`.
- Iconos decorativos: `aria-hidden="true"` y `focusable="false"`.
- Icono solo: dentro de un botón con `aria-label` y objetivo de 40–44 px.
- No se instala una librería de iconos (parte de P-V6, propuesta).
- `public/icons.svg` es un sprite heredado con iconos sociales y colores fijos;
  **no es adecuado** para esta interfaz. No se reutiliza (D-V7); su retirada
  queda para una tarea de limpieza.

### 5.8 Modales de confirmación

- Elemento nativo `<dialog>` con `showModal()` cuando sea posible: aporta
  trampa de foco, `Esc` y backdrop del navegador.
- Fondo `--color-surface-elevated`; borde 1 px `--color-border-strong`; radio
  16 px (P-V3); ancho máximo 480 px; padding 24 px; márgenes de 16 px en móvil.
- Backdrop `--color-surface-overlay` + `backdrop-filter: blur(4px)`.
- Título 20 px/600; descripción 14 px `--color-muted`.
- Acciones: cancelar (secundario) + confirmar (peligro). En escritorio,
  alineadas a la derecha; en móvil, apiladas con la acción principal al final.
- Foco inicial en «Cancelar» (acción segura), no en la destructiva.
- Al cerrar, devolver el foco al botón que abrió el modal.
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` y `aria-describedby`.
- Animación: opacidad + `scale(0.98 → 1)` en 180 ms; con movimiento reducido,
  solo opacidad o nada.
- No se usa un modal para formularios largos; para eso, una página dedicada.

### 5.9 Toasts y notificaciones

- Posición: abajo a la derecha en escritorio; abajo al centro en móvil (P-V2).
- Ancho máximo 360 px; fondo `--color-surface-elevated`; borde 1 px
  `--color-border-strong`; radio 12 px (P-V3); padding 12–16 px; sombra de nivel
  3 (propuesta: P-V4 solo excluye sombras en tarjetas, no en toasts).
- Contenido: icono de estado + mensaje + acción opcional («Deshacer»).
- `role="status"` y `aria-live="polite"` para confirmaciones; `role="alert"`
  para errores.
- **Duración y correspondencia con la ventana real:** la ventana reversible la
  decide PostgreSQL, no la UI. La arquitectura fija `expiresAt = createdAt + 5 s`
  y la restauración solo es válida mientras `expiresAt > clock_timestamp()`.

  | Elemento | Valor | Autoridad |
  |---|---|---|
  | Ventana reversible | 5 s desde `createdAt` | PostgreSQL (`expiresAt`). |
  | Respuesta de la API | `expiresAt` en ISO 8601 | Servidor. |
  | Temporizador visual | `expiresAt − Date.now()` | Cliente. |
  | Fin de la acción | `expiresAt` | Servidor; nunca el temporizador visual. |

  Reglas:
  - **No hardcodear «5 s»** en el toast. Calcular el tiempo restante desde
    `expiresAt`; si la respuesta tarda, el usuario ve el tiempo real que queda.
  - Si el tiempo restante es ≤ 0 al mostrar el toast, no se ofrece «Deshacer»;
    se muestra «La ventana para deshacer expiró».
  - El texto y la barra de progreso usan el tiempo restante redondeado hacia
    abajo. No se anuncia «5 s» si en realidad quedan 4.
  - La pausa al pasar el ratón o al enfocar **solo detiene la animación visual**;
    no extiende la ventana del servidor. Al reanudar, recalcular con `expiresAt`.
  - La barra de progreso usa `restante / 5000`; si hubo latencia, empieza
    parcialmente consumida.
  - Si el servidor responde `410 UNDO_EXPIRED`, la UI lo comunica y retira la
    acción; el servidor sigue siendo la única autoridad.
  - `aria-live` anuncia el resultado inicial y la expiración, no cada segundo.
- Se pausa al pasar el ratón o al enfocar; no se apilan más de 3.
- La acción «Deshacer» tiene un objetivo de 44 px y contraste suficiente.
- Barra de progreso de 2 px opcional; con movimiento reducido se muestra
  estática o se omite.
- No se usa toast para errores de validación de formulario: esos van inline.

### 5.10 Estados vacíos

> Patrón propuesto (P-V8), no una decisión aprobada.

- Contenedor centrado, ancho máximo 420 px, padding vertical 48–64 px.
- Icono de 24–32 px `--color-muted` dentro de un círculo de 56 px con fondo
  `--color-surface`.
- Título 18 px/600; descripción 14 px `--color-muted`, máximo 2 líneas.
- Acción primaria si existe una acción útil («Crear el primer contacto»,
  «Limpiar búsqueda»).
- Ejemplos:
  - Sin contactos: «Tu agenda está vacía» + «Crear contacto».
  - Sin resultados: «No encontramos contactos con “…”» + «Limpiar filtros».
  - Sin favoritos: «Aún no marcaste favoritos» + «Ver todos».
- No se usan ilustraciones grandes ni mensajes humorísticos que oculten la causa.

### 5.11 Estados de carga

- Esqueletos con la misma geometría que el contenido final: título, línea de
  texto, tarjeta.
- Fondo `--color-surface-elevated`; animación de brillo de 1.4 s; con
  `prefers-reduced-motion`, sin animación.
- `aria-busy="true"` en la región que carga y texto visualmente oculto
  «Cargando…».
- Spinner de 16–20 px solo para acciones puntuales (guardar, borrar), no para
  páginas completas.
- `loading.tsx` usa esqueletos, no un spinner central.
- Evitar cambios de layout: reservar la altura de las tarjetas y del header.

### 5.12 Mensajes de error

- **Inline (formulario):** icono + texto bajo el campo; borde del campo en
  `--color-danger`; `aria-invalid` y `aria-describedby`.
- **De página (`error.tsx`):** título «Algo salió mal», explicación breve,
  botón «Reintentar» y enlace «Volver al inicio». Sin stack trace.
- **Crítico (`global-error.tsx`):** mínimo, sin header/footer, con fondo
  `--color-bg`; botón «Reintentar».
- **Toast de error:** para fallos de red o de acción, no para validación.
- **Nunca** se comunica un error solo con color rojo: siempre icono + texto.
- Los mensajes no culpan al usuario ni exponen detalles internos.

---

## 6. Composición y layouts

### 6.1 Contenedores

| Contenedor | Ancho máximo | Uso |
|---|---|---|
| **Contenido** | 1024 px (`max-w-5xl`) | Header, footer, lista, detalle, búsqueda. |
| **Lectura** | 720 px | About, texto corrido, estados vacíos. |
| **Formulario** | 640 px (P-V9) | Crear y editar contacto. |
| **Diálogo** | 480 px | Modales de confirmación. |

Padding horizontal: 16 px móvil, 24 px tablet, 32 px escritorio. El contenido
nunca toca el borde de la ventana.

> **Decisión aprobada (D-V3):** 1024 px es el ancho definitivo. Mantiene
> coherencia con el `max-w-5xl` que ya usan `SiteHeader` y `SiteFooter`, y es
> suficiente para una agenda personal. No se evalúa 1120 px en el MVP.

### 6.2 Espaciado

Escala base de 4 px:

```text
4, 8, 12, 16, 24, 32, 48, 64, 96
```

- Separación entre secciones: 32 px móvil, 48 px tablet, 64 px escritorio.
- Separación entre título de página y contenido: 24–32 px.
- Separación entre tarjetas: 12 px móvil, 16 px tablet, 24 px escritorio.
- Separación interna de tarjeta: 16–20 px.
- Separación entre label y control: 6 px.
- Separación entre campos: 16–24 px.

### 6.3 Grid

- Móvil: 4 columnas, gap 16 px.
- Tablet: 8 columnas, gap 20 px.
- Escritorio: 12 columnas, gap 24 px.
- Lista de contactos: 1 columna (< 640), 2 columnas (640–1023), 3 columnas
  (≥ 1024). Ancho mínimo de tarjeta: 280 px.
- Formularios: una sola columna; no se usan dos columnas de campos en móvil
  (P-V9).
- Detalle: una columna hasta `lg`; dos columnas (contenido 2/3 + metadatos 1/3)
  a partir de 1024 px (P-V10).

### 6.4 Bento Grid

**Decisión aprobada (D-V5):** no se utiliza Bento Grid en el MVP. La home es una
lista clara con cabecera y barra de búsqueda; el espacio no se rellena con
widgets.

Si en el futuro se evalúa un resumen, solo se usará cuando existan datos
agregados reales:

- Total de contactos.
- Favoritos.
- Distribución por categoría.

Reglas para esa evaluación futura:

- Máximo 4 tiles; ninguno decorativo.
- Un tile puede ser más ancho si contiene la información principal.
- Si no hay datos o la home es una lista simple, **no se usa Bento**.
- En móvil, los tiles se apilan; no se fuerza una retícula de 2×2 ilegible.

### 6.5 Plantillas por ruta

#### `/` — Inicio (lista)

```text
┌──────────────────────────────────────────────┐
│ Header compartido                            │
├──────────────────────────────────────────────┤
│ Contactos                    [+ Nuevo]       │
│ 12 contactos · 3 favoritos                   │
│ [ Buscar… ]                 [☆ Favoritos]    │
│ ┌────────┐ ┌────────┐ ┌────────┐            │
│ │ Tarjeta│ │ Tarjeta│ │ Tarjeta│            │
│ └────────┘ └────────┘ └────────┘            │
├──────────────────────────────────────────────┤
│ Footer                                       │
└──────────────────────────────────────────────┘
```

- Cabecera de página compacta, no un hero de marketing.
- Contador y acción primaria en la misma fila en escritorio; apilados en móvil.
- Barra de búsqueda y filtro de favoritos en una segunda fila.
- La lista es el contenido principal; el espacio vacío se usa para respirar, no
  para rellenar con widgets.

#### `/search` — Búsqueda

- Título «Buscar contactos».
- Campo de búsqueda grande (44 px) con icono.
- Chips de filtro: «Todos», «Favoritos», categorías si se aprueba.
- Contador de resultados y acción «Limpiar filtros».
- Misma tarjeta/lista que la home.
- Estado vacío específico con el término buscado.

#### `/contact/[id]` — Detalle

```text
┌──────────────────────────────────────────────┐
│ ← Volver                                     │
│ [Avatar]  Nombre completo        [☆] [Editar]│
│           [Badge categoría]                  │
│ ┌───────────────────────┐ ┌────────────────┐ │
│ │ Teléfono              │ │ Categoría      │ │
│ │ Correo                │ │ Empresa        │ │
│ │ Empresa               │ │ Creado         │ │
│ └───────────────────────┘ └────────────────┘ │
│ ← Anterior                    Siguiente →    │
└──────────────────────────────────────────────┘
```

- Cabecera con avatar, nombre, badge y acciones.
- Dos columnas en escritorio; una en móvil (P-V10).
- Metadatos en una superficie secundaria, no en otra tarjeta anidada.
- Navegación anterior/siguiente al final, conservando `q`/`fav`/`from` cuando
  existan (arquitectura, `PrevNextNav`).
- El botón de borrar vive en una zona secundaria, separado de «Editar».

#### `/contact/new` y `/contact/[id]/edit` — Formulario

- Título y descripción breve.
- Ancho máximo 640 px, una columna (P-V9).
- Secciones: «Identidad» (nombre, categoría), «Contacto» (teléfono, correo),
  «Detalles» (empresa, favorito).
- Etiquetas visibles; ayudas solo cuando aportan.
- Acciones al final: «Cancelar» (secundario) y «Guardar» (primario).
- En móvil, botones a ancho completo; no se usa una barra fija que tape el
  último campo.
- Errores inline junto al campo; resumen de errores solo si hay más de tres.

#### `/about` — Acerca de

- Columna de lectura de 720 px.
- Título, propósito del proyecto, stack, alcance del MVP y nota de seguridad
  (sin autenticación, no desplegar públicamente).
- Sin tarjetas decorativas ni logos de tecnologías a color; como máximo, una
  lista textual.

#### `not-found`, `error`, `global-error`

- Contenido centrado, ancho máximo 480 px.
- Título claro, explicación de una línea, acción principal.
- Sin header/footer en `global-error`; con ellos en `not-found` y `error`.
- No se muestran códigos internos ni stack traces.

### 6.6 Jerarquía de contenido

1. **Título de página** (`h1`): qué es esta pantalla.
2. **Acción principal**: qué puede hacer el usuario ahora.
3. **Herramientas**: búsqueda, filtros, contadores.
4. **Contenido**: lista, detalle o formulario.
5. **Navegación secundaria**: volver, anterior/siguiente.
6. **Footer**: información del proyecto y nota de seguridad.

---

## 7. Responsive design

### 7.1 Breakpoints

Se usan los breakpoints de Tailwind v4, mobile-first:

| Nombre | Ancho | Uso principal |
|---|---|---|
| Base | 0–639 px | Móvil; una columna. |
| `sm` | ≥ 640 px | Tablet pequeña; dos columnas de tarjetas. |
| `md` | ≥ 768 px | Tablet; navegación en una fila. |
| `lg` | ≥ 1024 px | Escritorio; tres columnas y detalle a dos columnas (P-V10). |
| `xl` | ≥ 1280 px | Escritorio amplio; el contenedor de 1024 px sigue centrado. |

### 7.2 Comportamiento por componente

| Componente | Móvil | Tablet | Escritorio |
|---|---|---|---|
| Header | Marca + nav en dos filas; `min-height: 56px`, altura automática (P-V1). | Una fila; `min-height: 64px`. | Una fila; `min-height: 64px`. |
| Nav | Enlaces con `flex-wrap`, gap 12 px; sin desbordamiento. | Gap 20 px. | Gap 24 px. |
| Lista | 1 columna. | 2 columnas. | 3 columnas. |
| Detalle | 1 columna; acciones bajo el nombre. | 1 columna. | 2 columnas (2/3 + 1/3) (P-V10). |
| Formulario | 1 columna; botones full width. | 640 px centrado (P-V9). | 640 px centrado (P-V9). |
| Modal | Márgenes 16 px; botones apilados. | Centrado; 480 px. | Centrado; 480 px. |
| Toast | Abajo al centro; ancho completo menos 32 px (P-V2). | Abajo a la derecha. | Abajo a la derecha. |
| Bento | No aplica (D-V5). | No aplica. | No aplica. |

### 7.3 Reglas

- Diseñar primero a **320 px**; comprobar 375, 768, 1024 y 1440 px.
- Sin scroll horizontal en ninguna ruta.
- Objetivos táctiles de **44×44 px** en móvil; 40×40 px mínimo en escritorio.
- El texto no se reduce por debajo de 16 px en el cuerpo.
- Las acciones críticas no dependen de hover.
- Las tablas, si se añaden en el futuro, se convierten en listas de tarjetas en
  móvil; no se fuerza scroll horizontal.
- El header sticky (P-V1) no debe tapar el foco ni los destinos de ancla. Usar
  `scroll-padding-top` en el documento y `scroll-margin-top` en los destinos
  (WCAG 2.4.11).
- La navbar puede crecer a dos filas en 320 px; el contenido no se recorta y no
  aparece scroll horizontal.
- Respetar `env(safe-area-inset-*)` si se añade una barra inferior en el futuro.

---

## 8. Animaciones y microinteracciones

### 8.1 Tokens de movimiento

```text
--duration-fast: 120ms;
--duration-base: 180ms;
--duration-slow: 240ms;
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
```

### 8.2 Patrones

Las transiciones de `color`, `background-color`, `border-color` y
`outline-color` de esta tabla son **transiciones de estado**, no animaciones de
movimiento: no desplazan elementos ni alteran el layout.

| Interacción | Movimiento | Duración | Notas |
|---|---|---|---|
| Hover de botón | Color de fondo/borde/texto. | 150 ms | Sin desplazamiento. |
| Hover de tarjeta | Borde + fondo; opcional `translateY(-1px)`. | 150 ms | Solo si no mueve el layout. |
| Foco | Aparición del anillo. | 0 ms | El foco debe ser inmediato. |
| Apertura de modal | Opacidad + `scale(0.98 → 1)`. | 180 ms | `ease-out`. |
| Cierre de modal | Opacidad + `scale(1 → 0.98)`. | 120 ms | `ease-in`. |
| Toast | `translateY(8px) → 0` + opacidad. | 180 ms | Se pausa al enfocar. |
| Cuenta atrás de undo | Texto/barra basados en `expiresAt − now`. | Continua | No hardcodear 5 s; la pausa visual no extiende la ventana. |
| Cambio de estado | Color de fondo/texto. | 150 ms | Sin animar altura. |
| Esqueleto | Brillo de opacidad. | 1.4 s en bucle | Sin movimiento en reduced-motion. |
| Spinner | Rotación. | 800 ms lineal | Solo en acciones puntuales. |
| Aparición de lista | Sin animación de entrada por elemento (P-V7). | — | Evita retardos y distracción. |

### 8.3 Reglas

- Para movimiento y geometría, animar solo `transform` y `opacity`; evitar
  `width`, `height`, `top` y `left`.
- Las transiciones de estado pueden usar `color`, `background-color`,
  `border-color` y `outline-color`. No son animaciones de movimiento y no deben
  desplazar elementos ni alterar el layout.
- Mantener las transiciones de estado en el rango de 120–240 ms. Las duraciones
  de los bucles (esqueleto, spinner) no son transiciones de estado.
- No animar `box-shadow` ni `filter` en listas largas.
- No usar animaciones de entrada en cada tarjeta (P-V7): la página debe estar
  lista para leer de inmediato.
- No usar parallax, rebotes ni animaciones de scroll.
- Las transiciones de navegación las gestiona Next.js; no se añade una librería
  [R]. Una transición de vista personalizada queda para una decisión posterior.
- `prefers-reduced-motion: reduce`: reducir animaciones y transiciones a 0.01 ms,
  desactivar `scroll-behavior: smooth` y evitar transformaciones. La información
  debe seguir siendo visible sin movimiento.
- No se instalan bibliotecas de animación [R].

---

## 9. Accesibilidad

### 9.1 Contraste (WCAG 2.2 AA)

**Umbrales aplicados:**

- Texto normal: **≥ 4.5:1**.
- Texto grande (≥ 24 px, o ≥ 18.66 px en negrita): **≥ 3.0:1**.
- Componentes de interfaz, bordes de control y elementos gráficos:
  **≥ 3.0:1**.

**Fórmula:** luminancia relativa de WCAG 2.x con el umbral corregido
**0.04045** (Apéndice A). Todos los ratios se recalcularon; no se conserva
ninguno sin verificar. Cada fila indica el par exacto de primer plano y fondo.

> **Alcance:** cada ratio verifica **solo el par indicado** en esa fila. Que los
> pares listados cumplan no demuestra que el sistema completo cumpla WCAG: la
> conformidad global exige auditar todos los estados, tamaños, iconos y
> componentes al implementar (§9.10).

#### 9.1.1 Tema oscuro

| Uso | Primer plano | Fondo | Ratio | Mínimo | Cumple el par |
|---|---|---|---|---|---|
| Texto principal | `#E8F1FA` | `#080D16` | 17.04:1 | 4.5 | Sí |
| Texto principal sobre superficie | `#E8F1FA` | `#111B2A` | 15.15:1 | 4.5 | Sí |
| Texto principal sobre elevada | `#E8F1FA` | `#172337` | 13.81:1 | 4.5 | Sí |
| Texto secundario | `#9BAEC4` | `#080D16` | 8.56:1 | 4.5 | Sí |
| Texto secundario sobre superficie | `#9BAEC4` | `#111B2A` | 7.62:1 | 4.5 | Sí |
| Texto deshabilitado | `#6B7E96` | `#111B2A` | 4.16:1 | Exento | Sí (legible) |
| Placeholder | `#8A9EB4` | `#111B2A` | 6.29:1 | 4.5 | Sí |
| Placeholder sobre fondo | `#8A9EB4` | `#080D16` | 7.07:1 | 4.5 | Sí |
| Primario (texto/enlace) | `#00D5FF` | `#080D16` | 11.08:1 | 4.5 | Sí |
| Primario sobre superficie | `#00D5FF` | `#111B2A` | 9.85:1 | 4.5 | Sí |
| Texto sobre primario | `#041018` | `#00D5FF` | 10.95:1 | 4.5 | Sí |
| Texto sobre primario hover | `#041018` | `#5CE6FF` | 13.01:1 | 4.5 | Sí |
| Texto sobre primario activo | `#041018` | `#00B8DE` | 8.16:1 | 4.5 | Sí |
| Secundario texto | `#9A90FF` | `#080D16` | 7.23:1 | 4.5 | Sí |
| Secundario texto sobre superficie | `#9A90FF` | `#111B2A` | 6.43:1 | 4.5 | Sí |
| Secundario texto sobre elevada | `#9A90FF` | `#172337` | 5.86:1 | 4.5 | Sí |
| Texto sobre secundario | `#080D16` | `#786BFF` | 4.95:1 | 4.5 | Sí |
| Acento | `#A3FFCB` | `#080D16` | 16.42:1 | 4.5 | Sí |
| Acento sobre superficie | `#A3FFCB` | `#111B2A` | 14.60:1 | 4.5 | Sí |
| Texto sobre acento | `#04140C` | `#A3FFCB` | 15.96:1 | 4.5 | Sí |
| Foco (componente) | `#7CE7FF` | `#080D16` | 13.65:1 | 3.0 | Sí |
| Foco sobre superficie | `#7CE7FF` | `#111B2A` | 12.13:1 | 3.0 | Sí |
| Favorito | `#FFD166` | `#080D16` | 13.49:1 | 4.5 | Sí |
| Favorito sobre superficie | `#FFD166` | `#111B2A` | 12.00:1 | 4.5 | Sí |
| Peligro | `#FF6B81` | `#080D16` | 7.11:1 | 4.5 | Sí |
| Peligro sobre superficie | `#FF6B81` | `#111B2A` | 6.32:1 | 4.5 | Sí |
| Texto de peligro | `#FF8A9A` | `#111B2A` | 7.70:1 | 4.5 | Sí |
| Texto sobre peligro relleno | `#1A060A` | `#FF6B81` | 7.14:1 | 4.5 | Sí |
| Success | `#4ADE80` | `#0F2A1D` | 8.80:1 | 4.5 | Sí |
| Warning | `#FBBF24` | `#2E2410` | 9.14:1 | 4.5 | Sí |
| Error | `#FF8A9A` | `#33141C` | 7.44:1 | 4.5 | Sí |
| Info | `#60A5FA` | `#10233D` | 6.21:1 | 4.5 | Sí |
| Categoría Amigo | `#A3FFCB` | `#10251C` | 13.60:1 | 4.5 | Sí |
| Categoría Trabajo | `#7CC7FF` | `#102132` | 8.92:1 | 4.5 | Sí |
| Categoría Familia | `#FFB4A2` | `#2A1817` | 9.91:1 | 4.5 | Sí |
| Categoría Otro | `#C4B5FD` | `#1D1930` | 9.22:1 | 4.5 | Sí |
| Borde de control | `#557092` | `#111B2A` | 3.39:1 | 3.0 | Sí |
| Borde de control sobre elevada | `#557092` | `#172337` | 3.09:1 | 3.0 | Sí |
| Borde de control sobre fondo | `#557092` | `#080D16` | 3.82:1 | 3.0 | Sí |

#### 9.1.2 Tema claro

| Uso | Primer plano | Fondo | Ratio | Mínimo | Cumple el par |
|---|---|---|---|---|---|
| Texto principal | `#0B1524` | `#F6F9FC` | 17.33:1 | 4.5 | Sí |
| Texto principal sobre superficie | `#0B1524` | `#FFFFFF` | 18.31:1 | 4.5 | Sí |
| Texto secundario | `#52657C` | `#F6F9FC` | 5.66:1 | 4.5 | Sí |
| Texto secundario sobre superficie | `#52657C` | `#FFFFFF` | 5.98:1 | 4.5 | Sí |
| Texto deshabilitado | `#7A8B9E` | `#FFFFFF` | 3.49:1 | Exento | Sí (legible) |
| Placeholder | `#5A6E86` | `#FFFFFF` | 5.24:1 | 4.5 | Sí |
| Placeholder sobre fondo | `#5A6E86` | `#F6F9FC` | 4.96:1 | 4.5 | Sí |
| Primario (texto/enlace) | `#007A99` | `#F6F9FC` | 4.68:1 | 4.5 | Sí |
| Primario sobre superficie | `#007A99` | `#FFFFFF` | 4.95:1 | 4.5 | Sí |
| Texto sobre primario | `#FFFFFF` | `#007A99` | 4.95:1 | 4.5 | Sí |
| Texto sobre primario hover | `#FFFFFF` | `#00657F` | 6.63:1 | 4.5 | Sí |
| Texto sobre primario activo | `#FFFFFF` | `#00536A` | 8.59:1 | 4.5 | Sí |
| Secundario texto | `#5B4DE0` | `#F6F9FC` | 5.55:1 | 4.5 | Sí |
| Secundario texto sobre superficie | `#5B4DE0` | `#FFFFFF` | 5.86:1 | 4.5 | Sí |
| Texto sobre secundario | `#FFFFFF` | `#5B4DE0` | 5.86:1 | 4.5 | Sí |
| Acento | `#0B7A4B` | `#F6F9FC` | 5.10:1 | 4.5 | Sí |
| Acento sobre superficie | `#0B7A4B` | `#FFFFFF` | 5.39:1 | 4.5 | Sí |
| Texto sobre acento | `#FFFFFF` | `#0B7A4B` | 5.39:1 | 4.5 | Sí |
| Foco (componente) | `#0066CC` | `#F6F9FC` | 5.27:1 | 3.0 | Sí |
| Foco sobre superficie | `#0066CC` | `#FFFFFF` | 5.57:1 | 3.0 | Sí |
| Favorito sobre superficie | `#8A5A00` | `#FFFFFF` | 5.93:1 | 4.5 | Sí |
| Peligro | `#C2334D` | `#F6F9FC` | 5.13:1 | 4.5 | Sí |
| Peligro sobre superficie | `#C2334D` | `#FFFFFF` | 5.42:1 | 4.5 | Sí |
| Texto de peligro | `#A81F39` | `#FFFFFF` | 7.19:1 | 4.5 | Sí |
| Texto sobre peligro relleno | `#FFFFFF` | `#C2334D` | 5.42:1 | 4.5 | Sí |
| Success | `#0B6B3A` | `#E8F7EE` | 5.97:1 | 4.5 | Sí |
| Warning | `#8A5A00` | `#FFF6DC` | 5.49:1 | 4.5 | Sí |
| Error | `#A81F39` | `#FDECEF` | 6.31:1 | 4.5 | Sí |
| Info | `#1D4ED8` | `#EAF1FE` | 5.91:1 | 4.5 | Sí |
| Categoría Amigo | `#0B6B3A` | `#E8F7EE` | 5.97:1 | 4.5 | Sí |
| Categoría Trabajo | `#0B5C8A` | `#E8F4FB` | 6.44:1 | 4.5 | Sí |
| Categoría Familia | `#9A3B2A` | `#FDEEE9` | 6.13:1 | 4.5 | Sí |
| Categoría Otro | `#5B3FA8` | `#F1EDFD` | 6.71:1 | 4.5 | Sí |
| Borde de control | `#6E859D` | `#FFFFFF` | 3.81:1 | 3.0 | Sí |
| Borde de control sobre fondo | `#6E859D` | `#F6F9FC` | 3.61:1 | 3.0 | Sí |

#### 9.1.3 Notas

- **Texto grande:** los titulares usan `--color-text` sobre `bg`/`surface`; sus
  ratios (17.04:1 y 15.15:1 en oscuro; 17.33:1 y 18.31:1 en claro) superan
  holgadamente el mínimo de 3.0:1 para texto grande.
- **Texto deshabilitado:** WCAG lo exime del mínimo de 4.5:1, pero se mantiene
  legible (4.16:1 en oscuro; 3.49:1 en claro). No se usa como texto informativo.
- **Bordes decorativos:** `--color-border` (`#223149` en oscuro, `#D5E0EB` en
  claro) no se usa como límite de controles; por eso no se le exige 3:1. Los
  controles usan `--color-border-strong`.
- **Placeholder:** el token dedicado cumple 4.5:1 en ambos temas. No se obtiene
  aplicando opacidad a `--color-muted`.
- **Hover/active:** los pares de texto sobre primario en hover y active también
  se verificaron (13.01:1 y 8.16:1 en oscuro; 6.63:1 y 8.59:1 en claro).
- **Estados:** success, warning, error, info y categorías se validan como texto
  sobre su superficie tintada, no sobre el fondo general.
- Los ratios de componentes se comparan con 3.0:1; los de texto normal, con
  4.5:1.

### 9.2 Foco visible

- Anillo de 2 px `--color-focus` con `outline-offset: 2px`.
- Nunca `outline: none` sin reemplazo.
- El foco debe verse sobre `bg`, `surface` y `surface-elevated`.
- En elementos con fondo cian, usar un anillo oscuro o un doble anillo para
  mantener el contraste.
- Si el header es sticky (P-V1), no debe ocultar el elemento enfocado ni los
  destinos de ancla. Se usa `scroll-padding-top` en el documento raíz y
  `scroll-margin-top` en los elementos con `id`, con los valores definidos en
  §5.1 (112 px en móvil, 88 px desde `sm`). Si la barra cambia de altura, se
  ajustan ambos valores.

### 9.3 Navegación por teclado

- Orden de tabulación lógico: skip link → marca → navegación → contenido →
  acciones → footer.
- Añadir un enlace «Saltar al contenido» como primer focusable (pendiente).
- `Esc` cierra modales y devuelve el foco al disparador.
- Los modales atrapan el foco mientras están abiertos.
- Los enlaces se activan con `Enter`; los botones, con `Enter` y `Espacio`.
- No se usan `div` con `onClick`; se usan `button` o `a`.
- No se exige arrastrar ni gestos complejos.

### 9.4 Estados que no dependen del color

- Favorito: estrella rellena vs. contorno + `aria-pressed` + etiqueta.
- Error: icono + texto + `aria-invalid`; no solo borde rojo.
- Categoría: texto del badge, no solo color.
- Estado activo de navegación: color + `aria-current="page"` + subrayado.
- Éxito: icono + texto, no solo menta.
- Deshabilitado: texto legible + `aria-disabled`/`disabled`, no solo opacidad.

### 9.5 Objetivos interactivos

- Mínimo 44×44 px en móvil; 40×40 px en escritorio.
- Separación mínima de 8 px entre objetivos contiguos.
- Los iconos dentro de botones no reducen el área táctil.
- Los enlaces de texto en párrafos pueden ser más pequeños, pero deben tener
  suficiente separación y subrayado.

### 9.6 Etiquetas y errores

- Cada campo tiene `<label for>` visible.
- Los campos obligatorios se indican con texto, no solo con asterisco.
- El error se asocia con `aria-describedby`; el campo lleva `aria-invalid`.
- Los mensajes de error explican qué corregir, no solo «campo inválido».
- Los grupos de radio/checkbox usan `fieldset` + `legend`.
- Los botones de icono tienen `aria-label`.
- Las imágenes tienen `alt`; las decorativas, `alt=""`.

### 9.7 Movimiento reducido

- Respetar `prefers-reduced-motion: reduce`.
- Desactivar animaciones de brillo, desplazamientos y transiciones no esenciales.
- Mantener la opacidad final y la información visible.
- No usar animaciones automáticas que no se puedan pausar.

### 9.8 Zoom y reflow

- Soporte de zoom al 200 % sin pérdida de contenido.
- Reflow a 320 px sin scroll horizontal.
- No usar alturas fijas que recorten texto al aumentar el tamaño de fuente.
- El texto debe poder espaciarse (line-height 1.5, párrafos 2em, letras 0.12em,
  palabras 0.16em) sin romper el layout.

### 9.9 Semántica y estructura

- `header`, `nav`, `main`, `footer` como landmarks.
- Un solo `h1` por página; jerarquía de encabezados sin saltos.
- `lang="es"` en `<html>` (ya existe).
- Enlaces con texto descriptivo; evitar «clic aquí».
- `aria-live` para resultados de acciones (borrar, deshacer).
- `aria-busy` en regiones que cargan.
- No usar `tabindex` positivo.

### 9.10 Checklist WCAG 2.2 AA

La checklist se aplica **al implementar**, no en esta tarea documental. Los
ratios de §9.1 cubren únicamente los pares enumerados; el resto de la
conformidad WCAG (estados, iconos, tamaños, componentes completos) requiere una
auditoría posterior. Ninguna afirmación de este documento debe leerse como
certificación global de accesibilidad.

- [ ] Contraste de texto y controles verificado en **ambos temas** con los pares
      de §9.1 (4.5:1 texto normal, 3.0:1 componentes).
- [ ] Placeholder con `--color-placeholder`, nunca `muted` con opacidad.
- [ ] Foco visible en todos los interactivos, incluido el header sticky si se
      aprueba P-V1.
- [ ] Navegación completa por teclado.
- [ ] Skip link funcional como primer focusable.
- [ ] Objetivos táctiles ≥ 44 px.
- [ ] Formularios con etiquetas y errores asociados.
- [ ] Estados no dependientes solo del color.
- [ ] Movimiento reducido respetado.
- [ ] Zoom 200 % y reflow 320 px sin scroll horizontal.
- [ ] Header a dos filas en 320 px sin recortes ni desbordamiento.
- [ ] `scroll-padding-top` / `scroll-margin-top` impiden que el header tape el
      foco o los títulos de ancla.
- [ ] Landmarks y jerarquía de encabezados correctos.
- [ ] Modales con foco atrapado y retorno de foco.
- [ ] Toasts anunciados con `aria-live`; la cuenta atrás de undo usa el tiempo
      restante real de `expiresAt`.
- [ ] Sin contenido que parpadee más de 3 veces por segundo.
- [ ] El cambio de tema no produce destello del tema incorrecto ni errores de
      hidratación.

---

## 10. Aplicación a las páginas existentes y previstas

### 10.1 Estado actual (M1.1)

Las páginas son placeholders informativos. No hay componentes de contacto,
formularios ni datos. El layout raíz usa utilidades de Tailwind con la paleta
`slate` y no hay tokens semánticos ni tipografía personalizada.

**No se modifica nada en esta tarea.** La tabla siguiente muestra la traducción
prevista cuando se implemente el sistema:

| Elemento actual | Clase actual | Token futuro |
|---|---|---|
| Fondo del `body` | `bg-white dark:bg-slate-950` | `bg-bg` |
| Texto del `body` | `text-slate-900 dark:text-slate-100` | `text-text` |
| Borde del header | `border-slate-200 dark:border-slate-800` | `border-border` |
| Enlaces de navegación | `text-slate-600 dark:text-slate-400` | `text-muted` |
| Hover de enlaces | `hover:text-slate-900 dark:hover:text-slate-100` | `hover:text-text` |
| Footer | `text-slate-500 dark:text-slate-400` | `text-muted` |
| Enlaces de contenido | `text-blue-700 dark:text-blue-400` | `text-primary` |

### 10.2 Correspondencia por ruta

| Ruta | Estado | Componentes previstos | Notas visuales |
|---|---|---|---|
| `/` | Placeholder | `ContactList`, `ContactCard`, `SearchField`, `FavoritesToggle`, `DeleteAllDialog` | Lista clara; sin Bento (D-V5). |
| `/search` | Placeholder | `SearchField`, filtros, `ContactList` | Misma tarjeta; contador y estado vacío. |
| `/contact/new` | Placeholder | `ContactForm` (cliente) | Una columna, 640 px (P-V9). |
| `/contact/[id]` | Placeholder | Detalle RSC, `FavoriteButton`, `DeleteButton`, `PrevNextNav` | Dos columnas en escritorio (P-V10). |
| `/contact/[id]/edit` | Placeholder | `ContactForm` (cliente) | Igual que creación, con datos precargados. |
| `/about` | Placeholder | Contenido estático | Columna de lectura de 720 px. |
| `not-found` | Implementado | Estado vacío | Centrado, 480 px. |
| `error` | Implementado | Boundary cliente | Título + reintento. |
| `global-error` | Implementado | Boundary cliente | Sin header/footer. |
| `loading` | Implementado | Esqueletos | Misma geometría que la lista. |

Todas las rutas, incluidas las de error, deben renderizar correctamente en tema
oscuro (predeterminado) y claro. Ninguna ruta puede asumir un solo tema ni
depender de `prefers-color-scheme` para elegirlo (D-V1, D-V8, D-V9).

### 10.3 Orden de implementación recomendado

1. **Documento aprobado:** D-V1–D-V9 están cerradas (§11.1). No se reabren sin
   una petición explícita.
2. Implementar tokens de **ambos temas**, tipografía y estilos base en
   `globals.css` y `layout.tsx`, junto con el script anti-flash de §3.10, en una
   tarea de estilización dedicada (no en M1.2 si M1.2 es solo arquitectura de
   componentes).
3. Refactorizar `SiteHeader` y `SiteFooter` para usar tokens y añadir `SiteNav`
   (Client Component pequeño con `usePathname`, D-V4). El header y el layout
   siguen siendo Server Components.
4. Construir los componentes de contacto en los hitos M5–M6, según la
   arquitectura, incluido `ThemeToggle` en M6.
5. Auditoría de accesibilidad y checklist de §9.10 en M7, en ambos temas.

Ninguno de estos pasos se ejecuta en esta tarea documental.

---

## 11. Decisiones aprobadas, propuestas y restricciones

### 11.1 Decisiones aprobadas (D-V1–D-V9)

Las nueve decisiones están **cerradas y aprobadas**. No se reabren sin una
petición explícita del usuario.

| ID | Decisión aprobada | Opción elegida | Consecuencia |
|---|---|---|---|
| **D-V1** | Dark-first: el tema oscuro es el predeterminado y la identidad principal. | **(a)** | El tema claro sigue soportado (D-V8); no es dark-only. §13.3 de la arquitectura (N-05) ya está sincronizado. |
| **D-V2** | Geist Sans + Geist Mono. | **(a)** | Familias fijadas: Geist Sans + Geist Mono. Mecanismo de carga pendiente: `next/font/local` o `next/font/google`; pila del sistema solo como *fallback*. Inter no forma parte de D-V2. |
| **D-V3** | Contenedor de 1024 px. | **(a)** | Coincide con el `max-w-5xl` de `SiteHeader` y `SiteFooter`. |
| **D-V4** | Navegación activa con `usePathname` en un Client Component pequeño. | **(b)** | `SiteNav` es cliente; `SiteHeader` y el layout raíz siguen siendo Server Components. |
| **D-V5** | Sin Bento Grid inicialmente. | **(a)** | La home es una lista clara; se reevalúa solo con datos agregados reales. |
| **D-V6** | Mapa de colores aprobado para Amigo, Trabajo, Familia y Otro. | **(a)** | Badges y avatares usan colores estables por categoría, siempre con texto. |
| **D-V7** | No reutilizar `public/icons.svg`. | **(a)** | No se reutiliza el sprite. La estrategia de reemplazo (P-V6) sigue siendo una propuesta; la retirada del sprite queda para una tarea de limpieza. |
| **D-V8** | Soportar tema oscuro y claro; oscuro predeterminado. | **(b)** | Ambos temas tienen tokens completos y ratios verificados **por par** en §9.1; la conformidad WCAG global se audita al implementar (§9.10). |
| **D-V9** | Persistir el tema con `localStorage` y clase en el elemento raíz. | **(a)** | Sin cookies; script anti-flash en `<head>` y `suppressHydrationWarning` en `<html>`. |

La coherencia entre D-V1, D-V8 y D-V9 se desarrolla en §3.9 y §3.10: oscuro por
defecto, claro totalmente soportado, persistencia en cliente y sin
`prefers-color-scheme` como selector de tema.

### 11.2 Decisiones propuestas (no bloqueantes)

| ID | Propuesta |
|---|---|
| **P-V1** | Header **sticky** con blur solo en la barra; `min-height` y altura automática. |
| **P-V2** | Toasts abajo a la derecha en escritorio y abajo al centro en móvil. |
| **P-V3** | Radios de 10–12 px en controles y 14–16 px en superficies. |
| **P-V4** | Sin sombras en tarjetas; elevación por superficie y borde. |
| **P-V5** | Una sola acción primaria por vista. |
| **P-V6** | Iconos inline SVG propios, sin librería. |
| **P-V7** | Sin animación de entrada por tarjeta. |
| **P-V8** | Estados vacíos con acción útil, sin ilustraciones grandes. |
| **P-V9** | Formularios de una columna y 640 px. |
| **P-V10** | Detalle a dos columnas solo en `lg`. |

### 11.3 Restricciones técnicas

| ID | Restricción | Consecuencia |
|---|---|---|
| **R-V1** | N-05 exige tokens `--color-bg`, `--color-surface`, `--color-text`, `--color-muted`, `--color-border`, `--color-accent`, `--color-danger`, `--color-focus`. | No renombrar; las extensiones son adicionales. |
| **R-V2** | Sin CSS Modules, sin librerías de UI, sin `styled-components`. | Tailwind v4 + variables CSS. |
| **R-V3** | Sin bibliotecas de animación. | CSS nativo y transiciones. |
| **R-V4** | Server Components por defecto. | `SiteNav`, `ThemeToggle`, `SearchField`, `FavoriteButton`, `DeleteButton`, `UndoToast`, `DeleteAllDialog` y `ContactForm` serán cliente en su hito. |
| **R-V5** | `error.tsx` y `global-error.tsx` deben ser cliente. | No se puede eliminar `'use client'` de esos archivos. |
| **R-V6** | El MVP no tiene autenticación. | El footer debe mantener la nota de seguridad; no se diseñan pantallas de login. |
| **R-V7** | No hay fuentes ni imágenes de marca en el repositorio. | El mecanismo de carga de Geist está pendiente de selección entre `next/font/local` y `next/font/google`. `hero.png` e `icons.svg` no constituyen un sistema de diseño. |
| **R-V8** | `next/font/google` requiere red en build y no tiene fallback automático. | Si el CI es offline, usar `next/font/local` con archivos versionados o la pila del sistema como *fallback*. |
| **R-V9** | La arquitectura §13.3 (N-05) debe permanecer sincronizada con D-V1, D-V8 y D-V9. | Ya refleja oscuro por defecto, claro soportado y `localStorage`; no reintroducir `prefers-color-scheme` como selector ni un modo «sistema». |
| **R-V10** | No se implementan componentes en esta tarea. | Cualquier cambio de código queda para un hito posterior. |

### 11.4 Recomendaciones finales

1. **Implementar primero los tokens de ambos temas** junto con el script
   anti-flash de §3.10; es el cambio de mayor impacto y el que evita el destello
   del tema incorrecto.
2. **Mantener el mismo conjunto de tokens en oscuro y claro.** Un tema
   incompleto no es aceptable (D-V8).
3. **No implementar componentes visuales todavía.** Primero tokens, tipografía y
   layout; después componentes en M5–M6.
4. **Aislar `SiteNav` y `ThemeToggle` como Client Components pequeños.** El
   header, el layout y las páginas permanecen en el servidor.
5. **Mantener el alcance del MVP.** Sin sidebar, sin dashboard, sin métricas
   decorativas. La agenda debe ser rápida de leer y de usar.
6. **Validar contraste con herramienta automatizada** antes de cerrar la
   implementación, además de la revisión manual y de los pares de §9.1.
7. **Probar a 320 px, con teclado y en ambos temas** desde el primer componente,
   no al final.
8. **Documentar cualquier token nuevo** en este archivo o en el documento de
   arquitectura; no introducir hexadecimales sueltos.
9. **Mantener sincronizada §13.3 de la arquitectura** (que desarrolla N-05) con
   D-V1, D-V8 y D-V9. Ya refleja el tema oscuro por defecto; no se reintroduce
   `prefers-color-scheme` como selector ni un modo «sistema».

---

## Apéndice A. Método de cálculo de contraste

Los ratios se calcularon con la luminancia relativa de WCAG 2.x:

```text
L = 0.2126·R + 0.7152·G + 0.0722·B
ratio = (L_claro + 0.05) / (L_oscuro + 0.05)
```

Donde cada canal se normaliza a 0–1 y se linealiza con el umbral corregido
**0.04045**:

```text
c = c / 255
c_lin = c ≤ 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ^ 2.4
```

El umbral anterior `0.03928` es una errata de versiones antiguas de la
especificación. Todos los ratios de §9.1 se recalcularon con `0.04045`; la
diferencia a dos decimales es mínima, pero el método documentado es el correcto.

Los valores de este documento son verificables y deben recalcularse si se
cambia cualquier color. Cada fila de §9.1 indica el par exacto de primer plano y
fondo.

## Apéndice B. Archivos consultados

- `docs/fase-3-arquitectura.md` (§4, §13.1–§13.4, N-05, M6–M7). Su §13.3 ya está
  sincronizado con D-V1, D-V8 y D-V9.
- `package.json` (Next.js 16.4.5, Tailwind 4.3.4, React 19.3.1; sin fuentes ni
  librerías de UI).
- `next.config.ts` (vacío), `postcss.config.mjs` (`@tailwindcss/postcss`) y
  `tsconfig.json` (alias `@/*`, `strict`, `noUncheckedIndexedAccess`).
- `src/app/globals.css` (solo `@import "tailwindcss";`).
- `src/app/layout.tsx` (layout raíz con header/footer; sin `next/font`).
- `src/components/layout/SiteHeader.tsx` y `SiteFooter.tsx` (paleta `slate`
  actual, sin tokens).
- `public/` (`favicon.svg`, `hero.png`, `icons.svg`; sin fuentes).

## Apéndice C. Lo que este documento no hace

- No modifica componentes, páginas, `globals.css`, `layout.tsx` ni
  configuraciones.
- No crea componentes visuales ni implementa Tailwind.
- No instala dependencias ni descarga fuentes.
- No modifica Prisma, el esquema ni la arquitectura.
- No modifica `docs/fase-3-arquitectura.md`; su §13.3 (N-05) ya está
  sincronizado con D-V1, D-V8 y D-V9 desde la tarea de arquitectura.
- No crea ramas ni commits.
- No avanza a M1.2.

---

**Fin del documento.** Las decisiones D-V1–D-V9 están aprobadas y registradas en
§11.1. Cualquier implementación queda supeditada a una tarea posterior y a la
aprobación explícita del usuario; este documento no modifica código.
