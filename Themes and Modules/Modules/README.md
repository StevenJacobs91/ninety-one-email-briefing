# Module library — 48 modules × 15 themes, plus 2 UK jurisdiction fragments

**Generated:** 4 September 2026  
**Extracted from:** the 15 theme masters in `../HTML Templates/` — 4,603 lines each  
**Re-extracted twice on 7 September 2026.** First after the `DontUseAdvancedTypographyReadingMail` head block was inserted at master lines 10–14 — all ranges +5, and all 720 fragments verified byte-identical, since the insertion touched only the head. Then after `Footer v1` lost its redundant third row — 15 fragments changed, 705 verified unchanged.  
**Form:** HTML fragments — the module's sibling `<tr>` rows and their comment fences, byte-identical to the master. Not standalone documents; they are drop-in copy sources.

**720 files**, 3.63 MB, one folder per theme.

```
Modules/
└── <Theme Name>/
    ├── Header with Image.html
    ├── Greeting.html
    └── … 48 files
```

## How to use these

Build standards §0: *modules are transplanted, not written.* These files make that literal — an agent reads one file and pastes it, instead of locating a fence and copying a line range out of a 4,603-line master. That line-range fragility is what broke the Corp Cash build, where the index's Leatherback line numbers did not apply to another theme.

Assemble in the order below, inside `<tbody>` of `.email-container`. One header, one footer, one disclaimer, every build. Only the content between tags, `href` values, content-image `src` values, `alt`/`title` text and whole repeatable `<tr>` blocks may be edited — everything else is frozen.

## Modules, in template order

Line numbers are the range in each theme master. They are identical across all 15 files, which are line-for-line equivalent.

### Structure

| Module | Master lines | Rows | Notes |
|---|---|---|---|
| `Visually Hidden Preheader Text.html` | 526–528 | 0 | fenced :BEGIN/:END |

### Headers — choose exactly one

| Module | Master lines | Rows | Notes |
|---|---|---|---|
| `Small Header.html` | 549–644 | 10 | fenced |
| `Small Header v2.html` | 646–678 | 5 | UNFENCED start; stray 'Small Header End' at 673 |
| `Header with Image.html` | 680–751 | 8 | fenced |
| `Plain Logo Header.html` | 752–785 | 5 | UNFENCED; documented in module index |

### Greeting

| Module | Master lines | Rows | Notes |
|---|---|---|---|
| `Greeting.html` | 801–817 | 2 | fenced; ships two salutation variants |

### Body copy

| Module | Master lines | Rows | Notes |
|---|---|---|---|
| `Body Content.html` | 834–849 | 2 | fenced |
| `Body Content List.html` | 851–908 | 7 | fenced |
| `Body Inner Content.html` | 910–925 | 2 | fenced |
| `Inner body content.html` | 1412–1439 | 4 | fenced |
| `Body Inner Content (pre-footer).html` | 4266–4296 | 4 | fenced; second module sharing this fence name |

### Featured content panels

| Module | Master lines | Rows | Notes |
|---|---|---|---|
| `Inner Content V1.html` | 927–999 | 9 | fenced |
| `Inner Content V2.html` | 1001–1153 | 19 | fenced |
| `Inner Content V3.html` | 1155–1234 | 10 | fenced |
| `Numbered Section V1.html` | 1298–1355 | 6 | fenced |
| `Numbered Section V2.html` | 1357–1410 | 6 | fenced |
| `Podcast Module.html` | 1235–1297 | 6 | fenced; contains nested Podcasts Section 1236-1296 |
| `Video Play Rollover.html` | 1441–1455 | 2 | fenced; End reads 'Video Play Rollver End' (master typo) |

### Calls to action

| Module | Master lines | Rows | Notes |
|---|---|---|---|
| `Single Primary CTA.html` | 1473–1496 | 3 | fenced |
| `Primary and Secondary CTA.html` | 1497–1531 | 4 | fenced |
| `Dual Secondary CTA.html` | 1532–1566 | 4 | fenced |
| `Single Secondary CTA.html` | 1567–1590 | 3 | fenced |
| `1x Primary CTA 2x Secondary CTA.html` | 1592–1678 | 10 | fenced |

### Events

| Module | Master lines | Rows | Notes |
|---|---|---|---|
| `Event Registration 1x CTA.html` | 1696–1745 | 6 | fenced |
| `Event Registration 2x CTA.html` | 1747–1814 | 8 | fenced |
| `Event Registration v3.html` | 1816–1865 | 7 | fenced; nested Speakers block, End reads 'Event Registration V3 End' |
| `Event Registration v4.html` | 1867–1908 | 4 | fenced |
| `Event Registration v5.html` | 1910–1950 | 4 | fenced; first of two sharing this fence name |
| `Event Registration v5 (full-bleed).html` | 1952–2136 | 21 | fenced; second of two - 560x124 bg image + VML |
| `Itinerary Table.html` | 2138–2206 | 8 | fenced |

