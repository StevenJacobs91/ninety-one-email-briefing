import type { AnalyzerDeps } from '../../engine/context'
import { createMockLexiconProvider } from './mockLexiconProvider'
import { createMockMergeTagSyntax } from './mockMergeTagSyntax'
import { createMockSampleContactProvider } from './mockSampleContactProvider'

/** The adapters backed by mock data. Swap any of them for a real implementation of the same interface. */
export function createMockDeps(): AnalyzerDeps {
  return {
    lexicon: createMockLexiconProvider(),
    mergeTags: createMockMergeTagSyntax(),
    sampleContact: createMockSampleContactProvider(),
  }
}
