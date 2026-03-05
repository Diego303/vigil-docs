# AGENTS.md — intake Documentation Website

> Guía de arquitectura, convenciones y patrones del sitio de documentación.
> Diseñada para que cualquier agente de IA o desarrollador entienda la estructura
> y pueda trabajar en el proyecto de forma consistente.

---

## 1. Visión General del Proyecto

Sitio web de documentación estático construido con **Astro**, desplegado en **GitHub Pages**.

**Características principales:**

- Documentación multi-versión (las versiones pueden variar entre idiomas)
- Soporte bilingüe (español como idioma por defecto, inglés con prefijo `/en/`)
- Páginas estáticas (landing y cualquier página adicional que se necesite)
- Docs dinámicos generados desde Content Collections de Astro
- Despliegue automático vía GitHub Actions

**Stack tecnológico:**

| Tecnología | Uso |
|---|---|
| Astro 5.x | Framework principal (SSG) |
| pnpm | Gestor de paquetes |
| GitHub Actions | CI/CD |
| GitHub Pages | Hosting |

> **Nota:** El sistema de diseño visual (colores, tipografía, sombras, espaciado, etc.)
> está documentado en un archivo separado. Este documento no cubre estilos.

---

## 2. Estructura de Directorios

```
/
├── .github/workflows/         # CI/CD (GitHub Actions)
│   └── astro.yaml             # Deploy a GitHub Pages
├── public/                    # Assets estáticos (favicon, imágenes)
├── src/
│   ├── assets/                # SVGs e imágenes usados desde código
│   ├── components/            # Componentes Astro reutilizables
│   │   ├── sections/          # Secciones de la landing page
│   │   └── ui/                # Componentes primitivos (Button, Card, etc.)
│   ├── config/                # Configuración del sitio
│   │   └── versions.ts        # Array de versiones y utilidades
│   ├── content/               # Content Collections (Markdown)
│   │   ├── config.ts          # Esquemas Zod de las colecciones
│   │   ├── docs/              # Docs en español (por versión)
│   │   ├── docs-en/           # Docs en inglés (por versión)
│   │   ├── pages/             # Páginas standalone en español
│   │   └── pages-en/          # Páginas standalone en inglés
│   ├── i18n/                  # Sistema de internacionalización
│   │   ├── ui.ts              # Diccionario de traducciones (todas las cadenas UI)
│   │   └── utils.ts           # Funciones helper de i18n
│   ├── layouts/               # Layout base
│   │   └── Layout.astro       # HTML shell (head, fonts, transitions)
│   ├── pages/                 # Rutas del sitio (ES por defecto)
│   │   ├── index.astro        # Landing page
│   │   ├── docs/
│   │   │   ├── index.astro    # Hub de docs con buscador
│   │   │   └── [...slug].astro # Página de doc individual
│   │   └── en/                # Rutas en inglés (mirror)
│   │       ├── index.astro
│   │       └── docs/
│   │           ├── index.astro
│   │           └── [...slug].astro
│   └── styles/
│       └── global.css         # Variables CSS y utilidades globales
├── astro.config.mjs           # Config de Astro (site, base, i18n)
├── package.json
└── tsconfig.json
```

**Nota sobre las páginas:** La estructura de `src/pages/` crecerá según las necesidades del proyecto. Las páginas estáticas adicionales (roadmap, comparativas, guías, etc.) se añaden como archivos `.astro` en la raíz de `pages/` y su mirror en `pages/en/`. La estructura de docs se mantiene bajo `pages/docs/`.

---

## 3. Sistema de Páginas y Rutas

### 3.1 Filosofía de Routing

Astro genera rutas estáticas a partir de archivos en `src/pages/`. El idioma por defecto (español) no tiene prefijo; el inglés usa `/en/`.

Toda nueva página debe existir en ambos idiomas: un archivo en `src/pages/` y su equivalente en `src/pages/en/`.

### 3.2 Tipos de Páginas

El sitio maneja dos tipos fundamentales de páginas:

