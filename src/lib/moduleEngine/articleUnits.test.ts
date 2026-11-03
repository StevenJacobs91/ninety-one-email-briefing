import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseModuleDom, parseRegions, applyRegions, moduleHtml } from './regions.ts'
import { findRepeats, resizeRepeat } from './repeats.ts'
import { describeModule } from './describe.ts'
import { parse } from './fixtures.ts'

// The shape of the "Investment Views Article List" module saved in Settings: each article is a whole row marked
// pardot-repeatable="article". The rows differ a little (the image height, the mobile image class), and only the first
// heading carries a stray pardot-repeatable="heading".
const article = (n: number, height: number, strayMarker: boolean) => `<tr pardot-repeatable="article">
  <td bgcolor="#221b3b" class="stack-mobile-top darkmode" style="padding: 0px 40px 20px 40px">
    <table width="100%"><tbody><tr class="stack-mobile-column darkmode-2">
      <th class="stack-column-button" valign="top" width="24%"><table width="100%"><tbody><tr>
        <td class="stack-column darkmode-2 hide"><a href="https://x/${n}/img" style="color:#fbaa96" target="_blank" title=""><img alt="Thumbnail" border="0" height="${height}" src="https://placehold.co/133x${height}/333333/e8e5ce.jpg" style="display:block" width="133"></a></td>
        <td class="show hide-full mobile-image-${n} darken-img">&nbsp;</td></tr></tbody></table></th>
      <th class="stack-column-button" valign="top" width="76%"><table width="100%"><tbody>
        <tr><td class="stack-column darkmode-2" style="padding:20px">
          <p pardot-region="category" style="margin:0">Category ${n}</p>
          <h3 pardot-region="heading"${strayMarker ? ' pardot-repeatable="heading"' : ''} style="margin:0">Heading ${n}</h3>
          <p pardot-region="blurb" style="margin:0">Blurb ${n}</p></td></tr>
        <tr><td class="stack-mobile-article-button"><table width="100%"><tbody><tr>
          <th class="stack-column-button" width="36%"><table style="border: 2px solid #fbaa96" width="100%"><tbody><tr><td class="button-copy"><a class="link" href="https://x/${n}/read" style="color:#fbaa96" target="_blank">Read more</a></td></tr></tbody></table></th>
        </tr></tbody></table></td></tr>
      </tbody></table></th>
    </tr></tbody></table></td></tr>`

const TWO = `<!-- Articles start -->\n${article(1, 240, true)}\n${article(2, 170, false)}\n<!-- Articles end -->`
const ONE = article(1, 240, false)

const dom = (html: string) => parseModuleDom(html, parse, { auto: true })
const unitCount = (html: string, repeats: Record<string, number> = {}) => describeModule('Investment Views Article List', html, parse, repeats).repeats.find((r) => r.group === 'article')

test('rows marked pardot-repeatable are units even when they differ a little, and a stray inner marker is not a group of its own', () => {
  const { groups } = findRepeats(dom(TWO))
  assert.deepEqual(groups, [{ group: 'article', units: 2, canResize: true }])
})

test('a single marked row can be repeated, and never removed below one', () => {
  assert.deepEqual(unitCount(ONE), { group: 'article', units: 1, canResize: true })
  assert.equal(unitCount(ONE, { article: 3 })!.units, 3)
  assert.equal(unitCount(TWO, { article: 1 })!.units, 1)
  assert.equal(unitCount(TWO, { article: 0 })!.units, 1)
  assert.equal(unitCount(TWO, { article: 4 })!.units, 4)
})

test('each article\'s fields are keyed by article and read in order: media, category, heading, blurb, link', () => {
  const info = describeModule('Investment Views Article List', TWO, parse)
  const first = info.fields.filter((f) => f.unit?.index === 0)
  assert.deepEqual(first.map((f) => f.name), ['Media', 'Category title', 'Heading', 'Blurb', 'Link title'])
  assert.deepEqual(first.map((f) => f.kind), ['image', 'text', 'text', 'text', 'text'])
  assert.equal(first[4].href, 'https://x/1/read', 'the link has its address')
  assert.ok(first.every((f) => f.key.startsWith('article[0].')))
  assert.ok(info.fields.filter((f) => f.unit?.index === 1).every((f) => f.key.startsWith('article[1].')))
  assert.equal(info.fields.filter((f) => !f.unit).length, 0, 'every field belongs to an article')
})

test('an added article is a copy of the last, with its own keys, and the earlier keys do not move', () => {
  const d = dom(TWO)
  const before = parseRegions(d, findRepeats(d).unitOf).map((f) => f.key)
  resizeRepeat(d, 'article', 3)
  const after = parseRegions(d, findRepeats(d).unitOf).map((f) => f.key)
  for (const k of before) assert.ok(after.includes(k), `${k} survives`)
  assert.ok(after.some((k) => k.startsWith('article[2].')))
})

test('each article\'s image is its own field, so changing one never changes another', () => {
  const d = dom(TWO)
  resizeRepeat(d, 'article', 3)
  const { unitOf } = findRepeats(d)
  const image = parseRegions(d, unitOf).find((f) => f.key.startsWith('article[2].') && f.kind === 'image')!
  applyRegions(d, { [image.key]: { value: 'https://cdn.test/third.jpg', alt: 'Third' } }, unitOf)
  const out = moduleHtml(d)
  assert.equal(out.split('https://cdn.test/third.jpg').length - 1, 1, 'only the third article\'s image changed')
  assert.equal(out.split('placehold.co/133x170').length - 1, 1, 'the second article keeps its own')
})

test('images inside articles are edited with their article, not offered again as shared images', () => {
  const info = describeModule('Investment Views Article List', TWO, parse)
  assert.equal(info.images.length, 2)
  assert.deepEqual(info.imageInUnit, [true, true])
})
