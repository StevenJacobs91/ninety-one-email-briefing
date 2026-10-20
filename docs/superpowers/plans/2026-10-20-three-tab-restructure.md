# Three-Tab Restructure Implementation Plan (Plan B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace today's five tabs (Campaign, Content, Brief Review, then pipeline Brand Review, HTML Email) with three: **Campaign**, **Layout & Content**, **Review and Submission**. Brand Review becomes a sidebar panel beside Checklist details.

**Architecture:** One tab model replaces `pipelineStep` (a second, number-coded step system bolted onto `currentStep`). `FormShell` keeps a single `currentStep` over three tabs. Brand Review's scoring moves into a hook plus a sidebar panel; `StepHtmlReview` becomes the body of tab 3. Saved `settings.formSteps` (Supabase JSONB, may still hold the old three entries) is normalised on read, as `mergePowerAutomate` does for Power Automate.

**Tech Stack:** React 18, TS strict, react-hook-form, Tailwind v3, `tsx --test` (node:test).

**Spec:** `docs/superpowers/specs/2026-10-20-email-builder-and-campaign-templates-design.md` §7.0, §7.0.1 (Additional Asset URLs + Attachments move only).

## Scope boundary

In: tab model, FormShell rewiring, Brand Review sidebar, tab 3 merge, moving Additional Asset URLs and Attachments to Campaign, Form Layout settings copy.
Out (Plan C): the builder itself and retiring Content's other fields. Until Plan C lands, tab 2 renders today's `StepContent` under its new name, so this plan ships working software on its own.

## Global Constraints

- Tab labels exactly: `Campaign`, `Layout & Content`, `Review and Submission`.
- Sidebar on tab 3 carries exactly two panels besides the step guide: **Brand Review** and **Checklist details**.
- No `any`; early returns; no new dependencies.
- Submit gating keeps today's rules: static score below `brandGuardian.minimumScore` blocks; AI `pre-submission` mode blocks until the AI review succeeds and is not `rejected`.
- Project path is iCloud-synced: run `npx tsc --noEmit` once per task, not per step. Never edit the ` 2` duplicate files.

## Review Focus

1. **Old saved `formSteps`** (three entries incl. visible `review`, or a user-hidden step): must yield exactly three tabs, never four, never zero. Pinned in Task 1.
2. **Draft saved while on an old pipeline step**: reopening must land on a valid tab, not an index past the end. Pinned in Task 1 (`clampTab`).
3. **Brand Review blocked** (score under minimum or AI rejected): Submit is disabled and says why; fixing the field from the sidebar link returns to the right tab. Pinned in Task 3.
4. **Brand Review on tab 3 with no content yet** (user jumps straight to tab 3): panel renders a score, does not throw. Pinned in Task 3.
5. **Settings → Form Layout** lists three fixed tabs; toggling the removed `review` step off/on must not resurrect a fourth tab. Pinned in Task 1.

---

### Task 1: Tab model (pure, tested)

**Files:**
- Create: `src/lib/briefTabs.ts`, `src/lib/briefTabs.test.ts`
- Modify: `src/lib/settingsDefaults.ts` (`DEFAULT_FORM_STEPS`, new `mergeFormSteps`), `src/contexts/SettingsContext.tsx` (merge)

**Interfaces:**
- Produces: `type BriefTabId = 'campaign' | 'content' | 'review'`; `BRIEF_TABS: readonly { id: BriefTabId; label: string }[]`; `resolveTabs(formSteps: FormStepConfig[] | undefined): FormStepConfig[]` (always the three tabs, in order, labels from `BRIEF_TABS`, `visible: true`); `clampTab(index: number, count: number): number`; `mergeFormSteps(remote?: FormStepConfig[]): FormStepConfig[]`.
- Consumes: `FormStepConfig` from `settings.types`.

- [ ] **Step 1: Write failing tests** in `briefTabs.test.ts`:
  - `resolveTabs(undefined)` and `resolveTabs([])` return ids `['campaign','content','review']`.
  - Old saved `[campaign, content, review]` (all visible) returns exactly those three ids, labels `Campaign`, `Layout & Content`, `Review and Submission`.
  - Old saved list with `content` `visible:false` still returns three tabs (tabs are fixed; Review Focus 1 and 5).
  - `clampTab(5, 3) === 2`, `clampTab(-1, 3) === 0`, `clampTab(1, 3) === 1`.