**Páginas estáticas:** archivos `.astro` individuales que representan una página completa (landing, roadmap, etc.). Se añaden directamente en `src/pages/` y su mirror en `src/pages/en/`.

**Páginas de documentación:** generadas dinámicamente desde Content Collections. Usan rutas dinámicas (`[...slug].astro`) para crear una página por cada archivo Markdown de la colección.

### 3.3 Estructura de una Página Estática

Toda página estática sigue esta composición:

```astro
---
import Layout from '../layouts/Layout.astro';
import Navbar from '../components/Navbar.astro';
import Footer from '../components/Footer.astro';
import PageComponent from '../components/PageComponent.astro';

const lang = 'es'; // o detectado desde URL
---

<Layout lang={lang}>
  <Navbar lang={lang} />
  <PageComponent lang={lang} />
  <Footer lang={lang} />
</Layout>
```

### 3.4 Estructura de una Página de Doc Individual

Las páginas de documentación individual no incluyen Footer y usan un layout de dos columnas (sidebar + contenido):

```astro
<Layout lang={lang}>
  <Navbar lang={lang} />
  <div class="docs-layout">
    <DocsSidebar
      headings={headings}
      title={entry.data.title}
      versionLabel="v0.1.0"
      backLink="/docs/"
      lang={lang}
    />
    <main class="docs-content">
      <Prose>
        <Content />
      </Prose>
    </main>
  </div>
</Layout>
```

### 3.5 Patrón para Añadir una Página Nueva

Para añadir una nueva página estática (por ejemplo, "comparisons"):

1. Crear `src/pages/comparaciones.astro` (versión ES)
2. Crear `src/pages/en/comparisons.astro` (versión EN)
3. Crear el componente de contenido en `src/components/` (e.g., `ComparisonsPage.astro`)
4. Añadir las traducciones necesarias en `src/i18n/ui.ts`
5. Añadir el enlace en la navegación (`Navbar`) con ambos idiomas
6. Actualizar el mapeo de rutas semánticas en `src/i18n/utils.ts` (`comparaciones` ↔ `comparisons`)

### 3.6 Mapeo Semántico entre Idiomas

Las rutas pueden tener nombres diferentes por idioma. El mapeo se define en `src/i18n/utils.ts` dentro de `getAlternateLangPath()`. Cada vez que se añade una página con nombre diferente entre idiomas, este mapeo debe actualizarse.

---

## 4. Sistema de Content Collections

### 4.1 Colecciones Base

El proyecto define como mínimo **4 colecciones** en `src/content/config.ts`:

| Colección | Idioma | Contenido | Versionada |
|---|---|---|---|
| `docs` | ES | Documentación técnica | Sí |
| `docs-en` | EN | Documentación técnica | Sí |
| `pages` | ES | Páginas standalone (contenido Markdown) | No |
| `pages-en` | EN | Páginas standalone (contenido Markdown) | No |

Las colecciones adicionales se añaden según las necesidades del proyecto. Cada nueva colección que tenga contenido bilingüe requiere una colección separada por idioma (e.g., `tutorials` y `tutorials-en`).

### 4.2 Esquemas Zod

**Docs (`docs` y `docs-en`):**
```typescript
{
  title: z.string().optional(),
  description: z.string().optional(),
  order: z.number().optional(),      // Orden de aparición en el hub
  icon: z.string().optional(),       // SVG path para tarjeta
}
```

**Pages (`pages` y `pages-en`):**
```typescript
{
  title: z.string().optional(),
  description: z.string().optional(),
}
```

Colecciones adicionales definen su propio esquema según sus necesidades, siempre en `src/content/config.ts`.

### 4.3 Estructura de Directorios de Contenido