### People

| Module | Master lines | Rows | Notes |
|---|---|---|---|
| `PM 1.html` | 2367–2421 | 7 | fenced |
| `2x PM 1x CTA.html` | 2224–2284 | 7 | fenced |
| `2x PM 3x CTA.html` | 2285–2366 | 11 | fenced; End reads 'PM 3 CTA End' (master mismatch) |
| `Dual Author Module.html` | 2422–2526 | 13 | fenced; 3 rows |
| `Dual Author Module V2.html` | 3700–3823 | 15 | fenced; 3 rows |
| `Speakers.html` | 2605–2669 | 8 | fenced Start, NO End in master; bounded by '3x Speakers Start' |
| `3x Speakers.html` | 2671–2750 | 10 | fenced |

### Article and insight lists

| Module | Master lines | Rows | Notes |
|---|---|---|---|
| `Article List.html` | 2862–2965 | 12 | fenced; 3 rows |
| `Article List v2.html` | 2967–3136 | 20 | fenced |
| `Article List V3.html` | 3138–3250 | 12 | fenced |
| `Gallery V1.html` | 4050–4099 | 7 | fenced |
| `Gallery V2.html` | 4101–4190 | 13 | fenced |

### Navigation

| Module | Master lines | Rows | Notes |
|---|---|---|---|
| `Main Tabs.html` | 4192–4220 | 3 | fenced |
| `Tabs Anchors.html` | 4221–4249 | 3 | fenced |

### Footers — choose exactly one, plus the disclaimer

| Module | Master lines | Rows | Notes |
|---|---|---|---|
| `Footer v1.html` | 4297–4421 | 13 | fenced; 3 rows |
| `Footer V2.html` | 4423–4490 | 7 | fenced |
| `Footer V3.html` | 4492–4618 | 12 | fenced; 3 rows |
| `Disclaimer.html` | 4619–4640 | 2 | UNFENCED start, 'Disclaimer : END' at 4635; byte-frozen |

## Jurisdiction — UK fragments, added 9 September 2026

The 48 modules above are **South Africa** content. Every `Disclaimer.html` in the library is byte-identical and carries the Ninety One SA (Pty) Ltd FSP wording. A UK send needs different regulatory blocks, and until now the library had none — measured across all 23 templates, zero contained `capital loss`, `investment professional`, `Telephone calls may be recorded` or `Financial Conduct Authority`.

Two extra fragments now sit in every theme folder, extracted verbatim from a shipped production UK send (`0826 UK – EMD monthly.html`):

| Fragment | Files | Theme-coloured? | Contents |
|---|---|---|---|
| `Risk Warnings - UK.html` | 15 | **Yes** — tint-03 panel, cream text (`#424242` on Springbok Cream) | Capital-loss warning, then an asset-class risk warning |
| `Disclaimer - UK.html` | 15 | No — identical bytes in all 15 | Investment-professional restriction, call-recording notice, `{{Unsubscribe}}` |

**How they are used.** `Disclaimer - UK.html` **replaces** `Disclaimer.html` on a UK build; it is not additional. `Risk Warnings - UK.html` is additional and sits above the disclaimer, at the end of the footer region — that is where the production template puts it.

**The second risk warning is asset-class specific.** The wording as extracted reads "Emerging market: These markets carry a higher risk of financial loss than more developed markets…" because the source was an emerging-market-debt send. For any other asset class that paragraph must be replaced with Compliance's wording for that class. It is not a generic UK block, and treating it as one would ship the wrong warning.

Both fragments are frozen: copied, never edited, never regenerated. Neither has been re-verified by Compliance since extraction — they are a faithful copy of what shipped in August.

## Master anomalies preserved, not corrected

Every fence comment is kept exactly as the master writes it, including its mistakes. Filenames use the opening fence's name; where the closing fence disagrees, the file still contains the master's wording.

| Module | Anomaly |
|---|---|
| `Video Play Rollover` | Closing fence reads `Video Play Rollver End` — a typo in the master |
| `2x PM 3x CTA` | Closing fence reads `PM 3 CTA End` |
| `Event Registration v3` | Contains a nested `Speakers Start` block and an inner `Event Registration End`; closes on `Event Registration V3 End` |
| `Speakers` | Has an opening fence but **no closing fence** anywhere in the master. Bounded here by the next module's opening fence at line 2666 |
| `Small Header v2` | No opening fence. Terminated by a second, stray `Small Header End` at line 673 |
| `Plain Logo Header` | No fences at all. Documented in the module index as the plain header option — logo, stripe, H1, H2, no background image |
| `Disclaimer` | No opening fence; closes on `Disclaimer : END`. Byte-frozen — copied, never edited |
| `Event Registration v5` / `(full-bleed)` | Two different modules share the fence name `Event Registration v5`. Disambiguated by filename; the full-bleed variant is the 560×124 background-image version with the VML conditional |
| `Body Inner Content` / `(pre-footer)` | Two different modules share the fence name `Body Inner Content` |
| `Podcast Module` | Contains a nested `Podcasts Section` fence. Kept inside the parent rather than extracted separately |
| `Visually Hidden Preheader Text` | Uses `: BEGIN` / `: END`, not `Start` / `End` as the module index records |

