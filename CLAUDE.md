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
│   ├── steps/               # The brief's form sections and the review step
│   │   ├── StepCampaign.tsx  # The brief sections of Brief & Build
│   │   ├── StepContent.tsx   # The email builder of Brief & Build
│   │   └── StepHtmlReview.tsx # Review and Submission
│   ├── brief/               # Section badges, attention state, jump-to-field
│   │   ├── BriefSection.tsx
│   │   └── BriefAttention.tsx
│   ├── builder2/            # LibraryBuilder, module picker, inspector, previews
│   ├── ui/
│   │   ├── FieldText.tsx
│   │   ├── FieldSelect.tsx
│   │   ├── FieldTextarea.tsx
│   │   ├── FieldToggle.tsx
│   │   ├── StepIndicator.tsx
│   │   └── BriefSummary.tsx
│   └── layout/
│       ├── FormShell.tsx
│       ├── BriefBuildWorkspace.tsx  # The three-column page: brief, email, inspector
│       ├── WorkspaceStatusBar.tsx   # Draft state, score and Continue, in the nav row; and the problems list
│       ├── InboxPreviewStrip.tsx    # Built but not currently shown on the page
│       └── BriefLayoutContext.tsx
├── hooks/
│   ├── useBriefForm.ts       # Central form state + stepper logic
│   └── useDraftPersistence.ts
├── lib/
│   ├── schema.ts             # Zod schema for BriefPayload
│   ├── constants.ts          # Email types, themes, audience segments
│   ├── exportBrief.ts        # JSON export and clipboard utilities
│   ├── validateStep.ts       # Per-step field validation helpers
│   ├── briefProblems.ts      # Every problem in the whole brief, from the schema
│   ├── briefSections.ts      # Which brief section each field belongs to
│   ├── briefTabs.ts          # The two steps, by id
│   ├── briefLayout.ts        # Section order from Settings
│   ├── briefRequirements.ts  # Required/optional choices from Settings, laid over the schema
│   ├── briefResolver.ts      # The form's validator: the schema plus those choices
│   └── buildHistory.ts       # Undo/redo for the email and theme
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

The form has two steps, identified by id (`BriefTabId` in `src/lib/briefTabs.ts`). The earlier five-step, then three-step (Campaign / Layout & Content / Review) layouts were merged. Continue never fails silently: it checks the whole brief and lists every problem.

