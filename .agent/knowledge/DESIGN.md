# DESIGN.md — Sistema de Control de Asistencia Estudiantil

> Este archivo es la fuente de verdad del sistema de diseño del proyecto.
> Todo agente (Antigravity, Stitch, Claude Code) debe consultarlo antes de
> generar, modificar o revisar cualquier componente de la interfaz.

---

## 1. Identidad Visual
ññ
**Nombre del proyecto:** Asistencia de Telecomunicaciones
**Institución:** Unidades Tecnológicas de Santander
**Propósito:** Registro y control de asistencia estudiantil universitaria
**Audiencia principal:** Docentes y personal administrativo
**Tono visual:** Limpio, institucional, confiable — acorde a la identidad visual de la UTS

**Concepto de diseño:** *"Claridad como disciplina"*
La interfaz debe comunicar orden y precisión. Cada píxel tiene una razón. El diseño
no llama la atención sobre sí mismo — facilita el trabajo.

---

## 2. Paleta de Colores

```css
:root {
  /* ── Identidad UTS ── */
  --color-primary:        #6B2D8B;   /* Morado UTS — acciones principales */
  --color-primary-light:  #F3EBF8;   /* Fondos de destacado suave */
  --color-primary-dark:   #4E1F68;   /* Hover y estados activos */

  --color-accent:         #8DC63F;   /* Verde lima UTS — acentos y highlights */
  --color-accent-light:   #F2F9E7;   /* Fondo suave de acento */
  --color-accent-dark:    #6A9E2F;   /* Hover del acento */

  /* ── Neutros ── */
  --color-bg:             #F8F9FC;   /* Fondo general de la app */
  --color-surface:        #FFFFFF;   /* Cards, modales, paneles */
  --color-border:         #E2E6EF;   /* Bordes sutiles */
  --color-muted:          #8A93A8;   /* Texto secundario, placeholders */

  /* ── Texto ── */
  --color-text-primary:   #1A1A2E;   /* Títulos y texto principal */
  --color-text-secondary: #4B5563;   /* Descripciones y labels */

  /* ── Estado de asistencia ── */
  --color-present:        #8DC63F;   /* Verde lima UTS — Presente */
  --color-present-bg:     #F2F9E7;
  --color-absent:         #DC2626;   /* Rojo — Ausente */
  --color-absent-bg:      #FEF2F2;
  --color-late:           #D97706;   /* Ámbar — Tardanza */
  --color-late-bg:        #FFFBEB;
  --color-excused:        #6B2D8B;   /* Morado UTS — Justificado */
  --color-excused-bg:     #F3EBF8;
}
```

**Paleta institucional UTS:**
- **Morado** `#6B2D8B` → color principal, botones, navegación activa, encabezados
- **Verde lima** `#8DC63F` → acentos, estado Presente, highlights positivos
- **Blanco** `#FFFFFF` → superficies, cards, fondos de contenido

**Regla de uso:** El morado `--color-primary` solo aparece en botones primarios, links activos
y elementos de navegación seleccionados. El verde lima `--color-accent` se usa para
indicadores positivos, estado Presente y elementos de progreso. No mezclar ambos
en el mismo componente salvo en el logo o branding institucional.

---

## 3. Tipografía

```css
/* En index.html o main.css */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');

:root {
  --font-sans: 'DM Sans', sans-serif;   /* UI general */
  --font-mono: 'DM Mono', monospace;    /* Códigos, IDs, porcentajes */
}
```

| Uso                  | Fuente      | Peso | Tamaño        |
|----------------------|-------------|------|---------------|
| Título de página     | DM Sans     | 600  | 1.5rem (24px) |
| Subtítulo / sección  | DM Sans     | 500  | 1.125rem      |
| Cuerpo de texto      | DM Sans     | 400  | 0.875rem      |
| Label de formulario  | DM Sans     | 500  | 0.8125rem     |
| ID / código / %      | DM Mono     | 400  | 0.875rem      |
| Badge / chip         | DM Sans     | 600  | 0.75rem       |

