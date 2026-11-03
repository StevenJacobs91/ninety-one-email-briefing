import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseModuleDom, parseRegions, applyRegions, moduleHtml } from './regions.ts'
import { findRepeats, resizeRepeat } from './repeats.ts'
import { describeModule } from './describe.ts'
import { applyLinkUtm } from './linkGroups.ts'
import { renderBuild } from './render.ts'
import { newModule, type EmailBuild } from './build.ts'
import type { ThemeCatalogue } from './catalogue.ts'
import { parse } from './fixtures.ts'

// An article row like the Investment Views module's, with its thumbnail link, heading link and button link marked as
// one link group: data-link="article".
const article = (n: number, extra = '') => `<tr pardot-repeatable="article">
  <td><table><tbody><tr>
    <th><a data-link="article" href="https://x.test/story-${n}" target="_blank"><img alt="Thumbnail" height="170" src="https://placehold.co/133x170/333333/e8e5ce.jpg" width="133"></a></th>
    <th>
      <p pardot-region="category">Category ${n}</p>
      <h3 pardot-region="heading"><a data-link="article" href="https://x.test/story-${n}" target="_blank">Heading ${n}</a></h3>
      <p pardot-region="blurb">Blurb ${n}</p>
      <table><tbody><tr><td class="button-copy"><a class="link" data-link="article" ${extra} href="https://x.test/story-${n}" target="_blank">Read more</a></td></tr></tbody></table>
    </th>
  </tr></tbody></table></td></tr>`

const TWO = `${article(1)}\n${article(2)}`
const dom = (html: string) => parseModuleDom(html, parse, { auto: true })
const hrefs = (html: string) => [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1])

test('links marked as a group are one Link URL, after the link title, and the heading and link title carry no address of their own', () => {
  const info = describeModule('Investment Views Article List', TWO, parse)
  const first = info.fields.filter((f) => f.unit?.index === 0)
  assert.deepEqual(first.map((f) => f.name), ['Media', 'Category title', 'Heading', 'Blurb', 'Link title', 'Link URL'])
  assert.equal(first.find((f) => f.name === 'Heading')!.href, undefined)
  assert.equal(first.find((f) => f.name === 'Link title')!.href, undefined)
  const url = first.find((f) => f.name === 'Link URL')!
  assert.equal(url.kind, 'link')
  assert.equal(url.value, 'https://x.test/story-1')
  assert.equal(url.key, 'article[0].l.article')
})

test('setting the Link URL changes every link in the group, in that article only', () => {
  const d = dom(TWO)
  const { unitOf } = findRepeats(d)
  applyRegions(d, { 'article[1].l.article': { value: 'https://new.test/story' } }, unitOf)
  const out = hrefs(moduleHtml(d))
  assert.equal(out.filter((h) => h === 'https://new.test/story').length, 3, 'the image, heading and button links of article 2')
  assert.equal(out.filter((h) => h === 'https://x.test/story-1').length, 3, 'article 1 is untouched')
})

test('a group outside any repeating unit is one Link URL too', () => {
  const html = `<tr><td><a data-link="promo" href="https://x.test/a">One</a> <a data-link="promo" href="https://x.test/a">Two</a></td></tr>`
  const link = describeModule('Promo', html, parse).fields.filter((f) => f.kind === 'link')
  assert.deepEqual(link.map((f) => [f.key, f.name]), [['root.l.promo', 'Link URL']])
})

test('each link gets its own utm_content: the article, its number, and whether it is the image, heading or button', () => {
  const d = dom(TWO)
  applyLinkUtm(d, findRepeats(d).unitOf)
  const out = hrefs(moduleHtml(d))
  assert.deepEqual(out, [
    'https://x.test/story-1?utm_content=article-1-image',
    'https://x.test/story-1?utm_content=article-1-heading',
    'https://x.test/story-1?utm_content=article-1-cta',
    'https://x.test/story-2?utm_content=article-2-image',
    'https://x.test/story-2?utm_content=article-2-heading',
    'https://x.test/story-2?utm_content=article-2-cta',
  ])
})

test('a copied article is numbered in turn', () => {
  const d = dom(TWO)
  resizeRepeat(d, 'article', 3)
  applyLinkUtm(d, findRepeats(d).unitOf)
  assert.ok(hrefs(moduleHtml(d)).some((h) => h.endsWith('utm_content=article-3-cta')))
})

test('a utm_content someone typed is kept, a link with no address is left alone, and a link can name itself', () => {
  const html = `<tr><td>
    <a data-link="promo" href="https://x.test/a?utm_content=hand-typed">One</a>
    <a data-link="promo" href="#">Two</a>
    <a data-link="promo" data-utm-content="Top Banner" href="https://x.test/b">Three</a>
  </td></tr>`
  const d = dom(html)
  applyLinkUtm(d, findRepeats(d).unitOf)
  assert.deepEqual(hrefs(moduleHtml(d)), [
    'https://x.test/a?utm_content=hand-typed',
    '#',
    'https://x.test/b?utm_content=top-banner',
  ])
})

test('the markers never reach the email', () => {
  const d = dom(`<tr><td><a data-link="promo" data-utm-content="x" href="https://x.test/a">One</a></td></tr>`)
  applyLinkUtm(d, findRepeats(d).unitOf)
  const out = moduleHtml(d)
  assert.ok(!out.includes('data-link') && !out.includes('data-utm-content'))
})

test('a module with link groups is tagged and cleaned when it is rendered, even if nothing in it was edited', () => {
  const cat: ThemeCatalogue = { themeId: 'agulhas-coral', shell: { head: '', tail: '' }, order: ['Articles'], modules: { Articles: TWO } }
  const build: EmailBuild = { version: 1, themeId: 'agulhas-coral', modules: [newModule('Articles')] }
  const { html } = renderBuild(build, cat, { parse })
  assert.ok(html.includes('utm_content=article-2-cta'))
  assert.ok(!html.includes('data-link'))
})

test('the link group is part of the region keys the renderer knows', () => {
  const d = dom(TWO)
  const keys = parseRegions(d, findRepeats(d).unitOf).map((f) => f.key)
  assert.ok(keys.includes('article[0].l.article') && keys.includes('article[1].l.article'))
})
