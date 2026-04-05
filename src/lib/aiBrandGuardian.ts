import type { BriefPayload } from '../types/brief.types'
import type { AIGuardianConfig, BrandGuardianConfig } from '../types/settings.types'
import type { BrandFeedbackItem } from './brandGuardian'

// ─── Types ──────────────────────────────────────────────────

export interface AIBrandReview {
  status: 'approved' | 'needs-review' | 'rejected'
  score: number
  items: BrandFeedbackItem[]
  summary: string
  model: string
  durationMs: number
}

export interface AIBrandGuardianError {
  code: 'not-configured' | 'network' | 'edge-function' | 'parse' | 'unknown'
  message: string
}

export type AIBrandGuardianResult =
  | { ok: true; review: AIBrandReview }
  | { ok: false; error: AIBrandGuardianError }

// ─── System prompt ──────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `You are the Ninety One Brand Guardian AI — an expert brand compliance reviewer for Ninety One, a global investment manager.

You review email briefing payloads and return structured feedback. Your review covers:
1. **Visual Identity** — theme consistency, colour usage, logo appropriateness, imagery
2. **Brand Voice** — tone, language, naming conventions, subject line quality, CTA clarity
3. **Content Structure** — section count, headline/body length, module alignment, readability
4. **Audience Alignment** — region/channel/client-group targeting consistency
5. **Compliance** — unsubscribe links, legal disclaimers, regulatory requirements (CAN-SPAM, GDPR, POPIA)
6. **Accessibility** — alt text quality, WCAG contrast, semantic structure
7. **Brand Protection** — domain usage, brand name spelling, URL security, deadline timing

Ninety One brand principles:
- Brand name is always "Ninety One" (two words, both capitalised)
- Tone: composed, authoritative, knowledgeable — never aggressive or salesy
- 15 approved brand themes using South African nature-inspired colour pairs
- Subject lines should be under 50 characters for mobile optimisation
- CTAs should use action-oriented verbs (Learn, Read, Register, Discover, etc.)
- All images must use HTTPS URLs
- External sends require an unsubscribe link

You MUST respond with valid JSON matching this exact structure:
{
  "status": "approved" | "needs-review" | "rejected",
  "score": <number 0-100>,
  "items": [
    {
      "field": "<dotted field path e.g. campaign.subjectLine>",
      "category": "<one of: Visual Identity, Brand Voice, Content Structure, Audience Alignment, Compliance, Accessibility, Brand Protection>",
      "severity": "pass" | "warning" | "error",
      "message": "<specific, actionable feedback>"
    }
  ],
  "summary": "<1-2 sentence overall assessment>"
}

Scoring: Each item contributes to the score. Passes count as 1, warnings as 0.5, errors as 0. Score = round((sum / total) * 100).

Be thorough but practical. Provide specific, actionable feedback referencing actual values from the brief. Do not invent issues that don't exist in the data.`

// ─── Client ─────────────────────────────────────────────────

export function isAIGuardianConfigured(config: AIGuardianConfig): boolean {
  return config.mode !== 'off' && !!config.supabaseUrl && !!config.supabaseAnonKey
}

export async function runAIBrandGuardianReview(
  brief: BriefPayload,
  guardianConfig: BrandGuardianConfig,
): Promise<AIBrandGuardianResult> {
  const ai = guardianConfig.aiGuardian

  if (!isAIGuardianConfigured(ai)) {
    return {
      ok: false,
      error: {
        code: 'not-configured',
        message: 'AI Brand Guardian is not configured. Set the Supabase URL and anon key in Settings → Brand Guardian.',
      },
    }
  }

  const systemPrompt = ai.customSystemPrompt
    ? `${BASE_SYSTEM_PROMPT}\n\nAdditional brand-specific instructions:\n${ai.customSystemPrompt}`
    : BASE_SYSTEM_PROMPT

  const start = Date.now()

  try {
    const url = `${ai.supabaseUrl.replace(/\/$/, '')}/functions/v1/brand-guardian-ai`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ai.supabaseAnonKey}`,
      },
      body: JSON.stringify({
        brief,
        model: ai.model,
        systemPrompt,
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error')
      return {
        ok: false,
        error: {
          code: 'edge-function',
          message: `Edge function returned ${res.status}: ${text}`,
        },
      }
    }

    const data = await res.json()
    const durationMs = Date.now() - start

    // Validate response structure
    if (!data.status || typeof data.score !== 'number' || !Array.isArray(data.items)) {
      return {
        ok: false,
        error: {
          code: 'parse',
          message: 'AI response did not match expected format. Check edge function logs.',
        },
      }
    }

    return {
      ok: true,
      review: {
        status: data.status,
        score: data.score,
        items: data.items,
        summary: data.summary ?? '',
        model: ai.model,
        durationMs,
      },
    }
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'network',
        message: err instanceof Error ? err.message : 'Network request failed',
      },
    }
  }
}
