interface FunctionsErrorLike {
  message?: string
  context?: unknown
}

function asResponse(context: unknown): Response | null {
  return typeof Response !== 'undefined' && context instanceof Response ? context : null
}

/**
 * supabase.functions.invoke() reports any non-2xx as a generic "non-2xx status
 * code" error and keeps the function's own message in `error.context`. This
 * returns that message so the user sees the real reason.
 */
export async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const e = error as FunctionsErrorLike | null | undefined
  const response = asResponse(e?.context)
  if (response) {
    try {
      const body = (await response.clone().json()) as { error?: unknown }
      if (typeof body?.error === 'string' && body.error) return body.error
    } catch {
      // not JSON: use the generic message below
    }
  }
  return e?.message || fallback
}

export function isFunctionMissing(error: unknown): boolean {
  return asResponse((error as FunctionsErrorLike | null | undefined)?.context)?.status === 404
}
