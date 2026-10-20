import { useMemo } from 'react'
import { createMockDeps, createSettingsLexiconProvider, DEFAULT_SPAM_TERMS, type AnalyzerDeps } from '../features/subject-line-tester'
import { useSettings } from '../contexts/SettingsContext'

/** The Subject Line Tester's adapters, with the spam list taken from Settings (or the starting list if never edited). */
export function useSubjectLineDeps(): AnalyzerDeps {
  const { settings } = useSettings()
  const spamWords = settings.spamWordList
  return useMemo(
    () => ({ ...createMockDeps(), lexicon: createSettingsLexiconProvider(spamWords ?? DEFAULT_SPAM_TERMS) }),
    [spamWords],
  )
}
