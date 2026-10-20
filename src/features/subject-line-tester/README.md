# Subject Line Tester

Scores a subject line 0 to 100% across Length, Wording and Scannability, and previews it in a
desktop and a mobile inbox. Runs entirely in the browser; nothing is sent anywhere (phases 1 to 4).

- Standalone page: `/?tool=subject-line-tester`
- Embedded: a score pill under Subject Line on the Campaign tab (`SubjectLineScore`), opening the full tester pre-filled.
- Public surface: `index.ts` only. Nothing else in the app imports from the feature's internals.
- Tests: `npm run test:features` (Vitest, `*.spec.ts(x)`); `npm run test:coverage` for the engine's coverage. The older suites still use `npm test`.

## Swapping data sources

The engine reads three adapter interfaces (`adapters/`), backed by mock data in `data/*.json`:

| Interface | Mock | Replace with |
|---|---|---|
| `LexiconProvider` | `mockLexiconProvider` | the real spam and financial-promotions lists |
| `MergeTagSyntax` | `mockMergeTagSyntax` (Pardot HML) | the production syntax and field list |
| `SampleContactProvider` | `mockSampleContactProvider` | synthetic values only; never real contacts |
| `SuggestionProvider` (phase 5, off) | `mockSuggestionProvider` | a Claude API provider |

Pass your implementations as the `deps` prop, or to `analyzeSubjectLine`. No change to `engine/` or `components/` is needed.

## Decisions taken where the spec left room

- **Open question 1 (merge-tag syntax):** Pardot HML only for now; the adapter is where others would go.
- **Open question 3 (blocking):** the pill is advisory and never blocks submitting.
- **Match ranges** are UTF-16 offsets into `AnalysisResult.rendered`, so `rendered.slice(start, end) === text`.
- **`cappedByCritical`** is true whenever a critical check fails, even if the score was already under the cap.
- **Empty input** returns `empty: true`, score 0, so the UI shows its empty state.
- **WRD-01** fails on any lexicon match, whatever its severity; severity is carried on each match for the UI.
- **An unresolved merge tag** is reported once, by SCN-03, and is not also judged as a long word by SCN-04.
- **Preview widths** turn a character count into an `em` width (`charWidthEm`, default 0.56), so the cut-off is approximate by design. The text alternative states the exact character cut.
- **The preview reference image** was not attached to the request; the layout follows the written description and token table.
- **Phase 5** is off: `FEATURE_FLAGS.suggestions` is false. A provider receives the subject with merge tags as tags plus the id and fixed label of each failed check, and its suggestions are re-scored by the engine before display.
