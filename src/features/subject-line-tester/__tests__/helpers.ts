import { createMockLexiconProvider, createMockMergeTagSyntax, createMockSampleContactProvider } from '../adapters/mock'
import { resolveConfig, type PartialTesterConfig } from '../engine/config'
import { buildContext } from '../engine/context'
import { RULES } from '../engine/rules'

export const deps = {
  lexicon: createMockLexiconProvider(),
  mergeTags: createMockMergeTagSyntax(),
  sampleContact: createMockSampleContactProvider(),
}

/** Runs one rule against a subject with the default (or overridden) config. */
export function runRule(id: string, subject: string, config: PartialTesterConfig = {}) {
  const rule = RULES.find((r) => r.id === id)
  if (!rule) throw new Error(`No rule ${id}`)
  const resolved = resolveConfig(config)
  return { ...rule.run(buildContext({ subject }, deps, resolved)), critical: resolved.criticalChecks.includes(id) }
}
