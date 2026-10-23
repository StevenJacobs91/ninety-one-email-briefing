import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parseHTML } from 'linkedom'
import { isAutoEditable, parseModuleDom, regionElements } from './regions.ts'

const parse = (h: string) => parseHTML(h).document as unknown as Document
const DIR = join(process.cwd(), 'public', 'module-catalogue')

// Every module in every theme: all the words an editor can see are in an editable field.
test('all visible text in every editable module, in every theme, can be edited', () => {
  const missed: string[] = []
  for (const file of readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'index.json')) {
    const cat = JSON.parse(readFileSync(join(DIR, file), 'utf8')) as { modules: Record<string, string> }
    for (const [name, html] of Object.entries(cat.modules)) {
      if (!isAutoEditable(name)) continue
      const dom = parseModuleDom(html, parse, { auto: true })
      const fields = regionElements(dom)
      const visit = (node: Node) => {
        for (const c of Array.from(node.childNodes)) {
          if (c.nodeType === 1) { visit(c); continue }
          const text = (c.nodeValue ?? '').replace(/ /g, ' ').trim()
          const parent = c.parentElement
          if (c.nodeType !== 3 || !parent || !/[\p{L}\p{N}]/u.test(text)) continue
          if (parent.closest('style,script,head,title,noscript,[style*="display:none"],[style*="display: none"],[style*="mso-hide"]')) continue
          if (fields.some((f) => f.contains(parent))) continue
          missed.push(`${file} › ${name}: “${text.slice(0, 40)}”`)
        }
      }
      visit(dom.root)
    }
  }
  assert.deepEqual(missed, [])
})
