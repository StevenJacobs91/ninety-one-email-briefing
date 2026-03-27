# Email Briefing Form — Claude Code Project Brief

## Project Overview

A digital briefing form for Ninety One's internal marketing team to capture all information required to produce a brand-compliant HTML email. The form guides the requester step-by-step through structured inputs and produces a validated brief object that can be consumed downstream by the Email Briefing Pipeline (Vite + React + TypeScript) or exported as a JSON payload.

The goal is zero back-and-forth between requester and email producer. Every field must carry only what is strictly necessary to produce the email.

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | React 18 + TypeScript | Strict mode enabled |
| Build tool | Vite 5 | |
| Styling | Tailwind CSS v3 (utility-first) | No component library |
| Forms | React Hook Form + Zod | Schema-driven validation |
| State | React context + `useReducer` | No external state library |
| Storage | `localStorage` (draft persistence) | Key: `ni-email-brief-draft` |
| Output | JSON export + clipboard copy | Structured `BriefPayload` type |
| Routing | React Router v6 | Single route; no auth |

---

## Project Structure

```
src/
├── components/
│   ├── steps/               # One component per form step
│   │   ├── StepCampaign.tsx
│   │   ├── StepAudience.tsx
│   │   ├── StepContent.tsx
│   │   ├── StepAssets.tsx
│   │   └── StepDeadlines.tsx
│   ├── ui/
│   │   ├── FieldText.tsx
│   │   ├── FieldSelect.tsx
│   │   ├── FieldTextarea.tsx
│   │   ├── FieldToggle.tsx
│   │   ├── StepIndicator.tsx
│   │   └── BriefSummary.tsx
│   └── layout/
│       └── FormShell.tsx
├── hooks/
│   ├── useBriefForm.ts       # Central form state + stepper logic
│   └── useDraftPersistence.ts
├── lib/
│   ├── schema.ts             # Zod schema for BriefPayload
│   ├── constants.ts          # Email types, themes, audience segments
│   ├── exportBrief.ts        # JSON export and clipboard utilities
│   └── validateStep.ts       # Per-step field validation helpers
├── types/
│   └── brief.types.ts        # TypeScript interfaces
├── App.tsx
├── main.tsx
└── index.css
```

---

## Data Model

### `BriefPayload` (the canonical output type)

```typescript
interface BriefPayload {
  meta: BriefMeta
  campaign: CampaignDetails
  audience: AudienceDetails
  content: ContentDetails
  assets: AssetDetails
  deadlines: DeadlineDetails
}
```

### `BriefMeta`
```typescript
interface BriefMeta {
  briefId: string          // UUID generated on first load
  createdAt: string        // ISO 8601
  updatedAt: string        // ISO 8601
  status: 'draft' | 'submitted'
}
```

### `CampaignDetails`
```typescript
interface CampaignDetails {
  emailType: EmailType     // See constants
  campaignName: string     // Internal reference name — required
  theme: BrandTheme        // One of 15 Ninety One brand themes — required
  subjectLine: string      // Required, max 60 chars
  previewText: string      // Required, max 90 chars
  fromName: string         // e.g. "Ninety One"
  replyToEmail: string     // Validated email address
}
```

### `AudienceDetails`
```typescript
interface AudienceDetails {
  region: Region[]         // One or more: ZA | UK | EU | ASIA | GLOBAL
  channel: Channel[]       // INTERMEDIARY | INSTITUTIONAL | RETAIL
  estimatedListSize?: number
  pardotListId?: string    // Optional — for n8n Pardot workflow
}
```

### `ContentDetails`
```typescript
interface ContentDetails {
  headline: string         // Required, max 80 chars
  bodyIntro: string        // Required, max 300 chars
  sections: ContentSection[]  // 1–4 sections
  cta: CallToAction        // Required
  legalDisclaimer?: string // Optional override; falls back to region default
  includeUnsubscribe: boolean  // Always true for marketing sends
}

interface ContentSection {
  id: string               // UUID
  heading: string          // Max 60 chars
  body: string             // Max 500 chars
  imageRequired: boolean
  imageDescription?: string  // Alt text / art direction hint
}

interface CallToAction {
  label: string            // Button label, max 30 chars
  url: string              // Must be a valid URL
  openInNewTab: boolean
}
```

### `AssetDetails`
```typescript
interface AssetDetails {
  logoVariant: 'horizontal' | 'stacked' | 'icon'
  stripeColour?: string    // Hex — overrides theme default if provided
  heroImageUrl?: string    // CDN URL — must be https://
  heroImageAlt: string     // Required if heroImageUrl provided
  additionalAssetUrls: string[]  // Max 4
}
```

### `DeadlineDetails`
```typescript
interface DeadlineDetails {
  contentApprovalDate: string   // ISO date
  sendDate: string              // ISO date — must be after contentApprovalDate
  urgency: 'standard' | 'urgent'
  notes?: string                // Max 300 chars
}
```

