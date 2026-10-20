# Power Automate Test Send Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send Test Email posts the rendered email through a Microsoft Power Automate flow instead of an n8n webhook, and the n8n integration is removed.

**Architecture:** A fourth flow endpoint, `testEmailFlow`, joins the three already in `PowerAutomateConfig`, configured in Settings → Power Automate beside them and sharing their shared-secret header, timeout and retry behaviour. `powerAutomateService.ts` gains `triggerTestEmail()`, following the shape of the existing triggers. `StepHtmlReview` calls it, keeping the existing mail-client fallback for when no flow is configured. The browser posts directly to the flow URL — confirmed working after the trigger's "Who can trigger the flow?" was set to Anyone, which restores the `sig` SAS token to the URL.

**Tech Stack:** React 18, TypeScript strict, Vite 5, Tailwind v3. Tests: `tsx` + `node:test` (added by Task 1 — the repository currently has none).

**Spec:** `docs/superpowers/specs/2026-10-20-email-builder-and-campaign-templates-design.md` §7.0.2

**Scope note:** This is plan A of four. B is the three-tab restructure, C the builder rebuild, D campaign templates. Each ships on its own; this one depends on none of them.

## Global Constraints

- React 18, TypeScript strict, Vite 5, Tailwind v3, no component library; Tailwind utilities and existing `brand-*` tokens only.
- No `any` in production code. `npm run typecheck` must stay clean.
- British spelling in user-facing copy.
- No secret is logged, placed in a response body, or written to a file.
- Data access is Supabase. Do not depend on `feat/azure-db-schema`.
- Settings persist as a single JSONB blob; a removed field may still be present in stored blobs.

## Review Focus

1. **A configured-but-disabled flow must fall back to the mail client**, not fail — `enabled: false` is how a user turns the integration off without deleting the URL.
2. **A non-2xx from the flow must show the user why** — the existing n8n path surfaces `Webhook returned 502`; the replacement must not regress to a generic failure.
3. **Stored settings blobs still containing `n8nWebhookUrl` must load without error** after the field is removed from the type.
4. **The shared secret must never reach the request body or an error message** — it belongs in the header only.
5. **An invalid email address must be rejected before any network call**, so a typo cannot fire the flow.

---

## Task 1: Test runner and the `testEmailFlow` config

The repository has no test infrastructure: no test script, no runner, no `*.test.*` files. Everything below needs one.

**Files:**
- Modify: `package.json` (add `tsx` devDependency and a `test` script)
- Modify: `src/types/settings.types.ts` (`PowerAutomateConfig`)
- Modify: `src/lib/settingsDefaults.ts` (`DEFAULT_POWER_AUTOMATE_CONFIG`)
- Test: `src/lib/settingsDefaults.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `PowerAutomateConfig.testEmailFlow: PowerAutomateFlowEndpoint` — the existing `{ webhookUrl: string; enabled: boolean }` shape; `DEFAULT_POWER_AUTOMATE_CONFIG.testEmailFlow` defaulting to `{ webhookUrl: '', enabled: false }`.

- [ ] **Step 1: Add the runner**

`npm install -D tsx`, and add to `package.json` scripts:

```json
"test": "tsx --test 'src/**/*.test.ts'"
```

- [ ] **Step 2: Write the failing test**

`src/lib/settingsDefaults.test.ts`, asserting against `DEFAULT_POWER_AUTOMATE_CONFIG`:

```typescript
test('a fresh config carries a disabled test-email flow', () => {
  assert.deepEqual(DEFAULT_POWER_AUTOMATE_CONFIG.testEmailFlow,
    { webhookUrl: '', enabled: false })
})

