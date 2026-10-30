import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendUtm, applyUtmToHtml, campaignUtm, slugifyUtm } from './utm.ts'

test('words are joined with hyphens, in lower case', () => {
  assert.equal(slugifyUtm('Women and Investing Newsletter'), 'women-and-investing-newsletter')
  assert.equal(slugifyUtm('  Taking   Stock  '), 'taking-stock')
})

test('plus signs, underscores-as-spaces and punctuation never end up as joiners', () => {
  assert.equal(slugifyUtm('women+and+investing+newsletter'), 'women-and-investing-newsletter')
  assert.equal(slugifyUtm('Advisor Impact — Advisor'), 'advisor-impact-advisor')
  assert.equal(slugifyUtm('Q2 / 2026 Outlook & Review'), 'q2-2026-outlook-review')
})

test('a value that is already a clean slug is left as it is', () => {
  assert.equal(slugifyUtm('taking-stock-sa-q2-2026'), 'taking-stock-sa-q2-2026')
  assert.equal(slugifyUtm('pm_insights'), 'pm_insights')
})

test('nothing usable gives an empty value', () => {
  assert.equal(slugifyUtm(''), '')
  assert.equal(slugifyUtm('  ---  '), '')
})

test('a tracked link carries the hyphenated campaign, never a plus', () => {
  const url = appendUtm('https://ninetyone.com/en/insights', 'Women and Investing Newsletter')
  assert.match(url, /utm_campaign=women-and-investing-newsletter(&|$)/)
  assert.ok(!url.includes('+'))
  assert.ok(!url.includes('%20'))
  assert.match(url, /utm_medium=email/)
  assert.match(url, /utm_source=pardot/)
})

test('existing query parameters are kept', () => {
  const url = appendUtm('https://ninetyone.com/p?a=1', 'pm-insights')
  assert.match(url, /a=1/)
  assert.match(url, /utm_campaign=pm-insights/)
})

test('every link in an email is tagged the same way', () => {
  const html = '<a href="https://a.example/x">A</a> <a href="https://b.example/y?z=1">B</a> <a href="mailto:a@b.com">C</a>'
  const out = applyUtmToHtml(html, 'Women and Investing Newsletter')
  assert.equal((out.match(/utm_campaign=women-and-investing-newsletter/g) ?? []).length, 2)
  assert.ok(!out.includes('+'))
  assert.ok(out.includes('href="mailto:a@b.com"'))
})

const PARAMS = (url: string) => [...new URL(url.replace(/&amp;/g, '&')).searchParams.keys()]

test('a link whose ampersands are already HTML-escaped is tagged once, with no garbled parameters', () => {
  const html = '<a href="https://x.com/p?utm_content=cta&amp;utm_medium=email&amp;utm_campaign=old">A</a>'
  const out = applyUtmToHtml(html, 'Advisor Impact')
  const href = /href="([^"]+)"/.exec(out)?.[1] ?? ''
  assert.ok(!href.includes('%3B') && !href.includes('amp;utm'), href)
  assert.deepEqual(PARAMS(href).sort(), ['utm_campaign', 'utm_content', 'utm_medium', 'utm_source'])
  assert.match(href, /utm_campaign=advisor-impact/)
  assert.match(href, /utm_content=cta/)
})

test('a pasted link that carries &amp; is read as & and tagged once', () => {
  const url = appendUtm('https://x.com/p?a=1&amp;utm_medium=email&amp;b=2', 'Advisor Impact')
  assert.deepEqual([...new URL(url).searchParams.keys()].sort(), ['a', 'b', 'utm_campaign', 'utm_medium', 'utm_source'])
  assert.ok(!url.includes('%3B'), url)
})

test('tagging the same email twice changes nothing the second time', () => {
  const html = '<a href="https://x.com/p?a=1&amp;b=2">A</a><a href="https://y.com/q">B</a>'
  const once = applyUtmToHtml(html, 'Advisor Impact')
  assert.equal(applyUtmToHtml(once, 'Advisor Impact'), once)
})

test('a campaign prefills its UTM from its name, as a slug', () => {
  assert.equal(campaignUtm({ name: 'Women and Investing Newsletter' }), 'women-and-investing-newsletter')
})

test('a UTM set for the campaign in Settings wins over its name, and is cleaned the same way', () => {
  assert.equal(campaignUtm({ name: 'Taking Stock', utmCampaign: 'taking-stock-sa' }), 'taking-stock-sa')
  assert.equal(campaignUtm({ name: 'Taking Stock', utmCampaign: 'Taking Stock SA' }), 'taking-stock-sa')
})

test('a blank UTM in Settings falls back to the name', () => {
  assert.equal(campaignUtm({ name: 'Taking Stock', utmCampaign: '   ' }), 'taking-stock')
})