```
src/content/
├── config.ts                  # Esquemas Zod de todas las colecciones
├── docs/
│   ├── v0-1-0/                # Una carpeta por versión
│   │   ├── getting-started.md
│   │   ├── configuration.md
│   │   └── ...
│   └── v0-2-0/
│       └── ...
├── docs-en/
│   └── v0-1-0/                # No es obligatorio tener todas las versiones
│       └── ...
├── pages/
│   └── *.md                   # Contenido Markdown para páginas standalone ES
└── pages-en/
    └── *.md                   # Contenido Markdown para páginas standalone EN
```

### 4.4 Frontmatter de un Documento Típico

```markdown
---
title: "Configuration"
description: "Complete reference for .intake.yaml and CLI flags."
icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14..."
order: 3
---

# Configuration

Content here...
```

### 4.5 Convención de Nombres

- **Archivos markdown:** kebab-case (`config-reference.md`, `getting-started.md`)
- **Carpetas de versión:** `v{major}-{minor}-{patch}` con guiones (`v0-1-0`, no `v0.1.0`)
- **Slugs generados:** `v0-1-0/getting-started` (carpeta/archivo sin extensión)

---

## 5. Sistema de Versionado

### 5.1 Configuración (`src/config/versions.ts`)

```typescript
interface VersionConfig {
  id: string;       // "v0-1-0" (formato slug)
  label: string;    // "v0.1.0" (formato display)
  latest: boolean;  // Solo una puede ser true
}

const VERSIONS: VersionConfig[] = [
  { id: 'v0-1-0', label: 'v0.1.0', latest: true },
  // ... versiones anteriores
];
```

### 5.2 Funciones Utilitarias

| Función | Propósito |
|---|---|
| `getVersionFromSlug(slug)` | Extrae `v0-1-0` de `v0-1-0/getting-started` |
| `getDocSlug(slug)` | Extrae `getting-started` de `v0-1-0/getting-started` |
| `getVersionsForLang(lang)` | Retorna las versiones disponibles para cada idioma |

### 5.3 Cómo Añadir una Nueva Versión

1. Crear carpeta `src/content/docs/v{X}-{Y}-{Z}/` con los archivos markdown
2. (Opcional) Crear carpeta `src/content/docs-en/v{X}-{Y}-{Z}/` para inglés
3. Añadir entrada en `VERSIONS` de `src/config/versions.ts`
4. Marcar la nueva como `latest: true` y la anterior como `false`
5. Astro genera automáticamente las rutas al hacer build

### 5.4 Versionado Asimétrico

No es obligatorio tener todas las versiones en todos los idiomas. Es común que el español tenga más versiones que el inglés. `getVersionsForLang()` se encarga de filtrar las versiones disponibles para cada idioma.

---

## 6. Sistema de Internacionalización (i18n)

### 6.1 Configuración de Astro (`astro.config.mjs`)

```javascript
i18n: {
  defaultLocale: 'es',
  locales: ['es', 'en'],
  routing: {
    prefixDefaultLocale: false,  // ES en raíz, EN bajo /en/
  },
}
```

### 6.2 Arquitectura del i18n

```
src/i18n/
├── ui.ts       # Objeto con TODAS las cadenas traducidas
└── utils.ts    # Funciones helper
```

### 6.3 Diccionario de Traducciones (`ui.ts`)

Todas las cadenas de texto de la UI se centralizan aquí. Estructura:

```typescript
export const ui = {
  es: {
    layout: { title: "intake — De requisitos a implementación verificada" },
    nav: { docs: "Docs", /* ... otras entradas de navegación */ },
    footer: { copyright: "...", tagline: "..." },
    sidebar: { backToDocs: "...", index: "..." },
    docsHub: { title: "...", subtitle: "...", searchPlaceholder: "..." },
    // ... todas las cadenas de UI, organizadas por sección
  },
  en: {
    // Equivalentes en inglés con la misma estructura de keys
  }
};
```

**Regla fundamental:** nunca hardcodear texto visible al usuario directamente en un componente. Todo pasa por `ui.ts`.

### 6.4 Funciones Helper (`utils.ts`)

