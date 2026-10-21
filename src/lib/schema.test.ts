import { test } from 'node:test'
import assert from 'node:assert/strict'
import { briefSchema, contentSchema } from './schema.ts'

const base = {
  headline: 'H', bodyIntro: 'B', sections: [], modules: [], includeUnsubscribe: true,
  cta: { label: '', url: '', openInNewTab: true },
}

test('a brief with no sections and no CTA is valid (the builder owns that content)', () => {
  assert.equal(contentSchema.safeParse(base).success, true)
})

test('an untouched empty section from an older draft is still valid', () => {
  const r = contentSchema.safeParse({ ...base, sections: [{ id: 'a', heading: '', body: '', imageRequired: false }] })
  assert.equal(r.success, true)
})

test('a non-empty CTA url must still be a valid URL', () => {
  const r = contentSchema.safeParse({ ...base, cta: { label: 'Go', url: 'not a url', openInNewTab: true } })
  assert.equal(r.success, false)
})

test('nothing on the Layout tab is required: an empty headline and body intro are valid', () => {
  assert.equal(contentSchema.safeParse({ ...base, headline: '' }).success, true)
  assert.equal(contentSchema.safeParse({ ...base, bodyIntro: '' }).success, true)
})

test('the headline keeps its 80 character limit', () => {
  assert.equal(contentSchema.safeParse({ ...base, headline: 'x'.repeat(81) }).success, false)
})

test('a saved build round-trips through the schema', () => {
  const build = {
    version: 1, themeId: 'agulhas-coral',
    modules: [{ instanceId: 'a', moduleName: 'Greeting', slot: null, repeats: {}, regions: { 'root.0': { value: 'x' } }, images: {}, boundFields: {} }],
  }
  const r = contentSchema.safeParse({ ...base, build })
  assert.equal(r.success, true)
})

test('a hero image without alt text no longer blocks the brief (alt text is entered on the Layout tab)', () => {
  const assets = briefSchema.shape.assets
  const r = assets.safeParse({ logoVariant: 'horizontal', heroImageUrl: 'https://cdn.example.com/a.png', heroImageAlt: '', additionalAssetUrls: [], attachments: [] })
  assert.equal(r.success, true)
})
