// Supabase Edge Function: brand-guardian-ai
// Accepts an email brief payload and runs it through Claude for AI brand review.
//
// Required secrets (set via Supabase dashboard or CLI):
//   ANTHROPIC_API_KEY — your Anthropic API key
//
// Request body:
//   { brief: BriefPayload, model: string, systemPrompt: string }
//
// Response:
//   { status, score, items, summary } — structured brand review

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured. Set it in Supabase project secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { brief, model, systemPrompt } = await req.json()

    if (!brief || !systemPrompt) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: brief, systemPrompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const claudeModel = model || 'claude-sonnet-4-20250514'

    // Call Anthropic Messages API
    const anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: claudeModel,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Review this email brief and return your analysis as JSON:\n\n${JSON.stringify(brief, null, 2)}`,
          },
        ],
      }),
    })

    if (!anthropicRes.ok) {
      const errorText = await anthropicRes.text()
      return new Response(
        JSON.stringify({ error: `Anthropic API error (${anthropicRes.status}): ${errorText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const anthropicData = await anthropicRes.json()

    // Extract text content from Claude's response
    const textBlock = anthropicData.content?.find((b: { type: string }) => b.type === 'text')
    const rawText = textBlock?.text ?? ''

    // Parse JSON from Claude's response (handle markdown code fences)
    let review
    try {
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawText]
      review = JSON.parse(jsonMatch[1]!.trim())
    } catch {
      return new Response(
        JSON.stringify({
          error: 'Failed to parse AI response as JSON',
          raw: rawText.slice(0, 1000),
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Validate minimum structure
    if (!review.status || typeof review.score !== 'number' || !Array.isArray(review.items)) {
      return new Response(
        JSON.stringify({
          error: 'AI response missing required fields (status, score, items)',
          raw: rawText.slice(0, 1000),
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify(review),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
