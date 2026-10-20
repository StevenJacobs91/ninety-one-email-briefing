# Email Builder rebuild + campaign templates — design

**Date:** 2026-10-20
**Status:** Approved pending read
**Branch at time of writing:** `main` @ `2c17f29` (tracking `ninetyone/main`)

---

## 1. Why

The Content tab's email builder does not work. Four faults were reported:
header types don't populate, logo variants don't populate, module blocks can't
be edited, and Section 1 can't be removed.

They share one cause. **The Content tab renders `ContentEditorShell`**
(`src/components/steps/StepContent.tsx:892`) — a module-based editor with a
`ModuleLibraryPanel`, `ModuleLibraryCard` and `EmailCanvas`. So "choose modules
and populate them" is already half-built. But it is wired to the wrong list and
holds the wrong thing:

- Its modules come from **`EMAIL_MODULES`** — 41 hand-written ids in
  `src/lib/constants.ts:77` — not from the 50-module library in
  `Themes and Modules/`.
- `content.modules` is a `string[]` of ids, and the per-module data is
  `moduleNotes` — **notes about the module, not content for it.** That is
  precisely "I am unable to edit the blocks in the email modules".
- The five header types (`standard`, `standard-bg-image`, `slim`,
  `standard-35yr`, `slim-35yr`) exist in `DEFAULT_HEADER_TYPES` as settings
  metadata with `htmlSnippet: ''`, and nothing maps them to real header
  modules.
- `LOGO_VARIANTS` is defined at `src/lib/constants.ts:73` and nothing reads it.
- `src/lib/schema.ts:73` pins `sections` at
  `.min(1, 'At least one section required')` — working as originally specified,
  wrong for a module-based editor. This is why Section 1 won't delete.

There is also a **second, separate** email builder at
`src/components/builder/`, opened from `FormShell.tsx:1018` behind its own
toggle, with its own invented block vocabulary (`hero`, `text`, `image`,
`button`, `columns`…) and **no persistence at all** — a build there is lost on
close. Two editors, neither finished, neither using the real library.

Three content models currently coexist: `EMAIL_MODULES` (41 ids), builder
blocks (9 types), and brief `ContentSection[]` (1–4). None is the library.

---

## 2. Goals

1. Build an email by choosing modules from the **real Ninety One library** and
   filling in their content.
2. Output is brand-correct **by construction**: outside an edited region, the
   markup is the library's own.
3. Output stays Pardot-ready: `pardot-region`, `pardot-repeatable` and
   `{{Recipient.*}}` merge tags survive intact.
4. Every email begins with a Header, Body Intro and Footer already in place,
   populated from the brief.
5. A finished build can be saved against a campaign and reloaded next time that
   campaign is briefed.
6. One email builder, not three.

## 3. Non-goals

- A general drag-and-drop page builder. The module list is the vocabulary.
- Changing how email is sent, or the Pardot integration itself.
- The Power Automate flows (separate; three have no callers).
- Redesigning the Campaign, Audience, Assets or Deadlines steps.
- Editing module markup from inside the app.

## 4. Anti-goals — failure even if it ships

- **Markup drift.** Generated HTML differing from library markup outside an
  edited region — or an edited image, per §6.4 — is off-brand and has failed.
- **Losing merge tags.** Stripping `{{#if Recipient.FirstName}}` sends email
  addressed to nobody.
- **A requester silently changing a campaign's template** for everyone else.
- **A fourth vocabulary.** New block types alongside the 50 modules repeat the
  original mistake.
- An email that ships with no unsubscribe link.
- A builder that still cannot save.

## 5. Constraints

- React 18, TypeScript strict, Vite 5, Tailwind v3, React Hook Form + Zod.
  No component library; Tailwind utilities and `brand-*` tokens only.
- No `any` in production code; `tsc --noEmit` stays clean.
- British spelling in user-facing copy.
- Data access is **Supabase** (`src/lib/supabaseQueries.ts`,
  `supabase/migrations/`). The Azure/Entra work on `feat/azure-db-schema` is
  **not merged** — do not depend on it, and do not use `db/migrations/`.
- The library in `Themes and Modules/` is **not reachable at runtime** today —
  `public/` holds only `fonts`.

---

## 6. The module library is the source of truth