---

## Form Steps

The form is divided into five linear steps. Validation is enforced before the requester can advance.

### Step 1 — Campaign
Fields: `emailType`, `campaignName`, `theme`, `subjectLine`, `previewText`, `fromName`, `replyToEmail`

### Step 2 — Audience
Fields: `region` (multi-select), `channel` (multi-select), `estimatedListSize`, `pardotListId`

### Step 3 — Content
Fields: `headline`, `bodyIntro`, `sections` (dynamic — add/remove), `cta`, `legalDisclaimer`, `includeUnsubscribe`

### Step 4 — Assets
Fields: `logoVariant`, `stripeColour`, `heroImageUrl`, `heroImageAlt`, `additionalAssetUrls`

### Step 5 — Deadlines & Review
Fields: `contentApprovalDate`, `sendDate`, `urgency`, `notes`
Followed by: full brief summary (`BriefSummary` component), submit/export controls

---

## Constants

### `EmailType` (src/lib/constants.ts)
```typescript
export const EMAIL_TYPES = [
  'campaign',
  'newsletter',
  'fund-update',
  'event-invitation',
  'thought-leadership',
  'client-announcement',
] as const

export type EmailType = typeof EMAIL_TYPES[number]
```

### `BrandTheme` — 15 Ninety One Themes
```typescript
export const BRAND_THEMES = [
  { id: 'leatherback-coral',     label: 'Leatherback Green / Cape Coral',          primary: '#134848', accent: '#fbaa96' },
  { id: 'leatherback-yellowood', label: 'Leatherback Green / Warm Yellowwood',     primary: '#134848', accent: '#fcaa28' },
  { id: 'marula-gold',           label: 'Marula Green / Gazania Gold',             primary: '#0a3323', accent: '#cf6f13' },
  { id: 'marula-coral',          label: 'Marula Green / Cape Coral',               primary: '#0a3323', accent: '#fbaa96' },
  { id: 'pinotage-coral',        label: 'Pinotage Burgundy / Cape Coral',          primary: '#591739', accent: '#fbaa96' },
  { id: 'springbok-red',         label: 'Springbok Cream / Protea Red',            primary: '#e8e5ce', accent: '#d83949' },
  { id: 'springbok-teal',        label: 'Springbok Cream / Ocean Teal',            primary: '#e8e5ce', accent: '#009d80' },
  { id: 'springbok-burgundy',    label: 'Springbok Cream / Pinotage Burgundy',     primary: '#e8e5ce', accent: '#591739' },
  { id: 'agulhas-gold',          label: 'Agulhas Indigo / Gazania Gold',           primary: '#221b3b', accent: '#cf6f13' },
  { id: 'agulhas-teal',          label: 'Agulhas Indigo / Ocean Teal',             primary: '#221b3b', accent: '#009d80' },
  { id: 'agulhas-red',           label: 'Agulhas Indigo / Protea Red',             primary: '#221b3b', accent: '#d83949' },
  { id: 'agulhas-coral',         label: 'Agulhas Indigo / Cape Coral',             primary: '#221b3b', accent: '#fbaa96' },
  { id: 'agulhas-yellowwood',    label: 'Agulhas Indigo / Warm Yellowwood',        primary: '#221b3b', accent: '#fcaa28' },
  { id: 'galjoen-coral',         label: 'Galjoen Gray / Cape Coral',               primary: '#74908d', accent: '#fbaa96' },
  { id: 'galjoen-green',         label: 'Galjoen Gray / Leatherback Green',        primary: '#74908d', accent: '#134848' },
] as const

export type BrandTheme = typeof BRAND_THEMES[number]['id']
```

### `Region` and `Channel`
```typescript
export const REGIONS   = ['ZA', 'UK', 'EU', 'ASIA', 'GLOBAL'] as const
export const CHANNELS  = ['INTERMEDIARY', 'INSTITUTIONAL', 'RETAIL'] as const

export type Region  = typeof REGIONS[number]
export type Channel = typeof CHANNELS[number]
```

---

## Validation Rules (Zod Schema)

All rules live in `src/lib/schema.ts`. Key constraints:

- `campaignName` — required, non-empty string
- `subjectLine` — required, max 60 characters
- `previewText` — required, max 90 characters
- `replyToEmail` — must pass `z.string().email()`
- `heroImageUrl` — if provided, must start with `https://`
- `heroImageAlt` — required when `heroImageUrl` is set (`.superRefine`)
- `sendDate` — must be strictly after `contentApprovalDate`
- `sections` — min 1, max 4 entries
- `sections[n].body` — max 500 characters
- `cta.url` — must pass `z.string().url()`
- `cta.label` — max 30 characters
- `estimatedListSize` — optional positive integer

---

## Core Hooks

