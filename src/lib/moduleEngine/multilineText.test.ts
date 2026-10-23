import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { applyRegions, isAutoEditable, moduleHtml, parseModuleDom, parseRegions, regionElements } from './regions.ts'
import { parse } from './fixtures.ts'

const HEADING = `<tr><td><h3 pardot-region="subheading"><a href="https://x.test/a" style="color:#CF6F13">Global equity: Focus on stock <br class="hide" />selection in a broadening market</a></h3></td></tr>`

const edit = (html: string, value: string, key = 'root.0') => {
  const dom = parseModuleDom(html, parse)
  applyRegions(dom, { [key]: { value } })
  return moduleHtml(dom)
}

test('a heading with a line break shows both lines, one per line', () => {
  const [f] = parseRegions(parseModuleDom(HEADING, parse))
  assert.equal(f.value, 'Global equity: Focus on stock\nselection in a broadening market')
})

test('replacing it with one line leaves nothing of the old second line', () => {
  const out = edit(HEADING, 'Emerging Market Debt Indicator*')
  assert.ok(out.includes('Emerging Market Debt Indicator*'))
  assert.ok(!out.includes('selection in a broadening market') && !out.includes('Global equity'))
  assert.ok(!out.includes('<br'))
  assert.ok(out.includes('href="https://x.test/a"'))
})

test('two lines keep the break, and the break\'s own class, between them', () => {
  const out = edit(HEADING, 'First line\nSecond line')
  assert.ok(/First line\s*<br class="hide">\s*Second line/.test(out), out)
  assert.ok(!out.includes('broadening'))
})

test('a link with an icon beside its words keeps the icon', () => {
  const html = '<tr><td><a pardot-region="button" href="#">Read more&nbsp; <img src="https://x/arrow_12x12.png"></a></td></tr>'
  const out = edit(html, 'Find out more')
  assert.ok(out.includes('Find out more') && out.includes('arrow_12x12.png') && !out.includes('Read more'))
})

test('formatting around the words does not hold the old words in place', () => {
  const html = '<tr><td><p pardot-region="detail">Name <span>Surname</span><br>Role title</p></td></tr>'
  const out = edit(html, 'New Name')
  assert.ok(out.includes('New Name') && !out.includes('Surname') && !out.includes('Role title'))
})

const DIR = join(process.cwd(), 'public', 'module-catalogue')

test('in every theme, replacing a text region replaces all of its words', () => {
  const stale: string[] = []
  for (const file of readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'index.json')) {
    const cat = JSON.parse(readFileSync(join(DIR, file), 'utf8')) as { modules: Record<string, string> }
    for (const [name, html] of Object.entries(cat.modules)) {
      const dom = parseModuleDom(html, parse, { auto: isAutoEditable(name) })
      const fields = parseRegions(dom)
      const els = regionElements(dom)
      const values: Record<string, { value: string }> = {}
      // A region with no words of its own (an icon in a heading) has nothing to replace.
      fields.forEach((f) => { if ((f.kind === 'text' || f.kind === 'button') && f.value !== '') values[f.key] = { value: 'ZZZ' } })
      applyRegions(dom, values)
      fields.forEach((f, i) => {
        if (!values[f.key]) return
        // The words that are edited are the link's when the region has one ("Address, <a>Maps link</a>").
        const target = els[i].tagName === 'A' ? els[i] : (els[i].querySelector('a') ?? els[i])
        const left = (target.textContent ?? '').replace(/[\s ]+/g, ' ').trim()
        if (left !== 'ZZZ') stale.push(`${file} › ${name} › ${f.key}: “${left.slice(0, 50)}”`)
      })
    }
  }
  assert.deepEqual(stale, [])
})
