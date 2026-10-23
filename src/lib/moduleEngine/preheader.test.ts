import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { renderBuild, withPreviewText } from './render.ts'
import { seedBuild } from './seed.ts'
import { generateEmailHtml } from '../emailGenerator.ts'
import { parse } from './fixtures.ts'

const DIR = join(process.cwd(), 'public', 'module-catalogue')
const themes = readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'index.json')
const load = (file: string) => JSON.parse(readFileSync(join(DIR, file), 'utf8')) as { themeId: string; shell: { head: string; tail: string }; order: string[]; modules: Record<string, string> }

const render = (file: string, previewText?: string) => {
  const cat = load(file)
  return renderBuild(seedBuild(cat.themeId), cat, { parse, previewText }).html
}

test('the preview text replaces the placeholder in the email\'s hidden preview line, in every theme', () => {
  for (const file of themes) {
    const out = render(file, 'Our latest thinking on emerging markets')
    assert.ok(out.includes('Our latest thinking on emerging markets'), file)
    assert.ok(!out.includes('Update the Preview Line'), file)
  }
})

test('it sits at the very top of the email, in the hidden line, with the padding that follows kept', () => {
  const out = render('agulhas-gold.json', 'Short preview')
  const at = out.indexOf('Short preview')
  assert.ok(at > 0 && at < out.indexOf('Kind regards'), 'before the body text')
  assert.ok(/display:\s*none/.test(out.slice(Math.max(0, at - 500), at)))
  assert.ok((out.slice(at, at + 4000).match(/&nbsp;|&#160;| /g) ?? []).length > 50)
})

test('the words are shown as typed and cannot add markup', () => {
  const out = render('agulhas-gold.json', 'Fees < 1% & "more" <script>x</script>')
  assert.ok(out.includes('Fees &lt; 1% &amp; "more" &lt;script&gt;x&lt;/script&gt;'))
  assert.ok(!/<script>x/.test(out))
})

test('with no preview text given the library\'s page shell is left as designed', () => {
  assert.ok(render('agulhas-gold.json').includes('Update the Preview Line'))
})

test('an empty preview text takes the placeholder out rather than leaving instructions in the email', () => {
  assert.ok(!render('agulhas-gold.json', '').includes('Update the Preview Line'))
})

test('dollar signs in the preview text come through as typed', () => {
  assert.equal(withPreviewText('<div>Update the Preview Line on line 12 </div>', 'Save $& more $1'), '<div>Save $&amp; more $1 </div>')
})

test('the finished email takes the brief\'s preview text', () => {
  const cat = load('agulhas-gold.json')
  const brief = { campaign: { theme: cat.themeId, campaignName: 'x', previewText: '  Insights for advisors  ' }, content: { build: seedBuild(cat.themeId) } }
  const html = generateEmailHtml(brief as never, undefined, { catalogue: cat, parse })
  assert.ok(html.includes('Insights for advisors') && !html.includes('Update the Preview Line'))
})