### `useBriefForm` (src/hooks/useBriefForm.ts)
- Wraps `useForm` from React Hook Form with the full Zod schema
- Exposes: `currentStep`, `goToStep(n)`, `canAdvance`, `handleNext`, `handleBack`, `submitBrief`
- `handleNext` triggers per-step field validation via `trigger([...stepFields])` before advancing
- `submitBrief` sets `meta.status = 'submitted'`, clears localStorage draft, calls `exportBrief`

### `useDraftPersistence` (src/hooks/useDraftPersistence.ts)
- Watches `form.watch()` and debounces writes to `localStorage` (500ms)
- On mount, reads existing draft and calls `form.reset(draft)` if present
- Exposes `clearDraft()` — called after successful submission

---

## Export Utilities (src/lib/exportBrief.ts)

```typescript
// Download as JSON file
export function downloadBriefJson(payload: BriefPayload): void

// Copy JSON to clipboard
export function copyBriefToClipboard(payload: BriefPayload): Promise<void>

// Build the downstream payload URL (for MS Forms pre-fill — future)
export function buildPrefillUrl(payload: BriefPayload, baseUrl: string): string
```

---

## UI Guidelines

- No component library. Pure Tailwind utility classes only.
- Form shell: white card, max-width `max-w-2xl`, centred, `py-10 px-8`
- Step indicator: horizontal pill progress bar at top — filled for completed steps, active for current, muted for upcoming
- Field labels: `text-sm font-medium text-gray-700`
- Required asterisk: `text-red-500` suffix on label
- Error messages: `text-xs text-red-600 mt-1` — shown inline below the field
- CTA button (primary): `bg-[#134848] text-white hover:bg-[#0d3232]` (Ninety One Leatherback Green)
- Secondary button (back/cancel): `border border-gray-300 text-gray-600 hover:bg-gray-50`
- Character counters: shown on `subjectLine`, `previewText`, `headline`, `bodyIntro`, `sections[n].body`
- Theme selector: renders a small colour swatch (primary + accent dot) alongside the label
- Dynamic sections: `+` button adds a new `ContentSection` with a generated UUID; `×` removes it; min 1 enforced

---

## CLAUDE.md Conventions

### Do not build
- Authentication / login
- API routes or backend
- Email HTML generation (handled by the existing Email Briefing Pipeline project)
- File upload functionality (asset URLs are pasted as strings only)
- Multi-user or collaborative features

### Out of scope for v1 (TODO — future sessions)
- MS Forms URL pre-fill via `buildPrefillUrl`
- n8n Pardot workflow trigger on submission
- Settings persistence (theme preference, default `fromName`)
- Automated legal disclaimer lookup by region
- Brief history / archive view

### Naming conventions
- Components: `PascalCase.tsx`
- Hooks: `camelCase` prefixed with `use`
- Types: `PascalCase` in `brief.types.ts`
- Constants: `SCREAMING_SNAKE_CASE` for arrays/enums, `PascalCase` for types
- CSS: Tailwind only — no custom CSS classes except `index.css` global resets

### Code quality
- No `any` — all form values typed via `BriefPayload`
- Immutable state updates — spread operator, no direct mutation
- Early returns for guard clauses
- Per-step validation before advancing — never skip step validation
- All async functions wrapped in try/catch with user-visible error state

---

## File Checklist for Initial Build

Claude Code must produce the following files in order:

1. `package.json` — Vite + React + TypeScript + Tailwind + React Hook Form + Zod + React Router
2. `vite.config.ts`
3. `tailwind.config.ts`
4. `src/types/brief.types.ts`
5. `src/lib/constants.ts`
6. `src/lib/schema.ts`
7. `src/lib/exportBrief.ts`
8. `src/lib/validateStep.ts`
9. `src/hooks/useBriefForm.ts`
10. `src/hooks/useDraftPersistence.ts`
11. `src/components/ui/` — all UI primitives
12. `src/components/steps/` — all five step components
13. `src/components/layout/FormShell.tsx`
14. `src/components/ui/BriefSummary.tsx`
15. `src/App.tsx`
16. `src/main.tsx`
17. `src/index.css`

---

## Acceptance Criteria

- [ ] All five form steps render correctly and advance/retreat without data loss
- [ ] Zod validation blocks advancement on any invalid or missing required field
- [ ] Character counters update in real time
- [ ] Draft is written to localStorage on every change and restored on page reload
- [ ] Theme selector shows colour swatches
- [ ] Sections can be added (max 4) and removed (min 1) dynamically
- [ ] `sendDate` cannot be set before `contentApprovalDate` — form-level error shown
- [ ] `heroImageAlt` becomes required when `heroImageUrl` is entered
- [ ] Completed brief can be downloaded as `brief-{campaignName}-{date}.json`
- [ ] Completed brief can be copied to clipboard as JSON
- [ ] No TypeScript errors (`tsc --noEmit` passes clean)
- [ ] No `any` types in production code