test('the three existing flows are untouched', () => {
  for (const k of ['briefSubmissionFlow', 'listAnalysisFlow', 'campaignInsightsFlow'] as const) {
    assert.deepEqual(DEFAULT_POWER_AUTOMATE_CONFIG[k], { webhookUrl: '', enabled: false })
  }
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — `testEmailFlow` is `undefined`.

- [ ] **Step 4: Add `testEmailFlow`**

Add the field to `PowerAutomateConfig` beside `campaignInsightsFlow`, typed `PowerAutomateFlowEndpoint`, with the doc comment `/** Triggered to send a test email to a single recipient */`. Add the matching default.

- [ ] **Step 5: Run the tests and the typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS, 2 tests; typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/types/settings.types.ts src/lib/settingsDefaults.ts src/lib/settingsDefaults.test.ts
git commit -m "feat(settings): add a test-email flow endpoint and a test runner"
```

---

## Task 2: `triggerTestEmail()`

**Files:**
- Modify: `src/lib/powerAutomateService.ts`
- Test: `src/lib/powerAutomateService.test.ts`

**Interfaces:**
- Consumes: `PowerAutomateConfig.testEmailFlow` (Task 1); the existing module-private `postWithRetry(config, webhookUrl, payload)` and `buildHeaders(config)`.
- Produces:
  ```typescript
  export async function triggerTestEmail(
    config: PowerAutomateConfig,
    args: { recipient: string; subject: string; html: string; emailName: string },
  ): Promise<PATriggerResult>
  ```

- [ ] **Step 1: Write the failing tests**

`src/lib/powerAutomateService.test.ts`. Stub `globalThis.fetch`, capturing url and init. Cover, with these names and assertions:

```typescript
test('posts the recipient, subject and html to the test-email flow url', …)
  // captured url === the configured testEmailFlow.webhookUrl, and
  // JSON.parse(init.body) contains { isTest: true, recipient, subject, html, emailName }
  // plus a triggeredAt ISO string and source 'Ninety One Email Briefing'

test('is refused when the master toggle is off', …)
  // config.enabled = false → { ok: false, error: /disabled/ }, fetch never called

test('is refused when the flow itself is disabled', …)
  // testEmailFlow.enabled = false → { ok: false }, fetch never called

test('is refused when the flow has no url', …)
  // testEmailFlow.webhookUrl = '' → { ok: false }, fetch never called

test('surfaces the status and body when the flow rejects the request', …)
  // 502 with body 'gateway' → { ok: false, error: /502/ }

test('sends the shared secret as a header and never in the body', …)
  // secretHeaderName 'x-api-key', secretHeaderValue 'topsecret' →
  // init.headers['x-api-key'] === 'topsecret' AND !String(init.body).includes('topsecret')
```

The fifth pins Review Focus 2; the sixth pins Review Focus 4.

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test`
Expected: FAIL — `triggerTestEmail` is not exported.

- [ ] **Step 3: Implement `triggerTestEmail`**

Follow `triggerListAnalysis` exactly: the same three guard clauses in the same order (master `config.enabled`, then `testEmailFlow.enabled`, then `webhookUrl`), each returning `{ ok: false, error }`, then `postWithRetry`. The payload is the `triggeredAt` / `source` envelope the other triggers use, plus `isTest: true` and the four `args` fields.

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/powerAutomateService.ts src/lib/powerAutomateService.test.ts
git commit -m "feat(power-automate): add the test-email trigger"
```

---

## Task 3: The Settings → Power Automate entry

**Files:**
- Modify: `src/components/settings/TabPowerAutomate.tsx`

**Interfaces:**
- Consumes: `config.testEmailFlow` (Task 1); the existing `testFlowWebhook(config, url)`.
- Produces: no new exports.

- [ ] **Step 1: Add the fourth endpoint card**

In the FLOW ENDPOINTS section, add a card for `testEmailFlow` following the three existing ones exactly — same enable toggle, URL field and "Send test" button wired to `testFlowWebhook`. Title **Test Email**; description: *"Sends a rendered test email to a single recipient from the Review and Submission step."*

- [ ] **Step 2: Verify in the running app**

Run: `npm run typecheck`, then open Settings → Power Automate.
Expected: typecheck clean; four endpoint cards; the active-count badge reads `1 active` when only one is enabled.

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/TabPowerAutomate.tsx
git commit -m "feat(settings): expose the test-email flow endpoint"
```

---

## Task 4: Send Test Email goes through Power Automate

**Files:**
- Modify: `src/components/steps/StepHtmlReview.tsx:140-200` (`handleSendTestEmail`) and `:447-490` (the panel's copy)

**Interfaces:**
- Consumes: `triggerTestEmail` (Task 2).
- Produces: no new exports.

- [ ] **Step 1: Replace the n8n branch**

`handleSendTestEmail` keeps its email-format guard first (Review Focus 5 — no network call on an invalid address), then calls `triggerTestEmail(settings.powerAutomate, { recipient, subject, html, emailName })`.

Branch on the result: `ok` → `setTestStatus('sent')` as now; `!ok` → **fall back to the existing mail-client path**, not an error, when the flow is unconfigured or disabled; show `result.error` when the flow was reached and refused. Distinguish those two cases by checking the flow's configuration before the call, not by parsing the error string.

Update the panel's two description strings and the success line to name Power Automate rather than n8n.

- [ ] **Step 2: Verify in the running app**

Run: `npm run typecheck`, then in the app with the flow **disabled**, enter an address and press Send Test.
Expected: typecheck clean; the mail client opens (Review Focus 1). With a valid flow URL enabled, a run appears in the flow's history.

- [ ] **Step 3: Commit**

```bash
git add src/components/steps/StepHtmlReview.tsx
git commit -m "feat(brief): send the test email through Power Automate"
```

---

## Task 5: Remove the n8n integration

**Files:**
- Modify: `src/types/settings.types.ts:428` (remove `n8nWebhookUrl`)
- Modify: `src/lib/settingsDefaults.ts` (remove its default)
- Modify: `src/components/settings/TabGeneral.tsx` (remove the control)
- Modify: `src/components/steps/StepAudience.tsx:46` (help text)
- Modify: `src/lib/pardotService.ts:17`, `src/lib/generateBriefHtml.ts:23` (comments only)
- Test: `src/lib/settingsDefaults.test.ts` (add one case)

**Interfaces:**
- Consumes: nothing.
- Produces: `AppSettings` no longer carries `n8nWebhookUrl`.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/settingsDefaults.test.ts` — this pins Review Focus 3:

```typescript
test('a stored blob still carrying n8nWebhookUrl loads without error', () => {
  const stored = { ...createDefaultSettings(), n8nWebhookUrl: 'https://old.n8n.example/hook' }
  const merged = { ...createDefaultSettings(), ...stored }
  assert.equal(merged.powerAutomate.testEmailFlow.enabled, false)
  assert.ok(!('n8nWebhookUrl' in createDefaultSettings()))
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — `n8nWebhookUrl` is still in the defaults.

- [ ] **Step 3: Remove it**

Delete the field, its default, and its Settings → General control. Rewrite the `StepAudience.tsx:46` help text to describe the Pardot list id without naming n8n. In `pardotService.ts` and `generateBriefHtml.ts`, update the comments — the proxy comment should name a Power Automate flow or a server-side route, not n8n.

An unknown key in a stored blob is ignored by the spread that merges it, so no settings migration is required; the test above is what proves that.

- [ ] **Step 4: Run the tests and the typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS; typecheck clean — the typecheck is what catches any remaining reader of the removed field.

- [ ] **Step 5: Confirm nothing references n8n**

Run: `grep -rin "n8n" src/ --include="*.ts" --include="*.tsx"`
Expected: no matches, except in files suffixed ` 2` (iCloud sync artifacts, deleted in plan C).

- [ ] **Step 6: Commit**

```bash
git add src/types/settings.types.ts src/lib/settingsDefaults.ts src/components/settings/TabGeneral.tsx src/components/steps/StepAudience.tsx src/lib/pardotService.ts src/lib/generateBriefHtml.ts src/lib/settingsDefaults.test.ts
git commit -m "refactor(settings): remove the n8n integration"
```

---

## Self-review notes

- **Spec coverage:** §7.0.2 is covered in full — the fourth endpoint (Task 1), its payload (Task 2), the settings entry (Task 3), the caller and retained mail-client fallback (Task 4), and the n8n removal including the two comment files (Task 5).
- **Review Focus:** 1 → Task 4 Step 2; 2 → Task 2's 502 test; 3 → Task 5's stored-blob test; 4 → Task 2's secret-header test; 5 → Task 4 Step 1's guard ordering.
- **Deliberately not done:** the other three flows still have no callers. Wiring them is separate work, named as a non-goal in the spec.
- **Unverified at plan time:** the flow's own behaviour — that it sends mail — is outside this repository. Task 4's check confirms the flow was *invoked*, not that an email arrived.
- **Proportion:** five tasks against roughly 150 lines of production change, with test assertions rather than bodies.
