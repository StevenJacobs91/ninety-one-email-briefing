import { lazy, Suspense, type ComponentProps } from 'react'

// The editor is a few hundred kilobytes, and only Settings uses it, so it is fetched when a code box first opens.
const CodeEditor = lazy(() => import('./CodeEditor'))

export function LazyCodeEditor(props: ComponentProps<typeof CodeEditor>) {
  return (
    <Suspense fallback={<div role="status" className="h-72 flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 text-xs text-gray-400">Loading editor…</div>}>
      <CodeEditor {...props} />
    </Suspense>
  )
}
