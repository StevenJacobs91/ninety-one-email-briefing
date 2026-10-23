import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { renderBuild } from './render.ts'
import { newModule, type EmailBuild } from './build.ts'
import { nonHexColours } from '../hexColours.ts'
import { parse } from './fixtures.ts'

const DIR = join(process.cwd(), 'public', 'module-catalogue')
const themes = readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'index.json')

test('no module or shell in any theme library has a colour that is not hex', () => {
  for (const file of themes) {
    const cat = JSON.parse(readFileSync(join(DIR, file), 'utf8')) as { shell: { head: string; tail: string }; modules: Record<string, string> }
    assert.deepEqual(nonHexColours(cat.shell.head + cat.shell.tail + Object.values(cat.modules).join('')), [], file)
  }
})

test('theme tokens left in code from Settings are filled in, so no {{accent}} reaches Pardot, and other merge tags are kept', () => {
  const cat = {
    themeId: 'agulhas-gold',
    order: ['Plain'],
    shell: { head: '<html><body><table><tbody>', tail: '</tbody></table></body></html>' },
    modules: { Plain: '<tr><td><a href="{{Unsubscribe}}" style="color: {{accent}}; background: {{primary}}">Email Sizwe</a></td></tr>' },
  }
  const build: EmailBuild = { version: 1, themeId: cat.themeId, modules: [newModule('Plain')] }
  const themes = [{ id: 'agulhas-gold', primary: '#221b3b', accent: '#cf6f13' }] as never
  const { html } = renderBuild(build, cat, { parse, brandThemes: themes })
  assert.ok(html.includes('color: #cf6f13') && html.includes('background: #221b3b'))
  assert.ok(!html.includes('{{accent}}') && !html.includes('{{primary}}'))
  assert.ok(html.includes('{{Unsubscribe}}'))
  assert.ok(renderBuild(build, cat, { parse, accent: '#d83949' }).html.includes('color: #d83949'), 'the accent alone is enough')
})

test('an email is rendered with hex colours, including ones the DOM wrote as rgb() and ones a module was supplied with', () => {
  const cat = {
    themeId: 'agulhas-gold',
    order: ['Plain'],
    shell: { head: '<html><body><table><tbody>', tail: '</tbody></table></body></html>' },
    modules: { Plain: '<tr><td style="color: rgb(0, 0, 0); border: 1px solid rgb(19,72,72)"><p pardot-region="paragraph">Hello</p></td></tr>' },
  }
  const module = newModule('Plain')
  module.regions = { 'paragraph:0': { html: 'Hello **there**' } } as never
  const build: EmailBuild = { version: 1, themeId: cat.themeId, modules: [module] }
  const { html } = renderBuild(build, cat, { parse, accent: '#cf6f13' })
  assert.deepEqual(nonHexColours(html), [])
  assert.ok(html.includes('#000000') && html.includes('#134848'))
})