- [ ] **Step 2:** `npx tsx --test src/lib/briefTabs.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement `briefTabs.ts` per the Interfaces. `resolveTabs` ignores the saved list's `visible`/`order`/`label` (tabs are fixed by design, §7.0) and exists so callers have one entry point if that is ever relaxed. `mergeFormSteps` returns `resolveTabs(remote)`. `DEFAULT_FORM_STEPS` becomes the three-entry list.
- [ ] **Step 4:** Add `formSteps: mergeFormSteps(remote.formSteps)` to the `SettingsContext` merge. Run the test file. Expected: PASS.
- [ ] **Step 5: Commit** `feat(tabs): fixed three-tab model that normalises saved form steps`.

### Task 2: Brand Review as a hook and a sidebar panel

**Files:**
- Create: `src/hooks/useBrandReviewGate.ts`, `src/hooks/useBrandReviewGate.test.ts`, `src/components/review/BrandReviewPanel.tsx`
- Modify: `src/components/steps/StepBrandReview.tsx` (delete after extraction, once Task 3 no longer imports it)

**Interfaces:**
- Produces: `evaluateGate(input: { score: number; minimumScore: number; aiMode: string; aiStatus: string; aiRejected: boolean }): { blocked: boolean; reason: string | null }` (pure, exported from the hook file); `useBrandReviewGate(data: BriefPayload): { review; ai; blocked: boolean; reason: string | null }`; `<BrandReviewPanel onGoToTab: (tab: BriefTabId) => void />`.
- Consumes: `runBrandGuardianReview`, `useAIBrandGuardian`, `useSettings` exactly as `StepBrandReview.tsx:49-86` does today.

- [ ] **Step 1: Write failing tests** for `evaluateGate`: score under minimum is blocked with a reason naming both numbers; score at minimum passes; `pre-submission` with `aiStatus !== 'success'` is blocked ("AI review has not finished"); `pre-submission` + success + rejected is blocked; `post-submission` never blocks on AI; an empty brief's score does not throw (Review Focus 4, call `runBrandGuardianReview` on `{}` cast through `unknown as BriefPayload` only inside the test).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Move the gate logic from `StepBrandReview.tsx:76-80` into `evaluateGate`; the hook wraps it with the existing static-review and AI auto-run effect (`:69-74`). Build `BrandReviewPanel` from the rendering in `StepBrandReview.tsx:96-end` minus Accept/Decline buttons; sidebar width is 320-340px, so stack score, status, and collapsible REVIEW_SECTIONS. `FeedbackRow`'s step link now maps field prefix to a `BriefTabId` (`campaign|audience|assets|deadlines` to `campaign`, `content` to `content`).
- [ ] **Step 4:** Run tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat(review): brand review gate hook and sidebar panel`.

### Task 3: Rewire FormShell onto three tabs

**Files:**
- Modify: `src/components/layout/FormShell.tsx`, `src/components/ui/StepIndicator.tsx`, `src/components/steps/StepHtmlReview.tsx`
- Create: `src/components/steps/StepReviewSubmission.tsx`
- Delete (end of task): `src/components/steps/StepBrandReview.tsx`

**Interfaces:**
- Consumes: Task 1 `resolveTabs`, `clampTab`; Task 2 `useBrandReviewGate`, `BrandReviewPanel`.
- Produces: `StepReviewSubmission` renders `StepHtmlReview` (unchanged behaviour) and takes `blocked`/`reason` so Submit disables with the reason shown.

- [ ] **Step 1:** In `FormShell.tsx` remove `pipelineStep`, `handleBrandAccept`, `handleBrandDecline`, `handlePipelineStepClick`, `handleGoToStep`, the `pipelineStep === 5` footer and the "Pipeline" header block. `visibleBriefSteps` becomes `resolveTabs(settings.formSteps)`. `currentStep` is clamped with `clampTab` when a draft loads. `handleBriefSubmitAndAdvance` becomes the check run when moving from tab 2 to tab 3: `form.trigger()`, and on failure jump to the first tab owning an invalid field, as the existing loop does.
- [ ] **Step 2:** `StepIndicator`: delete `PIPELINE_LABELS` and the `isPipeline` branch; labels show from the second tab up at `sm`. Header counter reads `n / 3`.
- [ ] **Step 3:** `HelpPanel`: stepId `review` renders Step Guide, then `BrandReviewPanel`, then the existing Checklist details block (condition changes from `stepId === 'html-email'` to `'review'`). Add `STEP_HELP_BY_ID['review']`; keep `content` copy; drop `brand-review` and `html-email` entries.
- [ ] **Step 4:** Footer on tab 3: Back to Layout & Content only (Submit lives inside `StepHtmlReview`); wire `blocked`/`reason` into its Submit button next to the existing `submitError`.
- [ ] **Step 5:** `npx tsc --noEmit`, `npm test`. Expected: clean, all tests pass. Delete `StepBrandReview.tsx` once nothing imports it (`grep -rn StepBrandReview src`).
- [ ] **Step 6: Commit** `feat(brief): three tabs, with Brand Review in the sidebar`.

### Task 4: Move Additional Asset URLs and Attachments to Campaign

**Files:** Modify `src/components/steps/StepContent.tsx`, `src/components/steps/StepCampaign.tsx`, `src/lib/validateStep.ts` (field to step map).

- [ ] **Step 1:** Cut the two field groups from `StepContent`, paste into `StepCampaign` under a "Supporting material" heading, unchanged field names (`assets.additionalAssetUrls`, attachments), so the payload is untouched.
- [ ] **Step 2:** Move those field paths from the `content` entry to the `campaign` entry in `getStepFields`; `StepBrandReview`'s old `FIELD_TO_STEP` is already replaced in Task 2.
- [ ] **Step 3:** `npx tsc --noEmit`; preview: fill a URL on Campaign, advance, return, value persists. **Commit** `feat(campaign): supporting material fields live on the Campaign tab`.

### Task 5: Settings copy and live verification

**Files:** Modify `src/components/settings/TabFormLayout.tsx`.

- [ ] **Step 1:** Replace the "always shown after these" copy with a short note that the three tabs are fixed; remove the step visibility/reorder controls (tabs are fixed). Keep field-level toggles.
- [ ] **Step 2:** Verify in the preview, reading console and logs: three tabs render; brief with all fields reaches tab 3; Brand Review and Checklist details sit in the sidebar; Submit disabled with a stated reason for an empty brief; a draft saved on the old tab 5 reopens on tab 3, not blank.
- [ ] **Step 3: Commit** `feat(settings): form layout reflects the fixed three tabs`.

## Calls for you before execution

1. **The old "Brief Review" step** (`StepReview`: brief summary, JSON/PDF export). The spec's three tabs have no slot for it. My default: fold its summary and export buttons into a collapsed "Brief summary" section at the top of tab 3, so nothing is lost. Alternative: drop it.
2. **Fixed tabs.** The plan removes Settings control over tab order and visibility. Say if you want that kept.