```typescript
// Obtener traducción con fallback a español
t(key: string, lang: Lang = 'es'): string

// Obtener array de traducciones
tArray(key: string, lang: Lang = 'es'): string[]

// Detectar idioma desde URL
getLangFromUrl(url: URL): Lang  // '/en/docs/' → 'en', '/docs/' → 'es'

// Generar path localizado
getLocalizedPath(path: string, lang: Lang): string

// Obtener path del idioma alternativo (para toggle)
getAlternateLangPath(url: URL, targetLang: Lang): string
// Incluye mapeo semántico entre idiomas
```

### 6.5 Toggle de Idioma

1. `LangToggle.astro` se renderiza en el `Navbar`
2. Muestra el idioma actual resaltado y el alternativo como enlace
3. Al hacer clic, `getAlternateLangPath()` genera la URL equivalente
4. Si las rutas tienen nombres distintos entre idiomas, el mapeo está en `utils.ts`

### 6.6 Patrón de Props de Idioma

**Todos los componentes** que muestran texto UI reciben `lang: Lang` como prop y usan `t()`:

```astro
---
import { t } from '../i18n/utils';
interface Props { lang: Lang; }
const { lang } = Astro.props;
---

<h2>{t('section.title', lang)}</h2>
```

### 6.7 Cómo Añadir un Nuevo Idioma

1. Añadir locale en `astro.config.mjs` → `locales: ['es', 'en', 'fr']`
2. Crear colecciones de contenido: `docs-fr/`, `pages-fr/`
3. Añadir esquemas en `src/content/config.ts` para las nuevas colecciones
4. Añadir claves `fr` en `src/i18n/ui.ts`
5. Crear carpeta `src/pages/fr/` duplicando la estructura de `src/pages/en/`
6. Actualizar mapeo de rutas semánticas en `utils.ts`
7. Actualizar `getVersionsForLang()` en `versions.ts`

---

## 7. Componentes — Estructura

### 7.1 Layout

| Componente | Archivo | Propósito |
|---|---|---|
| `Layout` | `src/layouts/Layout.astro` | Shell HTML (head, fonts, ClientRouter, slot) |

Recibe `lang` como prop. Carga fuentes, importa estilos globales, activa `ClientRouter` para transiciones entre páginas.

### 7.2 Navegación y Estructura

| Componente | Archivo | Propósito |
|---|---|---|
| `Navbar` | `src/components/Navbar.astro` | Barra de navegación sticky con menú móvil |
| `Footer` | `src/components/Footer.astro` | Pie de página con copyright |
| `DocsSidebar` | `src/components/DocsSidebar.astro` | Sidebar sticky con TOC extraído de headings |
| `LangToggle` | `src/components/LangToggle.astro` | Switch ES/EN en navbar |
| `VersionSelector` | `src/components/VersionSelector.astro` | Dropdown de selección de versión |

### 7.3 Componentes de Página

Los componentes de página se crean según las necesidades. Cada página estática tiene su componente correspondiente en `src/components/`. El componente de landing tiene sus secciones descompuestas en `src/components/sections/`.

### 7.4 Componentes UI Primitivos (`src/components/ui/`)

Componentes base reutilizables: botones, tarjetas, bloques de código, etc. Se crean según las necesidades del proyecto. Cada uno recibe props mínimas y usa estilos scoped.

### 7.5 Componente de Contenido

| Componente | Propósito |
|---|---|
| `Prose` | Wrapper de tipografía para markdown renderizado. Aplica estilos consistentes a headings, links, listas, blockquotes, tablas, código. |

---

## 8. Interactividad (JavaScript del Cliente)

El sitio es mayormente estático. JavaScript del cliente se usa solo donde es estrictamente necesario:

| Feature | Mecanismo |
|---|---|
| Menú hamburguesa | `astro:page-load` event, toggle `aria-expanded` |
| TOC activo (scrollspy) | `IntersectionObserver` con rootMargin |
| Filtro de búsqueda en docs | Input event, filtrado por `data-version` y texto |
| Selector de versión | Change event, toggle `display` de grids |

