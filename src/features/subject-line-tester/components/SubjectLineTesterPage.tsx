import type { AnalyzerDeps } from '../engine/context'
import { SubjectLineTester } from './SubjectLineTester'

/** The standalone tool page. */
export function SubjectLineTesterPage({ deps }: { deps?: AnalyzerDeps }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="font-ni-display text-2xl text-brand-primary dark:text-gray-100">Subject Line Tester</h1>
      <p className="mb-6 mt-1 text-sm text-gray-500 dark:text-gray-400">
        Score a subject line for length, wording and scannability. Everything runs in your browser; nothing is sent anywhere.
      </p>
      <SubjectLineTester showTestNow deps={deps} />
    </main>
  )
}