### Step 1 — Brief & Build (`build`)
The brief and the email on one page. Brief sections (`src/lib/briefSections.ts`), each always open, with an "n of m" badge that stays neutral until the first Continue and then turns red where something is wrong:
- Email identity: `emailDescription`, `emailType`, `campaignName`, `theme`, `utmCampaign` (filled in from the chosen campaign's UTM preset in Settings → Campaigns, else its name; links carry it as a lower-case slug with hyphens, never "+")
- Message envelope: `subjectLine`, `previewText`
- Sender details: `senderType` (General user, Specific user or Assigned user, as in Pardot), then `fromName` and `fromAddress` for a general user or `specificUser` (a Pardot user ID) for a specific user, plus `replyToEmail`. An assigned user send has no from fields. Settings → General sets the default sender type; `src/lib/briefRequirements.ts` makes the from fields required only for a general user send, and the Pardot send passes the chosen type through
- Targeting: `clientGroup`, `region`, `channel`
- Deadlines: `contentApprovalDate`, `sendDate`, `urgency`
- Supporting material, Tags, Audience (distribution lists)
- The email itself: header, modules, `logoVariant`, hero image (built in `LibraryBuilder`, which owns the module build, the inspector and undo/redo)

The page has three columns: the brief in a single column on the left, the email in the middle, and the selected module's inspector on the right. The Brief panel starts open and can collapse to a rail of section badges once every section is complete (every pill green); it reopens by itself if one stops being complete. Its sections are always open, separated by divider lines and a tinted header rather than boxes. The draft saved time, the Brand Review score, "N sections need attention" and Continue sit in the nav row beside the step tabs (drawn there by `WorkspaceStatusBar`); what stopped Continue is listed above the columns by `WorkspaceProblems`.

Settings → Form Layout (`briefLayout` in settings) sets the order of the sections, the order of the fields within each section, which fields are switched off, and whether each field is required. A field switched off is not shown (`FieldSlot` renders nothing), is never asked for, and nothing left in it can block Continue; it is also left out of its section's badge. The brief's schema still decides what is valid; `src/lib/briefRequirements.ts` layers the team's choices over it, so a field made optional stops blocking while it is empty, and a field made required blocks while it is empty. The same rules drive the form's validator (`briefResolver`), Continue (`briefProblems`), the section badges and the red asterisks.

### Step 2 — Review and Submission (`review`)
Rendered email, Brand Review, test send, brief summary, JSON/PDF export and submit.

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
- `cta.label` — no hard limit; a label over `ctaLabelMaxLength` (Settings → Brand Guardian) is a Brand Review suggestion, and every button in the email is checked. Buttons can be widened (one button) or split (two buttons) in the module's Style tab
- `estimatedListSize` — optional positive integer

---

## Core Hooks

### `useBriefForm` (src/hooks/useBriefForm.ts)
- Wraps `useForm` from React Hook Form with the full Zod schema
- Exposes: `currentStep`, `goToStep(n)`, `canAdvance`, `handleNext`, `handleBack`, `submitBrief`
- Two steps: Brief & Build, Review and Submission. `FormShell.continueToReview` checks the whole brief with `briefProblems` and never stops without saying why
- `submitBrief` sets `meta.status = 'submitted'`, clears localStorage draft, calls `exportBrief`

### `useDraftPersistence` (src/hooks/useDraftPersistence.ts)
- Watches `form.watch()` and debounces writes to `localStorage` (500ms)
- On mount, reads existing draft and calls `form.reset(draft)` if present
- Exposes `clearDraft()` (called after successful submission), `saveStatus`, and `lastSavedAt` (when the draft was last written, for the status bar)

---

## Approvals

Who may decide is enforced in the database, not only on screen. Migrations `supabase/migrations/20261026_approvals_phase1.sql` and `20261027_approvals_phase2.sql` must be applied **before** deploying the app version that calls them (phase 2 changes the `request_approval` signature).

- **Approvers:** `approval_pool_members` holds who may decide each role's stages (Brand Guardian, Legal, Manager, Reviewer). Only admins can change it, through `set_approval_pool`. A stage can instead name one person. Settings → Approvals edits both.
- **Submitting and deciding** go through `request_approval` and `decide_approval` (security-definer functions); the browser can no longer insert or update approval rows. They check eligibility, block approving your own submission, lock the row so two decisions cannot both win, and start the next stage in the same transaction, from the stages saved on the approval when it was submitted (`stages_snapshot`).
- **`approval_events`** is an append-only record of every action.
- **Rules in the browser** (`src/lib/approvalRouting.ts`) mirror the database so screens can explain a refusal first: `decisionBlock`, `stageIssues`, `awaitingMine`, `friendlyApprovalError`.
- **The panel is personal:** Needs my decision, My submissions, Decided by me, and All for roles with the "Manage approvals" permission. The bell counts only what is waiting on the signed-in person.
- **Rounds and versions (phase 2):** every submission is a numbered `round` (shown as "v2" on the badge and "Approved (version 2)" on the card). `request_approval(p_brief_id, p_email_name, p_stages, p_start_stage)` reads the brief from the `briefs` table itself, so what is approved is what is saved, and stores a `content_hash` (`brief_content_hash`: sha256 of the brief's JSON without `meta`). Changing a brief's content (trigger `briefs_supersede_approvals`) closes any pending approval as `superseded` and marks earlier approvals `stale`; a change to `meta` alone does nothing. Statuses are now pending, approved, rejected, changes_requested, withdrawn, superseded.
- **Resubmitting:** after changes were requested, `p_start_stage` resumes at the stage that asked for them and carries the earlier stages' approvals forward (un-staled); the submit dialog's "Start again from stage 1" tick-box restarts everyone. Resuming is refused unless the last record is `changes_requested` at that stage (`invalid_start_stage`).
- **Withdraw:** `withdraw_approval` (the requester or an admin) closes a pending approval; shown on the card with an optional reason.
- **Gating:** with "Block distribution without approval" on (and Approvals enabled), trigger `kanban_distribution_gate` refuses `kanban_cards.column → 'distributed'` with `distribution_blocked:<code>` unless the brief is validly approved (`_distribution_reason`: not_submitted, approval_pending, changes_requested, approval_rejected, approval_withdrawn, approval_stale). Cards with no `briefs` row, and email types with no stages, are exempt. Admins can override with `distribute_with_override(card, reason ≥ 10 chars)`, recorded in `approval_overrides` and flagged on the card (`columnHistory[].override`). `KanbanContext.moveCard` shows the move straight away, reverts when refused, and `DistributionBlockedDialog` (rendered by the provider) explains why and offers the admin override.
- **Notifications:** requested (to the stage's approvers, including the next stage after an approval), approved, rejected, changes requested, withdrawn and overridden are sent by `ApprovalsContext` / `KanbanContext` after the database accepts the action, built in `src/lib/approvalNotifications.ts`. Each payload carries `toEmails` (and `approverEmails` / `requesterEmail`) so the Power Automate flow does not have to work out who to tell; approver addresses come from `approval_recipients`. A failed notification is logged and never undoes the action.
- **Card UI:** `CardApprovalSection` (status, next action, history, override note) replaces the inline block in `CardDetailDrawer`; state comes from `briefApprovalState` in `approvalRouting.ts`.
- Not built yet (phase 3): due dates and overdue reminders (needs a scheduler), card wording pass, comments simplification, accessibility pass.

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

- [x] All five form steps render correctly and advance/retreat without data loss
- [x] Zod validation blocks advancement on any invalid or missing required field
- [x] Character counters update in real time
- [x] Draft is written to localStorage on every change and restored on page reload
- [x] Theme selector shows colour swatches
- [x] Sections can be added (max 4) and removed (min 1) dynamically
- [x] `sendDate` cannot be set before `contentApprovalDate` — form-level error shown
- [x] `heroImageAlt` becomes required when `heroImageUrl` is entered
- [x] Completed brief can be downloaded as `brief-{campaignName}-{date}.json`
- [x] Completed brief can be copied to clipboard as JSON
- [x] No TypeScript errors (`tsc --noEmit` passes clean)
- [x] No `any` types in production code
