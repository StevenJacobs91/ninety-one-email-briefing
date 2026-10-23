import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { footerSections, isFooterModule } from './footer.ts'
import { parseModuleDom } from './regions.ts'
import { describeModule } from './describe.ts'
import { renderBuild } from './render.ts'
import { newModule, setFooter } from './build.ts'
import { parse } from './fixtures.ts'

const DIR = join(process.cwd(), 'public', 'module-catalogue')
const themes = readdirSync(DIR).filter((f) => f.endsWith('.json') && f !== 'index.json')
const load = (file: string) => JSON.parse(readFileSync(join(DIR, file), 'utf8')) as { themeId: string; order: string[]; modules: Record<string, string> }
const text = (els: Element[]) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim())

const sections = (html: string) => footerSections(parseModuleDom(html, parse, { auto: false }).root)

test('only footer modules have footer sections', () => {
  assert.equal(isFooterModule('Footer v1'), true)
  assert.equal(isFooterModule('Footer V3'), true)
  assert.equal(isFooterModule('Disclaimer'), false)
})

test('every footer in every theme splits into sign-off, signature and tail the same way', () => {
  assert.ok(themes.length >= 15)
  for (const file of themes) {
    const cat = load(file)
    const v1 = sections(cat.modules['Footer v1'])
    assert.equal(text(v1.signoff).length, 2, `${file} v1 sign-off`)
    assert.ok(text(v1.signoff)[0].startsWith('For more information'), file)
    assert.deepEqual(text(v1.signature), ['Kind regards,', 'Ninety One', 'www.ninetyone.com'], `${file} v1 signature`)
    assert.ok(v1.tail && v1.social, `${file} v1 tail and social icons`)

    const v2 = sections(cat.modules['Footer V2'])
    assert.equal(v2.signoff.length, 0, `${file} v2 sign-off`)
    assert.equal(v2.signature.length, 4, `${file} v2 signature`)
    assert.ok(v2.tail && !v2.social, `${file} v2 tail without icons`)

    const v3 = sections(cat.modules['Footer V3'])
    assert.deepEqual(text(v3.signoff), ['Please do not hesitate to contact us, should you have any further questions.'], `${file} v3 sign-off`)
    assert.equal(v3.signature.length, 3, `${file} v3 signature`)
    assert.ok(v3.tail && !v3.social, `${file} v3 tail`)
  }
})

test('described fields say which section they belong to, and what the module has', () => {
  const html = load('agulhas-gold.json').modules['Footer v1']
  const info = describeModule('Footer v1', html, parse)
  const bySection = (s: string) => info.fields.filter((f) => f.section === s).map((f) => f.value)
  assert.equal(bySection('signoff').length, 2)
  assert.equal(bySection('signature').length, 3)
  assert.ok(info.fields.some((f) => f.section === 'tail'))
  assert.deepEqual(info.footer, { hasSignoff: true, hasSignature: true, hasSocial: true })
  assert.deepEqual(describeModule('Footer V2', load('agulhas-gold.json').modules['Footer V2'], parse).footer, { hasSignoff: false, hasSignature: true, hasSocial: false })
})

const render = (themeFile: string, name: string, patch: Parameters<typeof setFooter>[2]) => {
  const cat = load(themeFile)
  let b = { version: 1 as const, themeId: cat.themeId, modules: [newModule(name, 'footer')] }
  b = setFooter(b, b.modules[0].instanceId, patch)
  return renderBuild(b, { ...cat, shell: { head: '', tail: '' } }, { parse }).html
}

const SIG = { id: 's', name: 'S', isDefault: false, text: '**Natalie Phillips**\n[Ninety One](https://ninetyone.com)' }

test('the sign-off text can be removed, leaving the signature and tail', () => {
  for (const file of themes) {
    const out = render(file, 'Footer v1', { removeSignoff: true })
    assert.ok(!out.includes('For more information about'), file)
    assert.ok(!out.includes('Thank you for your support.'), file)
    assert.ok(out.includes('Kind regards,') && out.includes('Visit website'), file)
  }
})

test('the chosen signature replaces the module\'s, in the module\'s own text colour', () => {
  for (const file of themes) {
    const out = render(file, 'Footer v1', { signature: { entry: SIG } })
    assert.ok(!out.includes('Kind regards,'), file)
    assert.ok(out.includes('Natalie Phillips') && out.includes('href="https://ninetyone.com"'), file)
    const original = load(file).modules['Footer v1'].match(/color:\s*(#[0-9a-f]{6})[^"]*">Kind regards/i)?.[1]
    assert.ok(original, `${file} has a colour to keep`)
    assert.ok(out.toLowerCase().includes(`color: ${original.toLowerCase()}`), `${file} keeps text colour ${original}`)
    assert.ok(out.indexOf('Natalie Phillips') < out.indexOf('Visit website'), file)
  }
})

test('no signature takes the whole signature block away', () => {
  const out = render('agulhas-gold.json', 'Footer v1', { signature: 'none' })
  assert.ok(!out.includes('Kind regards,') && !out.includes('>www.ninetyone.com</a></p>'))
  assert.ok(out.includes('For more information about') && out.includes('Visit website'))
})

test('the footer tail can lose its social icons, in every theme', () => {
  for (const file of themes) {
    const out = render(file, 'Footer v1', { social: false })
    assert.ok(!out.includes('icon_social'), file)
    assert.ok(out.includes('Visit website') && out.includes('Footer_logo'), file)
  }
})

test('a footer without icons can be given them, taken from the same theme\'s Footer v1', () => {
  for (const file of themes) {
    const out = render(file, 'Footer V2', { social: true })
    assert.equal((out.match(/icon_social/g) ?? []).length, 6, file)
    assert.ok(out.indexOf('Visit website') < out.indexOf('icon_social'), file)
  }
})

test('with no options a footer renders as the library designed it', () => {
  const cat = load('agulhas-gold.json')
  const b = { version: 1 as const, themeId: cat.themeId, modules: [newModule('Footer v1', 'footer')] }
  const out = renderBuild(b, { ...cat, shell: { head: '', tail: '' } }, { parse }).html
  assert.ok(out.includes('Kind regards,') && out.includes('icon_social') && out.includes('For more information about'))
})