## Not extracted, and why

| Region | Master lines | Reason |
|---|---|---|
| Theming Options | 89–115 | head block, not a module |
| Ninety One Font | 116–157 | head block, not a module |
| Section band 1 | 533–547 | scaffolding |
| Section band 2 | 786–800 | scaffolding |
| Section band 3 | 818–832 | scaffolding |
| Section band 4 | 1457–1471 | scaffolding |
| Section band 5 | 1680–1694 | scaffolding |
| Section band 6 | 2208–2222 | scaffolding |
| Section band 7 | 4251–4265 | scaffolding |
| main-speaker block | 2527–2604 | unfenced, boundaries not studio-defined |
| Featured articles list | 2751–2861 | unfenced, boundaries not studio-defined |
| large unfenced region A | 3251–3699 | unfenced, boundaries not studio-defined |
| large unfenced region B | 3824–4049 | unfenced, boundaries not studio-defined |

The seven `Section` label bands are the grey scaffolding that divides the catalogue. The module index says to strip them from production builds, so they are not part of this library. The four unfenced regions hold real content — an `Article List` variant, author and speaker arrangements — but the studio drew no boundaries around them, so splitting them would have been my judgement rather than theirs. They remain available in the theme masters.

The twelve head blocks — including the `OfficeDocumentSettings` and `WordDocument` mso conditionals at lines 4–9 and 10–14 — the document skeleton (lines 1–525), the container open (529–532) and the closing tags (4641–4649) are not modules and stay in the masters.

## Verification

| Check | Result |
|---|---|
| Fragments written | 720 — 48 × 15, every theme folder complete |
| Appears verbatim in its parent master | 720 / 720 |
| `<tr>` open/close balance | Balanced in all 720 |
| Blank first or last line | None |
| Structural identity across themes | 720 / 720 — after masking hex codes and asset URLs, every module is character-identical to its Leatherback Green / Warm Yellowwood counterpart |
| Line endings | CRLF, matching the masters |

The structural-identity check is the meaningful one: it proves the re-theming changed only colours and assets, and that all 15 masters remain line-for-line equivalent.

## Themes

- `Agulhas Indigo Cape Coral/`
- `Agulhas Indigo Gazania Gold/`
- `Agulhas Indigo Ocean Teal/`
- `Agulhas Indigo Protea Red/`
- `Agulhas Indigo Warm Yellowwood/`
- `Galjoen Gray Cape Coral/`
- `Galjoen Gray Leatherback Green/`
- `Leatherback Green Cape Coral/`
- `Leatherback Green Warm Yellowwood/`
- `Marula Green Cape Coral/`
- `Marula Green Gazania Gold/`
- `Pinotage Burgundy Cape Coral/`
- `Springbok Cream Ocean Teal/`
- `Springbok Cream Pinotage Burgundy/`
- `Springbok Cream Protea Red/`

Palette and asset provenance for each theme are in `../HTML Templates/THEME-MANIFEST.md`.

## Known gaps inherited from the theme masters

These affect the fragments because they affect the masters. Detail in `THEME-MANIFEST.md`.

- **Weblink arrow — resolved 4 September.** Per-colour `web_link` assets were supplied and applied: 240 instances swapped across 12 themes. Modules affected: `Article List`, `Article List v2`, `Article List V3`, `3x Speakers`, `Inner Content V1`, `Event Registration v5`, `Event Registration v3`, `Main Tabs`, `Tabs Anchors`.
  **One theme still outstanding** — `Galjoen Gray Leatherback Green/` keeps the Warm Yellowwood arrow in all 20 instances; no Leatherback Green weblink URL was supplied.
- **Icon sets missing** for Ocean Teal, Protea Red and Pinotage Burgundy, so five theme folders keep Warm Yellowwood calendar, clock and document icons: Springbok Cream Ocean Teal, Springbok Cream Protea Red, Springbok Cream Pinotage Burgundy, Agulhas Indigo Ocean Teal, Agulhas Indigo Protea Red.
- **Social badges — a second set was supplied but not applied.** It carries X (Twitter) and no Instagram, where the master has Instagram and no X, so it is not a like-for-like swap; and the intended colourway cannot be read from the filenames. Affects `Footer v1` only. See the manifest.
- **`Footer v1` alt-text defect** inherited from the master: YouTube, Spotify and Apple Podcasts icons carry `LinkedIn icon`, `Facebook icon` and `Instagram icon` respectively. Present in all 15 folders.
- **119×119 calendar, 600×250 wide stripe, location icon and the 35-years graphic** have no per-colour equivalent and remain Warm Yellowwood. Affects the `Event Registration` modules and `Inner Content V2`.
