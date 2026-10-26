import { test } from 'node:test'
import assert from 'node:assert/strict'
import { protectThemeAssets } from './themeAssetGuard.ts'
import type { BrandThemeConfig } from '../types/settings.types.ts'

const theme = (id: string, extra: Partial<BrandThemeConfig> = {}): BrandThemeConfig => ({ id, label: id, primary: '#134848', accent: '#fbaa96', ...extra })

test('a URL this session never had, which is stored now, is kept instead of being wiped by an empty one', () => {
  const loaded = [theme('a')]
  const local = [theme('a', { logoUrl: '' })]
  const remote = [theme('a', { logoUrl: 'https://x/logo.png', stripeUrl: 'https://x/stripe.png' })]
  const out = protectThemeAssets(local, loaded, remote)
  assert.equal(out.themes[0].logoUrl, 'https://x/logo.png')
  assert.equal(out.themes[0].stripeUrl, 'https://x/stripe.png')
  assert.equal(out.restored, 2)
})

test('a URL cleared on purpose stays cleared', () => {
  const loaded = [theme('a', { logoUrl: 'https://x/logo.png' })]
  const local = [theme('a', { logoUrl: '' })]
  const remote = [theme('a', { logoUrl: 'https://x/logo.png' })]
  const out = protectThemeAssets(local, loaded, remote)
  assert.equal(out.themes[0].logoUrl, '')
  assert.equal(out.restored, 0)
})

test('a URL changed here is kept, whatever is stored', () => {
  const loaded = [theme('a', { logoUrl: 'https://x/old.png' })]
  const local = [theme('a', { logoUrl: 'https://x/new.png' })]
  const remote = [theme('a', { logoUrl: 'https://x/old.png' })]
  assert.equal(protectThemeAssets(local, loaded, remote).themes[0].logoUrl, 'https://x/new.png')
})

test('icon URLs are protected the same way, one by one', () => {
  const loaded = [theme('a', { iconUrls: { clock: 'https://x/clock.png' } })]
  const local = [theme('a', { iconUrls: { clock: 'https://x/clock.png' } })]
  const remote = [theme('a', { iconUrls: { clock: 'https://x/clock.png', calendar: 'https://x/cal.png' } })]
  const out = protectThemeAssets(local, loaded, remote)
  assert.deepEqual(out.themes[0].iconUrls, { clock: 'https://x/clock.png', calendar: 'https://x/cal.png' })
  assert.equal(out.restored, 1)
})

test('a session that started on the built-in defaults cannot wipe what the team saved', () => {
  const defaults = [theme('a'), theme('b')]
  const remote = [theme('a', { logoUrl: 'https://x/a.png' }), theme('b', { footerLogoUrl: 'https://x/b.png', anniversaryLogoUrl: 'https://x/35.png' })]
  const out = protectThemeAssets(defaults, defaults, remote)
  assert.equal(out.themes[0].logoUrl, 'https://x/a.png')
  assert.equal(out.themes[1].footerLogoUrl, 'https://x/b.png')
  assert.equal(out.themes[1].anniversaryLogoUrl, 'https://x/35.png')
  assert.equal(out.restored, 3)
})

test('a theme someone else added since is kept, and one removed here on purpose stays removed', () => {
  const loaded = [theme('a'), theme('b')]
  const local = [theme('a')]
  const remote = [theme('a'), theme('b'), theme('c')]
  const ids = protectThemeAssets(local, loaded, remote).themes.map((t) => t.id)
  assert.deepEqual(ids, ['a', 'c'])
})

test('nothing stored means nothing to protect', () => {
  const local = [theme('a', { logoUrl: 'https://x/logo.png' })]
  const out = protectThemeAssets(local, local, [])
  assert.deepEqual(out.themes, local)
  assert.equal(out.restored, 0)
})