**Regla:** sin frameworks JS de cliente (React, Vue, Svelte). Todo es Astro nativo con JavaScript vanilla donde se necesite interactividad.

---

## 9. Pipeline de Renderizado

```
1. Build (astro build)
   │
2. getStaticPaths() genera rutas para cada doc
   │
3. getCollection('docs') carga todos los markdown
   │
4. entry.render() → { Content, headings }
   │
5. Layout.astro proporciona shell HTML
   │
6. Navbar + Sidebar + Prose(Content) + Footer
   │
7. Output: archivos .html estáticos en dist/
   │
8. GitHub Actions → GitHub Pages
```

---

## 10. Despliegue (CI/CD)

**Archivo:** `.github/workflows/astro.yaml`

- **Trigger:** Push a rama `main` o dispatch manual
- **Pasos:** Checkout → Setup pnpm → Install deps → Build Astro → Deploy a GitHub Pages
- **Acción:** `withastro/action@v2`

**Configuración de Astro para deploy:**

```javascript
// astro.config.mjs
export default defineConfig({
  site: "https://[usuario].github.io",
  base: "/intake/",
  // ...
});
```

---

## 11. Convenciones y Patrones

### 11.1 Nombrado

| Elemento | Convención | Ejemplo |
|---|---|---|
| Componentes | PascalCase | `DocsSidebar.astro`, `CodeBlock.astro` |
| Archivos markdown | kebab-case | `config-reference.md`, `getting-started.md` |
| Carpetas de versión | `v{major}-{minor}-{patch}` | `v0-1-0/`, `v1-0-0/` |
| Traducciones (keys) | dot notation | `nav.docs`, `footer.copyright` |

### 11.2 Patrones de Componentes

- **Props mínimas:** cada componente recibe solo lo que necesita + `lang`
- **Composición sobre herencia:** las páginas componen componentes, no extienden
- **Estilos scoped:** cada componente usa `<style>` de Astro (scoped por defecto)
- **Sin frameworks JS de cliente:** cero React/Vue/Svelte. Todo Astro nativo
- **Traducciones vía función:** `t('key', lang)` en lugar de archivos JSON por idioma

### 11.3 Patrones de Contenido

- **Un directorio por versión:** cada versión tiene su propia carpeta completa de markdown
- **Colecciones separadas por idioma:** `docs` (ES) y `docs-en` (EN) son colecciones independientes
- **Frontmatter consistente:** todos los docs usan `title`, `description`, `order`, `icon`
- **Versionado asimétrico:** no es obligatorio tener todas las versiones en todos los idiomas

### 11.4 Patrones de Routing

- **Mirror de rutas:** `src/pages/en/` replica la estructura de `src/pages/`
- **Rutas dinámicas:** `[...slug].astro` para docs, `[slug].astro` para entidades individuales
- **Mapeo semántico:** rutas pueden tener nombres diferentes por idioma

---

## 12. Scripts Disponibles

```bash
pnpm dev        # Servidor de desarrollo local
pnpm build      # Build de producción (output en dist/)
pnpm preview    # Preview del build de producción
pnpm astro      # CLI de Astro directo
```

---

## 13. Expectativas para el Agente

El agente que trabaje en este proyecto debe:

- **Mantener la estructura de colecciones:** no mezclar idiomas en una misma colección
- **Seguir el patrón de props `lang`:** todo componente que muestre texto UI debe recibir y usar `lang`
- **No añadir dependencias JS innecesarias:** el sitio funciona sin frameworks de cliente
- **Priorizar accesibilidad:** HTML semántico, aria-labels, contraste adecuado, focus visible
- **Código limpio:** componentes pequeños, responsabilidad única, estilos scoped
- **Probar responsive:** verificar que los cambios funcionan en mobile, tablet y desktop
- **Documentar decisiones:** cuando una decisión técnica no es obvia, explicar brevemente por qué
- **Consultar la guía de diseño:** los estilos visuales están en un documento separado, no inventar colores, fuentes ni patrones visuales sin consultarla