**Regla:** Sin text-transform uppercase en títulos. Sin decoración italica en UI funcional.

---

## 4. Espaciado y Layout

```css
:root {
  /* Escala de espaciado (base 4px) */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;

  /* Layout */
  --sidebar-width:    240px;
  --topbar-height:    60px;
  --content-max-width: 1200px;
  --card-padding:     var(--space-6);
  --card-radius:      10px;
  --input-radius:     6px;
  --badge-radius:     4px;
}
```

**Estructura de layout principal:**
```
┌─────────────────────────────────────────────┐
│              TopBar (60px)                  │
├──────────────┬──────────────────────────────┤
│              │                              │
│  Sidebar     │   Main Content Area          │
│  (240px)     │   padding: 32px              │
│              │                              │
└──────────────┴──────────────────────────────┘
```

---

## 5. Componentes Base

### 5.1 Botones

```jsx
// Variantes permitidas
<Button variant="primary" />    // Fondo azul — acción principal por vista
<Button variant="secondary" />  // Borde azul, fondo blanco — acción alternativa
<Button variant="ghost" />      // Sin borde — acciones terciarias
<Button variant="danger" />     // Rojo — eliminar o cancelar asistencia
```

**Reglas:**
- Máximo 1 botón `primary` por sección visible
- Altura fija: `36px` (sm) / `40px` (md) / `44px` (lg)
- Padding horizontal: `16px` mínimo
- Siempre incluir `disabled` state con `opacity: 0.5`

### 5.2 Badges de Estado de Asistencia

```jsx
// Uso exclusivo para estado de asistencia
<StatusBadge status="present"  /> // ● Presente   — verde
<StatusBadge status="absent"   /> // ● Ausente    — rojo
<StatusBadge status="late"     /> // ● Tardanza   — ámbar
<StatusBadge status="excused"  /> // ● Justificado — índigo
```

Estructura CSS del badge:
```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: var(--badge-radius);
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}
```

### 5.3 Cards

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--card-radius);
  padding: var(--card-padding);
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

/* NO usar: sombras dramáticas, gradientes de fondo, bordes de color */
```

### 5.4 Tabla de Asistencia

- Header: fondo `#F1F4F9`, texto `var(--color-text-secondary)`, peso 500
- Filas alternas: sin zebra-striping — separar solo con border-bottom `1px solid var(--color-border)`
- Fila hover: fondo `#F8F9FC`
- Celda de nombre: siempre en `var(--color-text-primary)` peso 500
- Celda de porcentaje: usar `DM Mono`
- Alineación: texto a la izquierda, porcentajes y acciones a la derecha

### 5.5 Formularios e Inputs

```css
.input {
  height: 40px;
  border: 1px solid var(--color-border);
  border-radius: var(--input-radius);
  padding: 0 12px;
  font-size: 0.875rem;
  color: var(--color-text-primary);
  background: var(--color-surface);
  transition: border-color 0.15s;
}
.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(27, 79, 216, 0.12);
}
```

### 5.6 Sidebar de Navegación

```
Items de navegación:
- Padding: 10px 16px
- Border-radius: 6px
- Estado activo: fondo var(--color-primary-light), texto var(--color-primary), peso 600
- Estado hover: fondo #F1F4F9
- Ícono: 18px, alineado con texto
- Separadores de sección: línea 1px solid var(--color-border) con label en mayúscula 10px
```

---

## 6. Iconografía

- **Librería:** `lucide-react` (ya incluida por defecto en proyectos Vite+React)
- **Tamaño estándar:** `18px` en navegación, `16px` en botones y tablas, `20px` en títulos
- **Color:** hereda del texto padre — nunca colorear íconos independientemente
- **Íconos clave del proyecto:**

| Función              | Ícono Lucide         |
|----------------------|----------------------|
| Asistencia / Check   | `CheckCircle2`       |
| Ausencia             | `XCircle`            |
| Tardanza             | `Clock`              |
| Justificación        | `FileText`           |
| Estudiantes          | `Users`              |
| Materias / Cursos    | `BookOpen`           |
| Calendario / Fecha   | `CalendarDays`       |
| Exportar reporte     | `Download`           |
| Configuración        | `Settings`           |
| Buscar               | `Search`             |

