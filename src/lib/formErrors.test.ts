import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeFormErrors } from './formErrors.ts'

test('nested form errors become a flat list, each with a name a person would recognise', () => {
  const list = describeFormErrors({
    content: { headline: { message: 'Max 80 characters' }, cta: { label: { message: 'Max 30 characters' }, url: { message: 'Must be a valid URL' } } },
    deadlines: { notes: { message: 'Max 300 characters' } },
  } as never)
  assert.deepEqual(list, [
    { field: 'Headline', message: 'Max 80 characters' },
    { field: 'Button label', message: 'Max 30 characters' },
    { field: 'Button link', message: 'Must be a valid URL' },
    { field: 'Notes', message: 'Max 300 characters' },
  ])
})

test('a field with no friendly name is named from its path, and one with no message says it is not valid', () => {
  assert.deepEqual(describeFormErrors({ campaign: { utmCampaign: { type: 'custom' } } } as never), [{ field: 'campaign › utmCampaign', message: 'Not valid' }])
})

test('errors inside lists name the item, and an empty set of errors gives an empty list', () => {
  assert.deepEqual(describeFormErrors({ content: { sections: [undefined, { heading: { message: 'Max 60 characters' } }] } } as never), [{ field: 'content › sections › 2 › heading', message: 'Max 60 characters' }])
  assert.deepEqual(describeFormErrors({} as never), [])
})
