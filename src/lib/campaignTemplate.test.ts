import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isBuildEmpty, templateFromBuild, instantiateTemplate, canSaveCampaignBuild } from './campaignTemplate.ts'
import { seedBuild } from './moduleEngine/seed.ts'
import { addModule, setRegion, setImage, setRepeat } from './moduleEngine/build.ts'

test('a freshly seeded build with no values is empty', () => {
  assert.equal(isBuildEmpty(undefined), true)
  assert.equal(isBuildEmpty(seedBuild('agulhas-coral')), true)
})

test('a build with any edited value, repeat count or image is not empty', () => {
  const s = seedBuild('agulhas-coral')
  assert.equal(isBuildEmpty(setRegion(s, s.modules[1].instanceId, 'root.0', { value: 'x' })), false)
  assert.equal(isBuildEmpty(setRepeat(addModule(s, 'Article List', 1), addModule(s, 'Article List', 1).modules[1].instanceId, 'subheading', 4)), false)
  assert.equal(isBuildEmpty(setImage(s, s.modules[0].instanceId, 'img:0', { src: 'https://x/y.jpg' })), false)
  assert.equal(isBuildEmpty(addModule(s, 'Greeting', 1)), false)
})

test('saving a template drops brief-bound copy but keeps layout, images and other copy', () => {
  let b = seedBuild('agulhas-coral')
  const header = b.modules[0].instanceId
  b = setRegion(b, header, 'root.0', { value: 'Brief headline' }, 'headline')
  b = setRegion(b, header, 'root.1', { value: 'Kept sub copy' })
  b = setImage(b, header, 'img:0', { src: 'https://cdn.example.com/hero.jpg' })
  const t = templateFromBuild(b)
  assert.equal(t.modules[0].regions['root.0'], undefined)
  assert.deepEqual(t.modules[0].boundFields, {})
  assert.equal(t.modules[0].regions['root.1'].value, 'Kept sub copy')
  assert.equal(t.modules[0].images['img:0'].src, 'https://cdn.example.com/hero.jpg')
})

test('saving a template does not alias the live build', () => {
  const b = setRegion(seedBuild('agulhas-coral'), seedBuild('x').modules[0].instanceId, 'root.9', { value: 'v' })
  const t = templateFromBuild(b)
  t.modules[0].regions['new'] = { value: 'mutated' }
  assert.equal(b.modules[0].regions['new'], undefined)
})

test('loading a template gives every module a fresh instance id and the requested theme', () => {
  const tpl = seedBuild('agulhas-coral')
  const out = instantiateTemplate(tpl, 'marula-gold')
  assert.equal(out.themeId, 'marula-gold')
  for (const m of out.modules) assert.ok(!tpl.modules.some((o) => o.instanceId === m.instanceId))
  assert.deepEqual(out.modules.map((m) => m.moduleName), tpl.modules.map((m) => m.moduleName))
})

test('only a producer or admin whose role may manage templates can save', () => {
  const perms = { admin: { canManageTemplates: true }, producer: { canManageTemplates: true }, requester: { canManageTemplates: true } }
  assert.equal(canSaveCampaignBuild('admin', perms), true)
  assert.equal(canSaveCampaignBuild('producer', perms), true)
  assert.equal(canSaveCampaignBuild('requester', perms), false)
  assert.equal(canSaveCampaignBuild(undefined, perms), false)
  assert.equal(canSaveCampaignBuild('producer', { ...perms, producer: { canManageTemplates: false } }), false)
})
