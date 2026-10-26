import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PAGE_X, WORKSPACE_X } from './pageGrid.ts'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

test('the page gutter is one definition', () => {
  assert.equal(PAGE_X, 'max-w-7xl mx-auto px-4 sm:px-6')
})

test('the wide gutter differs from the page gutter only in its width', () => {
  assert.equal(WORKSPACE_X, PAGE_X.replace('max-w-7xl', 'max-w-[1800px]'))
})

test('the nav bar, hero, step tabs, content and footer all use the same gutter, so their left edges line up', () => {
  const shell = read('src/components/layout/FormShell.tsx')
  // one gutter, chosen once for the tab, shared by every full-width row
  assert.match(shell, /const pageX = .*WORKSPACE_X : PAGE_X/)
  assert.ok((shell.match(/\$\{pageX\}|\{pageX\}/g) ?? []).length >= 5, 'pageX should be used by every full-width row')
  assert.ok(!/\$\{PAGE_X\}|className=\{PAGE_X\}/.test(shell), 'no row may bypass the shared gutter')
  // none of the old, different gutters is left on those rows
  assert.ok(!/max-w-7xl mx-auto px-6 h-14/.test(shell), 'nav bar')
  assert.ok(!/max-w-7xl mx-auto flex items-end/.test(shell), 'hero')
  assert.ok(!/<div className="max-w-7xl mx-auto px-6">/.test(shell), 'step tabs')
})

test('the first step tab starts at the gutter, not 16px inside it', () => {
  const tabs = read('src/components/ui/StepIndicator.tsx')
  assert.match(tabs, /index === 0 \? 'pl-0' : 'pl-4'/)
})
