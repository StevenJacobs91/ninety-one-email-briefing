import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contentSchema } from './schema.ts'

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

test('headline is required but body intro is not (the body module can be removed)', () => {
  assert.equal(contentSchema.safeParse({ ...base, headline: '' }).success, false)
  assert.equal(contentSchema.safeParse({ ...base, bodyIntro: '' }).success, true)
})

test('a saved build round-trips through the schema', () => {
  const build = {
    version: 1, themeId: 'agulhas-coral',
    modules: [{ instanceId: 'a', moduleName: 'Greeting', slot: null, repeats: {}, regions: { 'root.0': { value: 'x' } }, images: {}, boundFields: {} }],
  }
  const r = contentSchema.safeParse({ ...base, build })
  assert.equal(r.success, true)
})
