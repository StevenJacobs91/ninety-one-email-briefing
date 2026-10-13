# Ninety One Platform — Design System Reference

A complete reference for all design tokens, component patterns, and styling conventions used across the Ninety One Email & Design Briefing Platform. Drop this file into any new project to replicate the look and feel exactly.

---

## Table of Contents

1. [Fonts](#1-fonts)
2. [Colour Tokens](#2-colour-tokens)
3. [Tailwind Config](#3-tailwind-config)
4. [CSS Custom Properties](#4-css-custom-properties)
5. [Global Base Styles](#5-global-base-styles)
6. [Component Patterns](#6-component-patterns)
   - [Buttons](#buttons)
   - [Form Fields](#form-fields)
   - [Cards & Panels](#cards--panels)
   - [Badges & Chips](#badges--chips)
   - [Step Indicators](#step-indicators)
   - [Navigation & Header](#navigation--header)
   - [Overlays & Modals](#overlays--modals)
   - [Toggles](#toggles)
   - [Drag & Drop Zones](#drag--drop-zones)
   - [Empty States](#empty-states)
   - [Feedback & Toasts](#feedback--toasts)
7. [Dark Mode](#dark-mode)
8. [Animation & Transitions](#animation--transitions)
9. [Spacing & Layout](#spacing--layout)
10. [Accessibility Conventions](#accessibility-conventions)
11. [Print Styles](#print-styles)

---

## 1. Fonts

### Font Faces

Four weights of the Ninety One Visuelt family, loaded via CDN:

```css
/* Titles — Display weight */
@font-face {
  font-family: 'Ninety One Visuelt Display';
  src: url('https://weare.ninetyone.com/l/28902/2020-04-27/8vjg6b/28902/241047/NinetyOneVisueltDisplay_Regular.woff') format('woff');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

/* Headings — Regular weight */
@font-face {
  font-family: 'Ninety One Visuelt';
  src: url('https://weare.ninetyone.com/l/28902/2020-04-27/8vjg6b/28902/241047/NinetyOneVisueltDisplay_Regular.woff') format('woff');
  font-weight: 200;
  font-style: normal;
  font-display: swap;
}

/* Body / UI copy — Light weight */
@font-face {
  font-family: 'Ninety One Visuelt Light';
  src: url('https://weare.ninetyone.com/l/28902/2020-10-19/8zs4jq/28902/1603114661MAzRiC9E/NinetyOneVisuelt_Light.woff') format('woff');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

/* Bold / emphasis — Medium weight */
@font-face {
  font-family: 'Ninety One Visuelt Medium';
  src: url('https://weare.ninetyone.com/l/28902/2020-07-13/8x6784/28902/249453/NinetyOneVisuelt_Medium.woff') format('woff');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
```

### Font Role Mapping

| Role | Family | Tailwind utility | Element |
|---|---|---|---|
| Page titles | Visuelt Display | `font-ni-display` | `h1`, `h2` |
| Section headings | Visuelt Regular | `font-ni-heading` | `h3`–`h6`, labels, nav |
| Body / UI copy | Visuelt Light | `font-ni-body` or `font-sans` | `body`, `p`, inputs |
| Emphasis / strong | Visuelt Medium | `font-ni-medium` | `strong`, `b` |

### Base font stack (fallbacks)

```
'Ninety One Visuelt Light', system-ui, arial, helvetica, sans-serif
```

---

## 2. Colour Tokens

### Brand Palette

| Name | Hex | Usage |
|---|---|---|
| **Leatherback Green** | `#134848` | Primary — nav bar, CTA buttons, focus rings |
| **Leatherback Hover** | `#0d3232` | Hover state for primary buttons |
| **Marula Green** | `#0a3323` | Secondary — Review/Submit CTA only |
| **Marula Hover** | `#071f15` | Hover state for secondary CTA |
| **Cape Coral** | `#fbaa96` | Accent — highlighted labels, active tabs, dark-mode rings |
| **Coral Muted** | `#f9896e` | Darker coral (3:1 on white for large text) |
| **Coral Text** | `#a0482e` | Accessible coral for body text (4.5:1 on white) |

### Surface & Background

| Name | Hex (light) | Hex (dark) | Usage |
|---|---|---|---|
| Page background | `#f0ece4` | `#1a1714` | `bg-brand-bg-warm` |
| Panel / step guide | `#f8f5ee` | `#1c1a17` | `bg-brand-bg-panel` |
| Surface (cards) | `#ffffff` | `#111827` | White cards on warm bg |

### Border

| Name | Hex | Usage |
|---|---|---|
| Default warm border | `#ddd8cf` | `brand-border-warm` |
| Form field border | `#d4cfc6` | `brand-border-field` |

### Text

| Name | Hex (light) | Hex (dark) | Usage |
|---|---|---|---|
| Primary body text | `#4a4a4a` | `#d1d5db` | `brand-text-body` |
| Secondary / muted | `#6b6660` | `#9ca3af` | `brand-text-muted` |

### Semantic Feedback

| State | Hex | Tailwind |
|---|---|---|
| Success | `#009d80` | `text-green-600` / `bg-green-50` |
| Error | `#c0392b` | `text-red-600` / `bg-red-50` |
| Warning | `#b45309` | `text-amber-600` / `bg-amber-50` |

### Ninety One Brand Theme Swatches (15 themes)

Each theme has a `primary` and `accent` colour:

| Theme ID | Primary | Accent |
|---|---|---|
| `leatherback-coral` | `#134848` | `#fbaa96` |
| `leatherback-yellowwood` | `#134848` | `#fcaa28` |
| `marula-gold` | `#0a3323` | `#cf6f13` |
| `marula-coral` | `#0a3323` | `#fbaa96` |
| `pinotage-coral` | `#591739` | `#fbaa96` |
| `springbok-red` | `#e8e5ce` | `#d83949` |
| `springbok-teal` | `#e8e5ce` | `#009d80` |
| `springbok-burgundy` | `#e8e5ce` | `#591739` |
| `agulhas-gold` | `#221b3b` | `#cf6f13` |
| `agulhas-teal` | `#221b3b` | `#009d80` |
| `agulhas-red` | `#221b3b` | `#d83949` |
| `agulhas-coral` | `#221b3b` | `#fbaa96` |
| `agulhas-yellowwood` | `#221b3b` | `#fcaa28` |
| `galjoen-coral` | `#74908d` | `#fbaa96` |
| `galjoen-green` | `#74908d` | `#134848` |

---

## 3. Tailwind Config

Full `tailwind.config.ts` to copy into a new project:

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'ni-display': ['"Ninety One Visuelt Display"', 'arial', 'helvetica', 'sans-serif'],
        'ni-heading': ['"Ninety One Visuelt"',         'arial', 'helvetica', 'sans-serif'],
        'ni-body':    ['"Ninety One Visuelt Light"',   'arial', 'helvetica', 'sans-serif'],
        'ni-medium':  ['"Ninety One Visuelt Medium"',  'arial', 'helvetica', 'sans-serif'],
        // Overrides Tailwind's default sans → Visuelt Light
        sans: ['"Ninety One Visuelt Light"', 'arial', 'helvetica', 'sans-serif'],
      },
      colors: {
        brand: {
          primary:          '#134848',
          'primary-hover':  '#0d3232',
          'primary-dark':   '#0d3232',
          secondary:        '#0a3323',
          'secondary-hover':'#071f15',
          accent:           '#fbaa96',
          'accent-muted':   '#f9896e',
          'bg-warm':        '#f0ece4',
          'bg-panel':       '#f8f5ee',
          'bg-panel-dark':  '#1c1a17',
          'border-warm':    '#ddd8cf',
          'border-field':   '#d4cfc6',
          'text-muted':     '#6b6660',
          'text-body':      '#4a4a4a',
        },
      },
      transitionDuration: {
        fast:   '150ms',
        normal: '250ms',
        slow:   '400ms',
      },
    },
  },
  plugins: [],
} satisfies Config
```

---

## 4. CSS Custom Properties

Paste into `index.css` (before `@tailwind` directives):

```css
:root {
  --header-h:         3.5rem;
  --steptab-h:        3rem;
  --panel-sticky-top: calc(var(--header-h) + var(--steptab-h) + 1rem);

  /* Brand greens */
  --color-primary:        #134848;
  --color-primary-hover:  #0d3232;
  --color-secondary:      #0a3323;

  /* Coral accent */
  --color-accent:         #fbaa96;
  --color-accent-on-dark: #fbaa96;
  --color-accent-text:    #a0482e;   /* 4.5:1 on white */

  /* Surfaces */
  --color-bg:          #f0ece4;
  --color-bg-panel:    #f8f5ee;
  --color-surface:     #ffffff;

  /* Borders */
  --color-border:       #ddd8cf;
  --color-border-field: #d4cfc6;

  /* Text */
  --color-text-body:  #4a4a4a;
  --color-text-muted: #6b6660;

  /* Semantic */
  --color-success: #009d80;
  --color-error:   #c0392b;
  --color-warning: #b45309;

  /* Focus */
  --focus-ring: 0 0 0 3px rgba(19, 72, 72, 0.35);
}

html.dark {
  --color-bg:           #1a1714;
  --color-bg-panel:     #1c1a17;
  --color-surface:      #111827;
  --color-border:       #374151;
  --color-border-field: #4b5563;
  --color-text-body:    #d1d5db;
  --color-text-muted:   #9ca3af;
  --focus-ring: 0 0 0 3px rgba(251, 170, 150, 0.35);
}
```

---

## 5. Global Base Styles

```css
@layer base {
  *, *::before, *::after { box-sizing: border-box; }

  html, body {
    font-family: 'Ninety One Visuelt Light', system-ui, arial, helvetica, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    margin: 0;
  }

  h1, h2 {
    font-family: 'Ninety One Visuelt Display', georgia, 'Times New Roman', serif;
    font-weight: normal;
  }

  h3, h4, h5, h6 {
    font-family: 'Ninety One Visuelt', system-ui, arial, helvetica, sans-serif;
    font-weight: 200;
  }

  strong, b {
    font-family: 'Ninety One Visuelt Medium', system-ui, arial, helvetica, sans-serif;
    font-weight: normal;
  }

  input, textarea, select, button { font-family: inherit; }

  :focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  html.dark :focus-visible { outline-color: var(--color-accent); }

  [tabindex="-1"]:focus { outline: none; }
}

html.dark { color-scheme: dark; }
```

---

## 6. Component Patterns

All patterns below are production Tailwind utility strings, copy-paste ready.

---

### Buttons

#### Primary CTA (dark green)
```html
<button class="
  flex items-center gap-2
  bg-[#134848] text-white
  px-6 py-2.5 text-sm font-medium rounded-lg
  hover:bg-[#0d3232]
  disabled:opacity-40 disabled:cursor-not-allowed
  transition-colors
  focus-visible:outline-none focus-visible:ring-2
  focus-visible:ring-brand-primary focus-visible:ring-offset-2
">
  Continue
</button>
```

#### Secondary / Back
```html
<button class="
  border border-gray-300 dark:border-gray-600
  text-gray-600 dark:text-gray-400
  px-4 py-2 text-sm rounded-lg
  hover:bg-gray-50 dark:hover:bg-gray-800
  transition-colors
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40
">
  Back
</button>
```

#### Destructive / Review Submit (deep green)
```html
<button class="
  bg-[#0a3323] text-white
  px-6 py-2.5 text-sm font-medium rounded-lg
  hover:bg-[#071f15]
  transition-colors
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary
">
  Submit Brief
</button>
```

#### Ghost / Icon button (header context — on dark bg)
```html
<button class="
  w-8 h-8 flex items-center justify-center rounded-md
  text-white/60 hover:text-white hover:bg-white/10
  transition-colors
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent
">
  <!-- SVG icon -->
</button>
```

#### Small border button (on dark header)
```html
<button class="
  text-white/70 hover:text-white
  text-xs font-medium px-3 py-1.5
  border border-white/20 rounded-lg
  hover:bg-white/10
  transition-colors
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent
">
  Close
</button>
```

#### Inline text action
```html
<button class="text-xs text-brand-primary dark:text-brand-accent hover:underline transition-colors">
  View details
</button>
```

---

### Form Fields

#### Shared field constants (define once per component)
```typescript
const INPUT_CLASS = `
  w-full rounded-lg border border-gray-200 dark:border-gray-700
  bg-white dark:bg-gray-800
  text-sm text-gray-900 dark:text-gray-100
  px-3 py-2
  focus:outline-none focus:ring-2
  focus:ring-brand-primary/40 dark:focus:ring-brand-accent/40
`
const LABEL_CLASS = `
  block text-xs font-medium text-gray-500 dark:text-gray-400
  tracking-[0.12em] uppercase mb-1.5
`
const ERROR_CLASS = `text-xs text-red-600 dark:text-red-400 mt-1`
```

#### Text input (full pattern)
```html
<div class="mb-4">
  <label for="field-id" class="block text-xs tracking-[0.12em] uppercase font-ni-heading text-brand-text-muted dark:text-gray-400 mb-2">
    Label
    <span class="text-red-500 ml-0.5" aria-hidden="true">*</span>
    <span class="sr-only"> (required)</span>
  </label>
  <input
    id="field-id"
    type="text"
    class="w-full border border-brand-border-field dark:border-gray-600 px-3 py-3 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:focus-visible:ring-brand-accent focus:border-brand-primary dark:focus:border-brand-accent transition-colors"
    aria-invalid="false"
  />
  <!-- Character counter -->
  <div class="flex justify-between mt-1">
    <p class="text-xs text-gray-500 dark:text-gray-400 ml-auto" aria-live="polite">24/60</p>
  </div>
</div>
```

**Error state** — replace border class and add error message:
```html
class="... border-red-400"
...
<p id="field-id-error" role="alert" class="text-xs text-red-600 dark:text-red-400 mt-1">
  This field is required
</p>
```

**Character counter colour states:**
```
≤ 80% of max  → text-gray-500 dark:text-gray-400
> 80% of max  → text-amber-600 dark:text-amber-400
> max         → text-red-600  dark:text-red-400
```

#### Textarea
```html
<textarea
  rows="4"
  class="w-full border border-brand-border-field dark:border-gray-600 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:focus-visible:ring-brand-accent focus:border-brand-primary transition-colors"
/>
```

#### Select / Dropdown
```html
<select class="w-full border border-brand-border-field dark:border-gray-600 px-3 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:focus-visible:ring-brand-accent transition-colors">
  <option value="" disabled>Select an option</option>
  <option value="a">Option A</option>
</select>
```

#### Radio group (horizontal pill style)
```html
<div class="flex flex-wrap gap-2">
  <!-- Selected pill -->
  <label class="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-brand-primary dark:border-brand-accent bg-brand-primary/5 dark:bg-brand-accent/10 cursor-pointer">
    <input type="radio" class="sr-only" checked />
    <span class="text-sm font-medium text-brand-primary dark:text-brand-accent">Option A</span>
  </label>
  <!-- Unselected pill -->
  <label class="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
    <input type="radio" class="sr-only" />
    <span class="text-sm text-gray-600 dark:text-gray-300">Option B</span>
  </label>
</div>
```

#### Checkbox toggle (inline)
```html
<label class="flex items-start gap-3 cursor-pointer">
  <div class="relative mt-0.5 shrink-0">
    <input type="checkbox" class="sr-only peer" />
    <div class="w-9 h-5 bg-gray-200 dark:bg-gray-700 rounded-full peer-checked:bg-brand-primary dark:peer-checked:bg-brand-accent transition-colors"></div>
    <div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform"></div>
  </div>
  <div>
    <p class="text-sm text-gray-700 dark:text-gray-200">Toggle label</p>
    <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Optional help text</p>
  </div>
</label>
```

#### Hint / help text (below label, above input)
```html
<p class="text-[10px] text-gray-400 dark:text-gray-500 mb-1.5">
  Supplementary guidance for this field.
</p>
```

---

### Cards & Panels

#### White form card (main content wrapper)
```html
<div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 sm:p-8">
  <!-- content -->
</div>
```

#### Panel section (settings / info block)
```html
<div class="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
  <!-- content -->
</div>
```

#### Warm background panel
```html
<div class="bg-brand-bg-panel dark:bg-brand-bg-panel-dark rounded-xl border border-brand-border-warm dark:border-gray-700 p-5">
  <!-- content -->
</div>
```

#### Info / callout banner
```html
<div class="flex gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
  <svg class="shrink-0 text-blue-500 dark:text-blue-400 mt-0.5" width="16" height="16" .../>
  <p class="text-sm text-blue-700 dark:text-blue-300">Informational message.</p>
</div>
```

#### Asset type selection card (grid item)
```html
<!-- Unselected -->
<button class="relative group flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-center hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:shadow-sm transition-all">
  <span class="text-2xl">📄</span>
  <span class="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">Label</span>
  <span class="text-[10px] text-gray-400 dark:text-gray-600 leading-tight hidden sm:block">Short description</span>
</button>

<!-- Selected -->
<button class="relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-brand-primary dark:border-brand-accent bg-brand-primary/5 dark:bg-brand-accent/10 shadow-md text-center transition-all" aria-pressed="true">
  <!-- Checkmark badge -->
  <span class="absolute top-2 right-2 w-5 h-5 bg-brand-primary dark:bg-brand-accent rounded-full flex items-center justify-center">
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  </span>
  <span class="text-2xl">📄</span>
  <span class="text-xs font-medium text-brand-primary dark:text-brand-accent leading-tight">Label</span>
</button>
```

---

### Badges & Chips

#### Status badge — urgency
```html
<!-- Standard -->
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
  Standard
</span>

<!-- Urgent -->
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
  Urgent
</span>
```

#### Asset type chip (coloured, on dark header)
```html
<span
  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white/90"
  style="background-color: rgba(39, 174, 96, 0.25);"
>
  📅 Event-Related
</span>
```

#### Count badge (icon button overlay)
```html
<span class="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-brand-accent text-brand-primary text-[8px] font-bold rounded-full flex items-center justify-center">
  3
</span>
```

#### Section label / eyebrow
```html
<p class="text-xs tracking-[0.2em] uppercase font-medium text-brand-primary dark:text-brand-accent mb-2">
  Step 1 of 3
</p>
```

---

### Step Indicators

#### Horizontal pill progress (in platform overlays)
```html
<div class="flex items-center gap-1.5" role="tablist">
  <!-- Completed step -->
  <div class="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-brand-accent">
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
    <span class="hidden sm:inline">Asset Type</span>
  </div>
  <!-- Connector -->
  <div class="w-6 h-px bg-brand-accent" aria-hidden="true"></div>
  <!-- Active step -->
  <div class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-medium">
    <span class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-white text-brand-primary">2</span>
    <span class="hidden sm:inline">Brief</span>
  </div>
  <!-- Connector -->
  <div class="w-6 h-px bg-white/20" aria-hidden="true"></div>
  <!-- Future step -->
  <div class="flex items-center gap-1.5 px-3 py-1 rounded-full text-white/40 text-xs font-medium">
    <span class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-white/20 text-white/60">3</span>
    <span class="hidden sm:inline">Review</span>
  </div>
</div>
```

#### Tab-style step bar (main email form)
```html
<button
  aria-current="step"
  class="relative flex items-center gap-2 px-4 py-4 text-xs font-ni-heading tracking-[0.12em] uppercase whitespace-nowrap border-b-[3px] min-h-[48px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary

  /* Active: */  text-brand-primary dark:text-brand-accent border-brand-primary dark:border-brand-accent
  /* Done: */    text-brand-primary/60 dark:text-brand-accent/60 border-transparent cursor-pointer
  /* Locked: */  text-gray-300 dark:text-gray-600 border-transparent cursor-default"
>
  <!-- Number circle (active) -->
  <span class="w-5 h-5 rounded-full bg-brand-primary text-white flex items-center justify-center text-xs font-bold" aria-hidden="true">1</span>
  Campaign
</button>
```

---

### Navigation & Header

#### App header bar
```html
<header class="bg-[#134848] dark:bg-[#0d3232]">
  <div class="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
    <!-- Left: logo + platform switcher -->
    <div class="flex items-center gap-0 shrink-0">
      <img src="https://weare.ninetyone.com/l/28902/2021-09-09/9984n4/28902/1631175749gVO1StAs/91_logo_digital_cape_coral_header_300x150.png" alt="Ninety One" class="h-5 w-auto" />
      <div class="ml-4 pl-4 border-l border-white/20 hidden sm:block">
        <button class="flex items-center gap-1.5 text-white/70 hover:text-white text-xs tracking-[0.2em] uppercase font-ni-heading transition-colors">
          Platform Name
          <!-- Chevron icon -->
        </button>
      </div>
    </div>
    <!-- Right: action icons -->
    <div class="flex items-center gap-1">
      <!-- Icon buttons here -->
    </div>
  </div>
  <!-- Accent underline -->
  <div class="h-[2px] bg-brand-accent/50" aria-hidden="true"></div>
</header>
```

#### Platform dropdown menu
```html
<div class="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
  <!-- Active item -->
  <button class="w-full flex items-start gap-3 px-4 py-3 text-left bg-brand-primary/5 dark:bg-brand-primary/10 transition-colors">
    <span class="text-base mt-0.5 shrink-0">✉</span>
    <div>
      <p class="text-sm font-medium text-brand-primary dark:text-brand-accent">Email Briefing Platform</p>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">HTML email production briefs</p>
    </div>
    <!-- Checkmark -->
    <svg class="ml-auto mt-1 shrink-0 text-brand-primary dark:text-brand-accent" width="14" height="14" .../>
  </button>
  <!-- Inactive item -->
  <button class="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
    <span class="text-base mt-0.5 shrink-0">🎨</span>
    <div>
      <p class="text-sm font-medium text-gray-800 dark:text-gray-200">Design Briefing Platform</p>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Brand asset & design deliverable briefs</p>
    </div>
  </button>
</div>
```

#### Settings sidebar nav item
```html
<!-- Active -->
<button class="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left bg-brand-primary/8 dark:bg-brand-accent/10 text-brand-primary dark:text-brand-accent">
  <div>
    <p class="text-sm font-medium">Tab Label</p>
    <p class="text-xs text-brand-primary/60 dark:text-brand-accent/60 mt-0.5 hidden lg:block">Short description</p>
  </div>
</button>
<!-- Inactive -->
<button class="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
  <div>
    <p class="text-sm font-medium">Tab Label</p>
  </div>
</button>
```

---

### Overlays & Modals

#### Full-screen platform overlay
```html
<div class="fixed inset-0 z-50 bg-brand-bg-warm dark:bg-[#1a1714] overflow-hidden flex flex-col">
  <header class="shrink-0 bg-[#134848] dark:bg-[#0d3232]">
    <!-- Header content -->
    <div class="h-[2px] bg-brand-accent/50" aria-hidden="true"></div>
  </header>
  <div class="flex-1 overflow-y-auto">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <!-- Page content -->
    </div>
  </div>
</div>
```

#### Settings panel (slide-in from right)
```html
<div class="fixed inset-0 z-50 flex">
  <!-- Backdrop -->
  <div class="flex-1 bg-black/30 backdrop-blur-sm" onclick="close()"></div>
  <!-- Panel -->
  <div class="w-full max-w-4xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-slide-in">
    <!-- content -->
  </div>
</div>
```

Animation keyframe (in CSS):
```css
@keyframes slide-in-right {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}
.animate-slide-in {
  animation: slide-in-right 0.25s ease-out;
}
```

#### Lightbox image overlay
```html
<div class="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onclick="close()">
  <div class="relative max-w-4xl max-h-full" onclick="e.stopPropagation()">
    <img src="..." alt="..." class="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
    <button class="absolute top-3 right-3 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors">
      ✕
    </button>
  </div>
</div>
```

---

### Toggles

#### Settings-panel master toggle (large)
```html
<button
  role="switch"
  aria-checked="true"
  class="relative w-11 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary
    bg-brand-primary dark:bg-brand-accent     /* when on */
    bg-gray-200 dark:bg-gray-600              /* when off */
  "
>
  <span class="block w-5 h-5 bg-white rounded-full shadow transition-transform
    translate-x-5    /* when on */
    translate-x-0.5  /* when off */
  "></span>
</button>
```

---

### Drag & Drop Zones

#### Attachment drop zone
```html
<!-- Idle -->
<div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-brand-primary/50 dark:hover:border-brand-accent/50 hover:bg-brand-primary/2 transition-colors">
  <svg class="mx-auto text-gray-300 dark:text-gray-600 mb-3" width="32" height="32" .../>
  <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Drop files here or <span class="text-brand-primary dark:text-brand-accent">click to browse</span></p>
  <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Any file type · Max 10 files</p>
</div>

<!-- Drag-over active state (add via JS) -->
<div class="border-2 border-brand-primary dark:border-brand-accent bg-brand-primary/5 dark:bg-brand-accent/10 ring-4 ring-brand-primary/20 dark:ring-brand-accent/20 rounded-xl ...">
```

#### Attached file row
```html
<div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-100 dark:border-gray-700">
  <!-- File type icon (coloured) -->
  <svg class="text-red-500 shrink-0" width="16" height="16" .../>
  <!-- Thumbnail (images only) -->
  <img src="blob:..." alt="" class="w-8 h-8 object-cover rounded shrink-0" />
  <div class="flex-1 min-w-0">
    <p class="text-sm text-gray-700 dark:text-gray-200 truncate">filename.pdf</p>
    <p class="text-xs text-gray-400 dark:text-gray-500">245.3 KB</p>
  </div>
  <button class="shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors">
    ✕
  </button>
</div>
```

---

### Empty States

```html
<div class="text-center py-12 px-4">
  <div class="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
    <svg class="text-gray-300 dark:text-gray-600" width="24" height="24" .../>
  </div>
  <p class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">No items yet</p>
  <p class="text-xs text-gray-400 dark:text-gray-500">Add one to get started.</p>
</div>
```

---

### Feedback & Toasts

#### Inline success message
```html
<span class="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800">
  <svg width="12" height="12" ...checkmark .../> Copied to clipboard
</span>
```

#### Inline error message
```html
<span class="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800">
  <svg width="12" height="12" ...warning.../>  Something went wrong — try again.
</span>
```

#### Field-level error
```html
<p id="field-error" role="alert" class="text-xs text-red-600 dark:text-red-400 mt-1">
  This field is required.
</p>
```

#### URL validation inline indicator
```html
<!-- Valid -->
<span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm font-bold text-green-600">✓</span>
<!-- Invalid -->
<span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm font-bold text-red-500">✕</span>
```

---

## 7. Dark Mode

Dark mode is toggled by adding the `dark` class to `<html>`. Controlled via `localStorage` key `ni-dark-mode`.

**Pattern:** Every element that has a light background or text colour has a corresponding `dark:` variant. No exceptions.

**The key dark-mode colour swaps:**

| Light | Dark | Usage |
|---|---|---|
| `bg-white` | `dark:bg-gray-800` | Input/card backgrounds |
| `bg-gray-50` | `dark:bg-gray-800/40` | Panel backgrounds |
| `bg-gray-100` | `dark:bg-gray-700` | Subtle fills |
| `text-gray-700` | `dark:text-gray-200` | Primary label text |
| `text-gray-500` | `dark:text-gray-400` | Muted / secondary text |
| `text-gray-400` | `dark:text-gray-500` | Placeholder / hint |
| `border-gray-200` | `dark:border-gray-700` | Card/panel borders |
| `border-gray-300` | `dark:border-gray-600` | Input borders |
| `text-brand-primary` | `dark:text-brand-accent` | Interactive / active |
| `bg-brand-primary` | `dark:bg-brand-accent` | Toggle thumbs, checkmarks |
| `ring-brand-primary` | `dark:ring-brand-accent` | Focus rings |
| `bg-[#134848]` | `dark:bg-[#0d3232]` | Header bar |
| `bg-brand-bg-warm` | `dark:bg-[#1a1714]` | Page background |

**Toggle implementation:**
```typescript
function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark')
  localStorage.setItem('ni-dark-mode', isDark ? 'dark' : 'light')
}

// On mount:
const saved = localStorage.getItem('ni-dark-mode')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
if (saved === 'dark' || (!saved && prefersDark)) {
  document.documentElement.classList.add('dark')
}
```

---

## 8. Animation & Transitions

### Tailwind transition presets

```typescript
// In tailwind.config.ts:
transitionDuration: {
  fast:   '150ms',   // hover state changes
  normal: '250ms',   // panel open/close, colour swaps
  slow:   '400ms',   // page-level transitions
}
```

### Transition classes used

| Context | Class |
|---|---|
| Hover/active colour changes | `transition-colors` |
| Layout shifts (toggles, counters) | `transition-all` |
| Translation (toggle thumb, chevron rotate) | `transition-transform` |
| Opacity changes | `transition-opacity` |

### Settings panel slide-in
```css
@keyframes slide-in-right {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}
.animate-slide-in { animation: slide-in-right 0.25s ease-out; }
```

---

## 9. Spacing & Layout

### Max widths by context

| Context | Max width class |
|---|---|
| Email brief form | `max-w-2xl` |
| Design brief / platform content | `max-w-3xl` |
| Asset type picker grid | `max-w-5xl` |
| Settings panel | `max-w-4xl` |
| Header inner | `max-w-5xl` |

### Section spacing

```
Page padding (x): px-4 sm:px-6
Page padding (y): py-8 sm:py-10
Section gap:      space-y-6 or space-y-8
Card padding:     p-5 (compact) · p-6 sm:p-8 (standard)
Field bottom gap: mb-4 (between form fields)
Label to input:   mb-1.5 (tight) · mb-2 (standard)
```

### Grid patterns

| Context | Grid |
|---|---|
| Asset type cards | `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5` |
| Mockup image grid | `grid-cols-2 sm:grid-cols-3` |
| Settings two-column | `grid-cols-1 sm:grid-cols-2` |
| Review summary | `grid-cols-1 sm:grid-cols-2` |

---

## 10. Accessibility Conventions

- **All interactive elements** have `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:focus-visible:ring-brand-accent` (never suppress focus entirely)
- **Error messages** use `role="alert"` and `id` linked via `aria-describedby` on the input
- **Required fields** use both visible `*` (`aria-hidden="true"`) and `.sr-only` text ` (required)`
- **Invalid inputs** get `aria-invalid="true"` 
- **Icon-only buttons** get `aria-label` — never rely on tooltip alone
- **Toggle/switch buttons** use `role="switch"` + `aria-checked`
- **Grid of selectable cards** use `aria-pressed` on each button
- **Step indicators** use `role="tablist"` + `role="tab"` + `aria-selected` + `aria-current="step"`
- **Character counters** use `aria-live="polite"`
- **Drag & drop zones**: always include a keyboard/click alternative (hidden `<input type="file">`)
- **Images**: always `alt` text; decorative SVGs get `aria-hidden="true"`
- **`[tabindex="-1"]:focus { outline: none }`** — suppresses ring on programmatically focused headings only

---

## 11. Print Styles

Applied to `#print-brief` container only. All other content is hidden.

```css
@media print {
  body > * { display: none !important; }
  #print-brief { display: block !important; }

  body {
    background: white !important;
    color: #1f2937 !important;
    font-size: 11pt;
    font-family: 'Ninety One Visuelt Light', system-ui, arial, sans-serif;
  }

  /* Typography */
  #print-brief h1 { font-size: 18pt; font-family: 'Ninety One Visuelt Display', georgia, serif; font-weight: normal; color: #134848; }
  #print-brief h2 { font-size: 13pt; border-bottom: 1pt solid #ddd8cf; padding-bottom: 3pt; color: #134848; }
  #print-brief h3 { font-size: 10pt; color: #374151; }
  #print-brief p, #print-brief li { font-size: 10pt; line-height: 1.5; color: #1f2937; }

  /* Layout helpers */
  #print-brief .print-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: 12pt; }
  #print-brief .print-badge  { display: inline-block; background: #f3f4f6; border: 1pt solid #ddd8cf; padding: 1pt 5pt; font-size: 9pt; }
  #print-brief .print-section { margin-bottom: 8pt; padding: 8pt; border: 1pt solid #ddd8cf; page-break-inside: avoid; }
  #print-brief .print-meta   { font-size: 9pt; color: #6b7280; }
  #print-brief .print-footer { margin-top: 16pt; border-top: 1pt solid #ddd8cf; padding-top: 8pt; font-size: 8pt; color: #9ca3af; }
}

/* Hide the print container in normal view */
#print-brief { display: none; }
```

---

*Last updated: 2026-05-06 · Ninety One Email & Design Briefing Platform*