Measured on `Themes and Modules/Modules/Agulhas Indigo Cape Coral`, which is
representative: **the 50 module filenames are byte-identical across all 15
theme folders**, and region counts match per module and in total. A theme
change is a folder swap. The 15 folders map onto the 15 `BRAND_THEMES` ids.

```html
<!-- Greeting Start -->
<p pardot-region="paragraph" style="margin:0 0 15px;">
  {{#if Recipient.FirstName}} Dear {{Recipient.FirstName}},{{else}} Good day,{{/if}}
</p>
<!-- Greeting End -->
```

### 6.1 Editable regions — 230 across the 50 modules

| `pardot-region` | Count | Becomes |
|---|---:|---|
| `subheading` | 78 | single-line text |
| `detail` | 57 | single-line text |
| *(empty string)* | 33 | single-line text — these are real content fields, e.g. the article headline in Article List |
| `paragraph` | 32 | rich text (bold, italic, link) |
| `button` | 20 | label + URL |
| `editable-image` | 9 | image URL + alt |
| `main-speaker` | 1 | single-line text |

The builder parses a module, finds its regions, renders one field each, and
substitutes values back into the original markup. **No hand-written field
schemas.**

### 6.2 Repeating blocks — 65 markers across 28 modules

| `pardot-repeatable` | Count |
|---|---:|
| `subheading` | 52 |
| `speaker` | 6 |
| `dual-cta` | 3 |
| `main-speaker` | 2 |
| `speakers` | 1 |
| *(empty)* | 1 |

The marker sits on an element *inside* the repeating unit, not on the unit.
In Article List the three article blocks each contain an unnamed region (the
headline) **and** a `pardot-repeatable="subheading"` (the "Read more" link).
**The implementation must detect the repeating structural ancestor**, clone it
to add a slot, and remove it to delete one.

### 6.3 Library gaps

- **6 modules expose no editable region:** Footer V3, Gallery V1, Gallery V2,
  Risk Warnings - UK, Video Play Rollover, Visually Hidden Preheader Text.
- **4 modules lack `Start`/`End` markers:** Disclaimer, Disclaimer - UK,
  Inner body content, Small Header v2.

### 6.4 Images and assets — two documented carve-outs

Strict "substitute regions, touch nothing else" does not survive contact with
the library, so two exceptions are specified rather than discovered:

- **Placeholder images.** Only 9 regions are `editable-image`, but 10 modules
  ship `placehold.co` images in plain `src=`/`background=` attributes —
  including **Header with Image**, whose hero is a placeholder, and Article
  List's thumbnails. The build format carries **image overrides** keyed to
  those attributes (§10). Without this, every email with an image header or an
  article list ships placeholders.
- **Theme assets.** Library markup is not reliably theme-correct: in the
  Agulhas Indigo Cape Coral folder, Small Header, Small Header v2 and Header
  with Image all reference `banner_stripe_warm_yellow_600x250.png`. **Settings
  win**: `settings.brandThemes[].logoUrl / stripeUrl / footerLogoUrl` and
  `HeaderTypeConfig.assets` are substituted over library asset URLs, as
  `emailGenerator` does today.

---

## 7. Scope: rewire the Content tab, retire the other builder

**Decided by the user.** The existing `ContentEditorShell` is rewired to the
real library; `src/components/builder/` and the `FormShell` toggle that opens
it are removed, so there is one way to build an email.

Interaction — **the email itself, edited in place** (chosen from three options:
a three-pane library/canvas/inspector, this, and a two-step pick-then-populate
wizard):

- One column showing the real email at its real width.
- A **+** between every module opens a **searchable** picker listing all 50
  modules for the current theme. *(Searchable rather than a short menu: the
  user considered the three-pane layout, whose appeal was its browsable
  library, before choosing in-place editing.)*
- Clicking a module expands its fields in position; one module edits at a time.
- Modules reorder and delete, except the seeded ones (§8).
- Repeating blocks gain **add/remove slot** controls (§6.2).
- A theme switch re-reads each module from the new theme folder and re-applies
  saved content. Content survives; styling changes.

**Migration.** `content.modules: string[]` holds `EMAIL_MODULES` ids on saved
briefs, drafts and `BRIEF_TEMPLATES[].suggestedModules`; `settings.htmlModules`
gates them. A read path must map old ids onto library module names where they
correspond and degrade visibly where they don't.

---

## 8. Seeded skeleton and brief bindings

