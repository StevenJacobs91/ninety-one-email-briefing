# Library-Driven Email Builder Implementation Plan (Plan C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the placeholder-skeleton builder on tab 2 with one driven by the real `Themes and Modules` library: pick modules, see their real HTML, and edit every editable region directly (text, rich text, buttons, images, repeat slots).

**Architecture:** A build-time script turns each theme folder into one JSON catalogue (`public/module-catalogue/<themeId>.json`: shell head/tail plus raw module HTML). A pure engine (`src/lib/moduleEngine/`) parses a module's `pardot-region`/`pardot-repeatable` markup into fields and renders field values back into the original markup. A build (spec §10) is stored on the brief as `content.build`. The existing `ContentEditorShell` UI is replaced by a canvas of real module previews, a searchable picker, and an inspector with one editor per region.

**Tech Stack:** React 18, TS strict, `tsx --test`, `linkedom` (new devDependency; DOM for engine tests and the catalogue script only; the browser uses `DOMParser`).

**Spec:** `docs/superpowers/specs/2026-10-20-email-builder-and-campaign-templates-design.md` §6, §7, §8, §10, §11.

## Global Constraints

- The library is the source of truth: **no hand-written field schemas** (§6.1). Untouched markup is emitted byte-for-byte.
- Region kinds: `subheading`, `detail`, `""`, `main-speaker` = single-line text; `paragraph` = rich text (b, i, em, strong, a, br only); `button` = label + URL; `editable-image` = URL + alt.
- Build format keys: `<group>[<index>].<ordinal>`, `root` for non-repeating (§10). Theme switch re-reads the module from the new theme folder and re-applies values by key.
- Settings win over library asset URLs (`settings.brandThemes[].logoUrl/stripeUrl/footerLogoUrl`, §6.4).
- Seeded slots Header, Body Intro, Footer, Disclaimer cannot be removed (§8).
- No `any`; early returns; user text is HTML-escaped; rich text sanitised.
- Project path is iCloud-synced: run `npx tsc --noEmit` once per task. Never edit ` 2` duplicate files.

## Rulings taken in this plan (spec §11 "left to the builder")

