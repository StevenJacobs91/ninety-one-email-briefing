import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeFormErrors, describeIssues } from './formErrors.ts'

test('nested form errors become a flat list, each with a name a person would recognise and its path', () => {
  const list = describeFormErrors({
    content: { headline: { message: 'Max 80 characters' }, cta: { label: { message: 'Max 30 characters' }, url: { message: 'Must be a valid URL' } } },
    deadlines: { notes: { message: 'Max 300 characters' } },
  } as never)
  assert.deepEqual(list, [
    { field: 'Headline', message: 'Max 80 characters', path: 'content.headline' },
    { field: 'Button label', message: 'Max 30 characters', path: 'content.cta.label' },
    { field: 'Button link', message: 'Must be a valid URL', path: 'content.cta.url' },
    { field: 'Notes', message: 'Max 300 characters', path: 'deadlines.notes' },
  ])
})

test('a field with no friendly name is named from its path, and one with no message says it is not valid', () => {
  assert.deepEqual(describeFormErrors({ campaign: { utmCampaign: { type: 'custom' } } } as never), [{ field: 'campaign › utmCampaign', message: 'Not valid', path: 'campaign.utmCampaign' }])
})

test('errors inside lists name the item, and an empty set of errors gives an empty list', () => {
  assert.deepEqual(describeFormErrors({ content: { sections: [undefined, { heading: { message: 'Max 60 characters' } }] } } as never), [{ field: 'content › sections › 2 › heading', message: 'Max 60 characters', path: 'content.sections.1.heading' }])
  assert.deepEqual(describeFormErrors({} as never), [])
})

test('schema issues become the same kind of list, one problem for each field', () => {
  const list = describeIssues([
    { path: ['content', 'cta', 'label'], message: 'Max 30 characters' },
    { path: ['content', 'cta', 'label'], message: 'a second message for the same field' },
    { path: ['campaign', 'subjectLine'], message: 'Required' },
    { path: ['deadlines', 'sendDate'], message: '' },
  ])
  assert.deepEqual(list, [
    { field: 'Button label', message: 'Max 30 characters', path: 'content.cta.label' },
    { field: 'Subject line', message: 'Required', path: 'campaign.subjectLine' },
    { field: 'Send date', message: 'Not valid', path: 'deadlines.sendDate' },
  ])
})
