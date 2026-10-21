import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PAGE_X } from './pageGrid.ts'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

test('the page gutter is one definition', () => {
  assert.equal(PAGE_X, 'max-w-7xl mx-auto px-4 sm:px-6')
})

test('the nav bar, hero, step tabs, content and footer all use the same gutter, so their left edges line up', () => {
  const shell = read('src/components/layout/FormShell.tsx')
  assert.ok((shell.match(/\$\{PAGE_X\}|\{PAGE_X\}|PAGE_X\b/g) ?? []).length >= 6, 'PAGE_X should be used by every full-width row')
  // none of the old, different gutters is left on those rows
  assert.ok(!/max-w-7xl mx-auto px-6 h-14/.test(shell), 'nav bar')
  assert.ok(!/max-w-7xl mx-auto flex items-end/.test(shell), 'hero')
  assert.ok(!/<div className="max-w-7xl mx-auto px-6">/.test(shell), 'step tabs')
})

test('the first step tab starts at the gutter, not 16px inside it', () => {
  const tabs = read('src/components/ui/StepIndicator.tsx')
  assert.match(tabs, /index === 0 \? 'pl-0' : 'pl-4'/)
})
