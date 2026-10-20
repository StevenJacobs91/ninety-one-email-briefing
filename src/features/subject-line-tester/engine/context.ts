import type { LexiconProvider } from '../adapters/LexiconProvider'
import type { MergeTagSyntax } from '../adapters/MergeTagSyntax'
import type { SampleContactProvider } from '../adapters/SampleContactProvider'
import type { TesterConfig } from './config'
import { renderMergeTags, type ParsedTag } from './mergeTags'
import { capsWordMatches, charCount, emojiClusters, findTerms, punctuationMatches, words, type Token } from './text'
import type { AnalysisInput, Match } from './types'

export interface AnalyzerDeps {
  lexicon: LexiconProvider
  mergeTags: MergeTagSyntax
  sampleContact: SampleContactProvider
}

/** Everything the rules need, measured once per analysis. */
export interface RuleContext {
  raw: string
  /** Merge tags replaced with sample values; Length, Wording and most Scannability checks run on this */
  rendered: string
  chars: number
  words: Token[]
  tags: ParsedTag[]
  broken: string[]
  emoji: Token[]
  spamMatches: Match[]
  capsMatches: Match[]
  punctuation: Match[]
  exclamations: number
  deps: AnalyzerDeps
  config: TesterConfig
}

export function buildContext(input: AnalysisInput, deps: AnalyzerDeps, config: TesterConfig): RuleContext {
  const raw = input.subject
  const { rendered, tags, broken } = renderMergeTags(raw, deps.mergeTags, deps.sampleContact)
  const packs = new Set(config.lexiconPacks)
  const terms = deps.lexicon.getSpamTerms().filter((t) => packs.has(t.pack))
  const { matches: punctuation, exclamations } = punctuationMatches(rendered, config.thresholds.exclamationsMax)
  return {
    raw,
    rendered,
    chars: charCount(rendered),
    words: words(rendered),
    tags,
    broken,
    emoji: emojiClusters(rendered),
    spamMatches: findTerms(rendered, terms),
    capsMatches: capsWordMatches(rendered, deps.lexicon.getAcronymAllowlist(), config.thresholds.capsMinLetters),
    punctuation,
    exclamations,
    deps,
    config,
  }
}