Every new email starts with four modules present:

| Slot | Default module | Bound from the brief |
|---|---|---|
| Header | per selected header type | `headline` → `<h1>`, `subHeadline` → `<h2>` |
| Body | Body Content | `bodyIntro` → its single region |
| Disclaimer | Disclaimer, or Disclaimer - UK by region | — |
| Footer | Footer v1 | — |

`subHeadline` already exists at `src/types/brief.types.ts:48`.

**The Disclaimer module is seeded although the user named only three.**
Footer v1 contains no unsubscribe link — only a privacy notice and
`{{View_Online}}`; the unsubscribe lives in the Disclaimer module. Seeding
three would ship a compliant-looking email with no unsubscribe. It honours the
existing `includeUnsubscribe` and `legalDisclaimer` brief fields.

Verified against the library:

| Module | `<h1>` | `<h2>` | regions |
|---|---:|---:|---:|
| Header with Image | 1 | 1 | 2 |
| Small Header | 1 | 1 | 2 |
| Plain Logo Header | 1 | 1 | 2 |
| Small Header v2 | 1 | **0** | 2 |
| Body Content | 0 | 0 | 1 |
| Footer v1 | 0 | 0 | 5 |

### 8.1 Header types — library extension required

**Decided by the user: add the missing header modules.** Five header types
cannot be produced from four modules. They differ along axes the library does
not carry: only Small Header contains the 35-year graphic, and carries it
unconditionally; nothing distinguishes a "slim" stripe.

The brand team must produce the missing header variants **across all 15
themes**. This is outside this project and blocks full resolution of the
header-type fault.

**Interim behaviour until they land:** types with `requiresHeroImage: true` map
to Header with Image; `standard` maps to Plain Logo Header; `slim` to Small
Header v2; `standard-35yr` to Small Header. **`slim-35yr` is shown disabled in
the picker with a note that the module is pending**, rather than silently
rendering the wrong header. Each type's `htmlSnippet` stops being load-bearing.

**Logo variants** (`horizontal`, `stacked`, `icon`) become a field on the
header module, replacing `HeroBlock.logoVisible`.

### 8.2 Decisions taken here

- **Seeded modules are swappable, not removable.** A header type change swaps
  the module; the email is never left without a header, disclaimer or footer.
- **Small Header v2 is hidden when a sub-headline exists** — it has no `<h2>`.
- **A binding breaks on direct edit.** The header `<h1>` tracks the brief's
  headline until someone edits it in the builder; thereafter the builder wins.
  The alternative silently discards typing.
- **Greetings stay with the existing feature.** The Greeting module ships two
  alternative `{{#if Recipient.*}}` paragraphs, both marked editable; exposing
  them as free text invites deletion of merge tags (§4) and would ship both.
  `content.greetingId` + `settings.greetings` continue to drive the greeting,
  and those regions are not free-text editable.

---

## 9. Campaign templates

Most campaigns reuse the same build — layout, theme, images — and only the copy
changes.

**Decided by the user: extend content presets.** Campaign selection already
auto-fills theme, subject line, preview text, headline, sub-headline and hero
image through `CampaignEntry.contentPreset` in the settings blob. The saved
build joins it:

```
CampaignEntry.contentPreset
  theme, subjectLine, previewText, headline, subHeadline, heroImage   // existing
  build: EmailBuild                                                   // added
```

One mechanism, one place to manage, and no contest over which wins on campaign
select. **No `campaign_templates` table** — an earlier draft proposed one; it
is dropped. The `campaigns` table exists only in `db/migrations/006_planner.sql`
("No application code reads these yet") and is absent from
`supabase/migrations/`, so a `campaign_id` foreign key would have had nothing
to point at.

**Behaviour**

- A producer or admin saves the current build onto the campaign's preset.
- Selecting that campaign loads the build, assembled, ready for new copy.
- Loading never silently discards work: if the build is non-empty, ask first.
- Saving captures the build as it stands, **images included**.

**Permissions — decided by the user:** only a **producer** or **admin** may
save or overwrite a campaign's build. A requester loads it and edits their own
email freely; their edits never write back. Enforced through the existing
`rolePermissions.canManageTemplates` key, with `profiles.role` as the source of
truth, and at the database layer in `supabase/migrations/` following the
`20260407_approvals.sql` precedent (`profiles.role` via `auth.uid()`).

---