---

## 7. Animaciones y Transiciones

**Filosofía:** Las animaciones son funcionales, no decorativas. Solo existen para
comunicar cambio de estado o guiar la atención.

```css
:root {
  --transition-fast:   0.12s ease;
  --transition-base:   0.2s ease;
  --transition-slow:   0.35s ease;
}

/* Aplicar a: hover, focus, active states */
/* NO aplicar a: layouts, columnas, tablas completas */
```

**Permitido:**
- Fade-in de cards al cargar: `opacity 0→1` en `0.25s` con `animation-delay` escalonado
- Transición de badge al cambiar estado de asistencia: `background-color 0.15s`
- Slide-in de sidebar en mobile: `transform translateX` en `0.25s ease`

**Prohibido:**
- Bounce, spring, shake en contextos de datos
- Animaciones en tablas con más de 20 filas
- Loaders con más de 1.5s de duración

---

## 8. Vistas y Páginas del Sistema

Cada vista debe seguir esta estructura de encabezado:

```
[Título de vista — DM Sans 600 24px]
[Subtítulo / descripción — DM Sans 400 14px color-text-secondary]
                                    [Acciones principales → botón primary]
────────────────────────────────────────────────────────────────────────
[Contenido principal]
```

**Vistas principales:**
| Ruta              | Vista                              |
|-------------------|------------------------------------|
| `/`               | Dashboard — resumen y estadísticas |
| `/asistencia`     | Registro de asistencia del día     |
| `/estudiantes`    | Listado de estudiantes             |
| `/materias`       | Materias y horarios                |
| `/reportes`       | Reportes y exportación             |
| `/settings`       | Configuración general              |

---

## 9. Datos y Estadísticas

Los KPI cards del dashboard siguen este patrón fijo:

```
┌──────────────────────────┐
│  [Ícono 20px]            │
│                          │
│  [Valor — DM Mono 28px]  │
│  [Label — DM Sans 13px]  │
│  [Δ variación — 12px]    │
└──────────────────────────┘
```

- Porcentajes de asistencia siempre en `DM Mono`
- Barras de progreso: altura `6px`, border-radius `3px`, sin stripes
- Gráficos (si se usan): `recharts` con colores del sistema, sin grid lines horizontales decorativas

---

## 10. Reglas Globales para el Agente

Cuando Antigravity o Stitch generen o modifiquen componentes, deben cumplir:

1. **Usar siempre CSS variables** definidas en este archivo — nunca hardcodear colores o tamaños
2. **No inventar colores** fuera de la paleta definida en la sección 2
3. **No cambiar fuentes** — DM Sans y DM Mono son las únicas permitidas
4. **No agregar sombras dramáticas** — máximo `0 1px 3px rgba(0,0,0,0.06)`
5. **No usar gradientes de fondo** en superficies funcionales
6. **Tailwind:** si se usa, configurar el `tailwind.config.js` para extender con estas variables
7. **Accesibilidad mínima:** contraste AA, `focus-visible` en todos los inputs y botones, `aria-label` en íconos sin texto
8. **Mobile:** sidebar colapsa a bottom navigation en `< 768px`; tablas con scroll horizontal

---

## 11. Prompt de referencia para Stitch MCP

Cuando uses Stitch desde Antigravity, inicia con:

```
Use stitch mcp server to design a [nombre del componente] following the
DESIGN.md file in this project. The design must be clean and minimal,
use DM Sans font, primary color #6B2D8B (UTS purple), accent color
#8DC63F (UTS lime green), white surfaces with subtle borders,
and follow the spacing scale defined in DESIGN.md.
```

---

*Última actualización: Abril 2026 — Mantener este archivo sincronizado con cualquier
cambio visual aprobado por el equipo antes de aplicarlo al código.*
