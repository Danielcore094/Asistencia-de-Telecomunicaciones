# AGENTS.md — Reglas de Revisión de Código
# Asistencia de Telecomunicaciones — UTS

> Este archivo es usado por GGA (Gentleman Guardian Angel) para revisar
> el código antes de cada commit. Todo código debe cumplir estas reglas.

---

## 1. Lenguaje y Sintaxis

- Todo el código debe estar en **JavaScript** — sin TypeScript (.ts, .tsx)
- Solo se permiten archivos `.js` y `.jsx`
- No usar `var` — solo `const` y `let`
- No usar `any` ni anotaciones de tipo TypeScript
- Preferir arrow functions sobre function declarations en componentes

---

## 2. Idioma

- Todo el **texto visible al usuario** debe estar en **español**
- Esto incluye: labels, botones, títulos, placeholders, mensajes de error,
  toasts, tooltips, estados vacíos, textos de carga
- Los **nombres de variables, funciones y componentes** deben estar en español
- Los **comentarios en el código** deben estar en español
- Excepciones permitidas en inglés:
  - Palabras reservadas de JavaScript/React/Next.js
  - Nombres de librerías y paquetes
  - Palabras clave de Prisma
  - Métodos HTTP (GET, POST, PUT, DELETE)
  - Nombres de variables de entorno (.env)
  - Convenciones de archivos de Next.js (route.js, page.jsx, layout.jsx)

---

## 3. Colores y Estilos

- **Prohibido** usar colores hardcodeados (hex, rgb, hsl) en JSX o CSS
- Todos los colores deben usar **CSS variables** definidas en DESIGN.md:
  - Color primario: `var(--color-primary)` — morado UTS #6B2D8B
  - Color acento: `var(--color-accent)` — verde lima UTS #8DC63F
  - Fondo: `var(--color-bg)`
  - Superficie: `var(--color-surface)`
  - Borde: `var(--color-border)`
  - Estados de asistencia: `var(--color-present)`, `var(--color-absent)`,
    `var(--color-late)`, `var(--color-excused)`
- Excepción: los colores dentro de `<svg>` o atributos `fill` de recharts
  pueden usar la función helper `v('--color-variable')` para resolver
  variables CSS en runtime

---

## 4. Tipografía

- Solo se permiten las fuentes **DM Sans** y **DM Mono**
- DM Sans para UI general
- DM Mono para IDs, códigos y porcentajes
- No usar otras fuentes

---

## 5. Iconografía

- Solo se permite la librería **lucide-react** para íconos
- Tamaños permitidos: 16px (botones/tablas), 18px (navegación), 20px (títulos)
- Todo ícono sin texto visible debe tener `aria-label`

---

## 6. Componentes React

- Solo **componentes funcionales** — sin class components
- Usar **hooks** para manejo de estado (useState, useEffect, useContext)
- No usar datos hardcodeados en componentes — todo desde la API
- Mostrar estado de carga: "Cargando..." mientras se obtienen datos
- Mostrar estado de error: "Error al cargar los datos" si falla la API
- Mostrar estado vacío en español cuando no hay datos

---

## 7. Llamadas a la API

- Todas las llamadas deben usar las funciones de `/frontend/src/services/api.js`
- No hacer llamadas directas a `fetch` o `axios` fuera de `api.js`
- Siempre manejar errores con try/catch
- Usar los filtros globales del contexto (cursoSeleccionado, codigoSeleccionado,
  grupoSeleccionado, docenteSeleccionado) cuando corresponda

---

## 8. Accesibilidad

- Todos los inputs y botones deben tener estilos `focus-visible`
- Todos los íconos sin texto visible deben tener `aria-label`
- Contraste mínimo AA entre texto y fondo

---

## 9. Estructura y Layout

- El layout principal usa sidebar de 240px + topbar de 60px
- El contenido principal tiene padding de 32px y max-width de 1200px
- No usar sombras más fuertes que `0 1px 3px rgba(0,0,0,0.06)`
- No usar gradientes de fondo en superficies funcionales
- No usar animaciones en tablas con más de 20 filas

---

## 10. Archivos y Carpetas

- No modificar: `node_modules/`, `.next/`, `dist/`, `public/`,
  `prisma/migrations/`, `.env`, `package.json`, `package-lock.json`
- Los archivos de páginas van en `/frontend/src/pages/`
- Los componentes reutilizables van en `/frontend/src/components/`
- Los servicios de API van en `/frontend/src/services/`
- Los contextos van en `/frontend/src/context/`
