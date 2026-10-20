interface FunctionsErrorLike {
  message?: string
  context?: unknown
}

function asResponse(context: unknown): Response | null {
  return typeof Response !== 'undefined' && context instanceof Response ? context : null
}

/**
 * supabase.functions.invoke() reports any non-2xx as a generic "non-2xx status
 * code" error and keeps the function's own body in `error.context`. This returns
 * that body's message (and `code`, when the function sends one) so the user sees
 * the real reason and the app can react to it.
 */
export async function functionErrorDetails(error: unknown, fallback: string): Promise<{ message: string; code?: string }> {
  const e = error as FunctionsErrorLike | null | undefined
  const response = asResponse(e?.context)
  if (response) {
    try {
      const body = (await response.clone().json()) as { error?: unknown; code?: unknown }
      const code = typeof body?.code === 'string' ? body.code : undefined
      if (typeof body?.error === 'string' && body.error) return { message: body.error, code }
    } catch {
      // not JSON: use the generic message below
    }
  }
  return { message: e?.message || fallback, code: undefined }
}

export async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  return (await functionErrorDetails(error, fallback)).message
}

export function isFunctionMissing(error: unknown): boolean {
  return asResponse((error as FunctionsErrorLike | null | undefined)?.context)?.status === 404
}