## 10. The build format

```jsonc
{
  "version": 1,
  "themeId": "agulhas-coral",
  "headerTypeId": "standard-bg-image",
  "modules": [
    {
      "instanceId": "a1b2c3",
      "moduleName": "Article List",      // library filename, no extension
      "slot": null,                      // header | body | disclaimer | footer | null
      "repeats": { "subheading": 5 },    // repeat group → slot count (default = library's)
      "regions": {
        "root.0":         { "kind": "subheading", "value": "This month" },
        "subheading[0].0": { "kind": "",          "value": "Rates and the rand" },
        "subheading[0].1": { "kind": "subheading", "value": "Read more" },
        "subheading[1].0": { "kind": "",          "value": "Equity outlook" }
      },
      "images": {
        "root.0": { "src": "https://cdn…/hero.jpg", "alt": "Cape Town harbour" }
      },
      "boundFields": { "root.0": "headline" }
    }
  ]
}
```

- Region keys are **`<group>[<index>].<ordinal>`**, with `root` for regions
  outside any repeating block. A plain ordinal cannot survive adding a slot,
  which is why answer 3 changes this from the earlier draft.
- `repeats` records slot counts; absent means the library's own count.
- `images` carries the §6.4 overrides, keyed the same way, addressing
  `src`/`background` attributes that are not regions.
- `boundFields` records a live brief binding, dropped when the binding breaks.

**Rendering:** take the library module for `themeId` + `moduleName`, clone or
drop repeating units to match `repeats`, substitute region values and image
overrides, apply theme assets (§6.4), concatenate in order. Nothing else is
touched.

---

## 11. Left to the builder

- **Runtime delivery.** The 788 files are unreachable today. Suggested: a
  build-time script parsing each theme folder into one JSON catalogue per
  theme, emitted to `public/` and fetched on theme selection (≈250 KB per
  theme) rather than bundling all 15.
- **The outer document.** Library modules are bare `<tr>` fragments and need an
  `<html>`/`<head>`/640px table wrapper. Two candidates exist: the per-theme
  `… - All Modules.html` files, and the hand-written wrapper in
  `src/lib/emailGenerator.ts`. Decide which is authoritative, and how the build
  relates to `generateEmailHtml`, the UTM rewriting in `applyUtmToHtml`, and
  the selector-based `BriefPayload.htmlEdits` editing surface in
  `StepHtmlReview.tsx` — those selectors break when modules move.
- **The 6 modules with no editable region** — show fixed, or raise with the
  brand team before adding regions.
- **Widget per region kind**, and the rich-text subset for `paragraph`.
- **Retiring `ContentSection[]`** — remove `min(1)` at `schema.ts:73` and
  provide a read path for existing briefs holding sections.
- **Delete the ` 2` duplicate files** across `src/components/content-editor/`,
  `src/components/builder/` and `src/lib/` — iCloud sync conflict artifacts.
  Confirm none is the imported version first.

---

## 12. What this fixes

| Reported fault | Resolution |
|---|---|
| Header types don't populate | Mapped to real header modules; two pending brand-team modules shown disabled (§8.1) |
| Logo variants don't populate | `LOGO_VARIANTS` becomes a header-module field |
| Can't edit blocks in email modules | `moduleNotes` is replaced by real region content from `pardot-region` |
| Can't remove Section 1 | "Sections" retired; `schema.ts:73` `min(1)` removed |
| *(found)* builds don't persist | Build stored on the brief and on the campaign preset |
| *(found)* two rival builders | `src/components/builder/` retired |

---

## 13. Calls made without asking

1. **Theme assets from Settings override library asset URLs** (§6.4) — library
   markup carries off-theme stripe art.
2. **Image overrides for non-region placeholders** (§6.4) — otherwise image
   headers and article lists ship `placehold.co`.
3. **Supabase migrations, not `db/migrations/`** (§5) — the app talks to
   Supabase; the Azure tree is unmerged and unreachable.
4. **Greetings stay with `greetingId`/`settings.greetings`** (§8.2) — exposing
   merge-tag regions as free text invites deleting them.
5. **The Disclaimer module is seeded as a fourth element** (§8) — the user named
   three, but Footer v1 carries no unsubscribe link.
6. **`slim-35yr` is disabled rather than mapped** (§8.1) — no module can produce
   it; silently substituting would be wrong on brand.