- **Delivery:** catalogue JSON built by `scripts/build-module-catalogue.ts`, run from `predev`/`prebuild`, output git-ignored. The source folders must be committed for Azure to build (they are untracked today): flagged for the user before any merge.
- **Outer document:** the per-theme master in `HTML Templates/` is authoritative. Shell head = text through the `email-container` table's opening `<tbody>`; tail = from its closing `</tbody>`. `emailGenerator`'s hand-written wrapper remains the fallback for briefs with no build.
- **Region with a link inside** (e.g. "Read more" `<h3><a>`): the field carries `value` (the anchor's text) plus `href`. Build format gains optional `href` per region (extends §10).
- **Repeating unit detection:** nearest ancestor of the marker that has a sibling of the same tag and structural signature. Ambiguous modules fall back to a fixed repeat count (no add/remove) and are listed in the ledger.
- **`htmlEdits`** (selector-based post-edits on tab 3) keep working on the final HTML; they are not migrated.

## Review Focus

1. **The 6 modules with no editable region** show as fixed in the picker and canvas, with an empty inspector, never a crash.
2. **Template syntax** (`{{#if Recipient.FirstName}}`, `%%view_online%%`) in untouched or edited regions survives verbatim; user text containing `<`, `&`, `"` is escaped.
3. **Theme switch** where a module's region set differs: matching keys re-apply, unmatched values are reported, nothing throws.
4. **Repeat detection ambiguity**: a module whose unit cannot be detected still renders and edits, with add/remove disabled.
5. **Rich text with hostile markup** (`onclick`, `javascript:` href, `<script>`) is sanitised on render.
6. **Catalogue fetch failure**: the builder shows a retryable error; briefs without a build still produce HTML via the legacy path.

---

### Task 1: Catalogue pipeline

**Files:** Create `scripts/build-module-catalogue.ts`, `src/lib/moduleEngine/catalogue.ts`, `src/lib/moduleEngine/catalogue.test.ts`; modify `package.json` (`linkedom`, `predev`, `prebuild`, `test` glob already covers `src/**`), `.gitignore`.

**Interfaces:**
- Produces: `interface ThemeCatalogue { themeId: string; shell: { head: string; tail: string }; order: string[]; modules: Record<string, string> }`; `themeFolderName(label: string): string` (`"A / B"` to `"A B"`); `loadCatalogue(themeId: string, fetchImpl?: typeof fetch): Promise<ThemeCatalogue>` (cached per theme, rejects with a clear error on non-OK).

- [ ] **Step 1: Tests** (`catalogue.test.ts`): `themeFolderName('Agulhas Indigo / Cape Coral') === 'Agulhas Indigo Cape Coral'`; `loadCatalogue` with a stub fetch returns the JSON and a second call does not fetch again; a 404 rejects with a message naming the theme.
- [ ] **Step 2:** Run; expected FAIL.
- [ ] **Step 3:** Implement `catalogue.ts`; write the script: for every `BRAND_THEMES` entry read `Themes and Modules/Modules/<folder>/*.html` (name = filename minus `.html`), read the master `HTML Templates/<folder> - All Modules.html`, split shell at the `email-container` `<tbody>` boundaries, emit JSON. The script throws if a folder is missing, a theme has fewer than 48 modules, or the master has no single `email-container`.
- [ ] **Step 4:** Run the script; verify 15 files, each shell has both halves. Run tests; PASS.
- [ ] **Step 5: Commit.**

### Task 2: Region parsing and substitution

**Files:** Create `src/lib/moduleEngine/regions.ts`, `regions.test.ts`, `fixtures.ts`.

**Interfaces:**
- Produces: `type RegionKind = 'text' | 'rich' | 'button' | 'image'`; `interface RegionField { key: string; rawKind: string; kind: RegionKind; value: string; href?: string; alt?: string }`; `parseRegions(doc: Document): RegionField[]` (document order, keys per §10 with `root` for now); `applyRegions(doc: Document, values: Record<string, { value?: string; href?: string; alt?: string }>): void`; `sanitizeRich(html: string): string`; `makeDoc(html: string): Document` (browser `DOMParser`, tests inject linkedom).

- [ ] **Step 1: Tests** with the real `Greeting`, `Body Content`, `Single Primary CTA`, `Header with Image` and `Article List` files read from the library: region counts and kinds match the spec table; setting a text region changes only that text node (diff of untouched HTML is empty); `{{#if Recipient.FirstName}}` survives an unrelated edit; a paragraph edit with `<script>` and `onclick` is sanitised; a button edit changes label and `href` only; a link-inside subheading keeps its `<img>` arrow; user text `a < b & "c"` is escaped.
- [ ] **Step 2:** Run; FAIL.
- [ ] **Step 3:** Implement per Interfaces. Text kinds replace the first non-empty text node, preserving trailing whitespace/`&nbsp;`; rich replaces `innerHTML` after `sanitizeRich`; button edits the contained or own `<a>`; image edits `src`/`alt`.
- [ ] **Step 4:** Run; PASS.
- [ ] **Step 5: Commit.**

### Task 3: Repeating blocks

**Files:** Create `src/lib/moduleEngine/repeats.ts`, `repeats.test.ts`; extend `regions.ts` keying.

**Interfaces:**
- Produces: `interface RepeatGroup { group: string; units: number; canResize: boolean }`; `parseRepeats(doc: Document): RepeatGroup[]`; `resizeRepeat(doc: Document, group: string, count: number): void` (clones the last unit or removes from the end; no-op when `!canResize`); region keys become `<group>[<i>].<n>` for regions inside a unit.

- [ ] **Step 1: Tests:** Article List reports group `subheading` with 3 units and `canResize`; resizing to 5 yields 5 units each carrying a headline region and the Read-more link; resizing to 1 leaves 1; keys are stable when a unit is added (existing keys unchanged); an analysis test over all 28 repeatable modules asserts each parses without throwing and records which are `canResize:false` (snapshot of names written to the ledger).
- [ ] **Step 2:** FAIL. **Step 3:** Implement the ancestor-climb detection in Interfaces. **Step 4:** PASS. **Step 5: Commit.**

### Task 4: Build model and rendering

**Files:** Create `src/lib/moduleEngine/build.ts`, `render.ts`, `build.test.ts`; modify `src/lib/schema.ts` (`content.build` optional), `src/types/brief.types.ts`.

**Interfaces:**
- Produces: spec §10 types `EmailBuild`, `BuildModule` (with `href?`); `newInstanceId(): string`; ops returning new builds: `addModule(b, name, at)`, `removeModule(b, instanceId)` (refuses seeded slots), `moveModule(b, instanceId, to)`, `duplicateModule(b, instanceId)`, `setRegion(b, instanceId, key, patch)`, `setRepeat(b, instanceId, group, count)`, `setTheme(b, themeId)`; `renderBuild(build: EmailBuild, cat: ThemeCatalogue, opts: { assets: ThemeAssets; doc: (html: string) => Document }): { html: string; report: { droppedKeys: { instanceId: string; key: string }[]; unknownModules: string[] } }` (shell head + rendered modules + tail).

- [ ] **Step 1: Tests:** rendering an empty build returns head + tail; rendering a build with Greeting + Body Content + Footer v1 includes edited values; `removeModule` on a seeded slot returns the build unchanged; `setTheme` re-render reports `droppedKeys` for a key absent in the new theme and does not throw; unknown module name is reported in `unknownModules` and skipped; settings assets override library asset URLs.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. **Step 5: Commit.**

### Task 5: Seeded skeleton, brief bindings, legacy read path

**Files:** Create `src/lib/moduleEngine/seed.ts`, `seed.test.ts`, `legacy.ts`, `legacy.test.ts`.

**Interfaces:**
- Produces: `seedBuild(themeId: string, headerTypeId?: string): EmailBuild` (Header with Image or the chosen header type, Greeting, Body Content, Disclaimer, Footer v1, with `slot` set); `bindBrief(build: EmailBuild, brief: { headline: string; subHeadline: string; bodyIntro: string }): EmailBuild` (Headline to header `<h1>`, Sub-headline to `<h2>`, Body Intro to Body Content paragraph, recorded in `boundFields`); `buildFromLegacy(content: LegacyContent, themeId: string): EmailBuild` mapping old `EMAIL_MODULES` ids onto library names where they correspond (table in `legacy.ts`), carrying `moduleNotes` as nothing and unmatched ids as `unknownModules`.

- [ ] **Step 1: Tests:** seed order and slots; bind sets exactly the three bound regions and leaves others; unbinding by editing the region directly drops `boundFields`; legacy mapping of `body-content`, `greeting`, `header-small` ids and an unmappable id; a legacy brief with `sections` yields Body Content modules or a reported loss, never a throw.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. **Step 5: Commit.**

### Task 6: The builder UI (tab 2)

**Files:** Create `src/components/builder2/` (`LibraryBuilder.tsx`, `ModulePreview.tsx`, `ModulePicker.tsx`, `ModuleInspector.tsx`, `RegionEditor.tsx`, `useCatalogue.ts`); modify `src/components/steps/StepContent.tsx` (tab 2 renders `LibraryBuilder` only; retired fields per §7.0.1 follow in Task 8).

**Interfaces:** `LibraryBuilder` reads/writes `content.build` via react-hook-form; initialises with `bindBrief(seedBuild(...))` for new briefs or `buildFromLegacy` for old ones; `ModulePreview` renders one module in an isolated `iframe srcDoc` with shell head styles so real styling shows; clicking selects it; `RegionEditor` switches on `RegionField.kind` (text input, `RichTextarea` for rich, label+URL, image URL+alt).

- [ ] **Step 1:** Implement `useCatalogue` (loading, error with Retry). **Step 2:** canvas of `ModulePreview`s with up/down/duplicate/remove and **+** between modules opening `ModulePicker` (search over the 50 names, current theme). **Step 3:** inspector shows the selected module's regions with `RegionEditor`s and repeat +/− controls. **Step 4:** theme change in the Campaign tab re-renders from the new catalogue and shows the dropped-key report. **Step 5:** `npx tsc --noEmit`; preview verification (the annotated case): select Body Content, edit its paragraph, preview updates; add an Article List, add a slot; reload, content persists. **Step 6: Commit.**

### Task 7: HTML Email integration

**Files:** Modify `src/lib/emailGenerator.ts` (`generateEmailHtml`: when `brief.content.build` exists, `renderBuild` with the loaded catalogue; else existing path), `StepHtmlReview.tsx` (await the catalogue), tests for the dispatch.

- [ ] **Step 1: Test:** `generateEmailHtml` with a build returns the shell plus module HTML and UTM rewriting applied; without a build returns today's output unchanged (golden check on one fixture brief). **Step 2:** FAIL. **Step 3:** Implement; keep `applyUtmToHtml` on the final string. **Step 4:** PASS; preview tab 3 shows the built email and Test Email/Submit still send it. **Step 5: Commit.**

### Task 8: Retire the old builder and the replaced Content fields

**Files:** Delete `src/components/builder/` (non-duplicate files) and the `FormShell.tsx:~1018` toggle; modify `StepContent.tsx` (remove greeting, CTA, disclaimer, sign-off, headline/sub-headline/body-intro form fields in favour of bound modules), `schema.ts` (drop `sections.min(1)`; derive legacy `cta`, `sections`, `legalDisclaimer` for Pardot/Power Automate from the build), `generateBriefHtml.ts`.

- [ ] **Step 1: Tests:** a brief built only from modules still yields `cta.url`/`label` for the Pardot payload (derived from the first `button` region); empty `sections` validates. **Step 2:** FAIL; implement; PASS. **Step 3:** verify in preview that Section 1 is no longer a blocker. **Step 4: Commit.**

## Out of scope here

Campaign templates (Plan D); missing header modules (brand team); the 6 region-less modules stay fixed.
