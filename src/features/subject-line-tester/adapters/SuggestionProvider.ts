import type { SuggestionRequest } from '../engine/suggestions'

/** Source of rewrite suggestions (a mock now; the Claude API later). Candidates are re-scored by the engine before display. */
export interface SuggestionProvider {
  suggest(request: SuggestionRequest): Promise<string[]>
}
