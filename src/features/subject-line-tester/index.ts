// Public surface of the Subject Line Tester. Nothing else in the app imports from this feature's internals.
export { analyzeSubjectLine, bandFor } from './engine/analyze'
export { DEFAULT_CONFIG, resolveConfig, TesterConfigSchema } from './engine/config'
export type { TesterConfig, PartialTesterConfig } from './engine/config'
export type { AnalyzerDeps } from './engine/context'
export { AnalysisResultSchema } from './engine/types'
export type { AnalysisInput, AnalysisResult, Band, CategoryResult, CheckResult, Match } from './engine/types'
export type { LexiconProvider, MergeTagSyntax, SampleContactProvider } from './adapters'
export { createMockLexiconProvider, createMockMergeTagSyntax, createMockSampleContactProvider } from './adapters/mock'

import { createMockLexiconProvider, createMockMergeTagSyntax, createMockSampleContactProvider } from './adapters/mock'
import type { AnalyzerDeps } from './engine/context'

/** The adapters backed by mock data. Swap any of them for a real implementation of the same interface. */
export function createMockDeps(): AnalyzerDeps {
  return {
    lexicon: createMockLexiconProvider(),
    mergeTags: createMockMergeTagSyntax(),
    sampleContact: createMockSampleContactProvider(),
  }
}
