import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addCustomRole, opensOnBoard, resolveCustomRole, validateRoleName } from './customRoles.ts'

const reviewer = { id: 'campaign-reviewer', name: 'Campaign reviewer', colour: '#134848', baseRole: 'requester' as const, opensOn: 'board' as const }

test('producers open on the Campaign Board, other roles on the form', () => {
  assert.equal(opensOnBoard('producer'), true)
  assert.equal(opensOnBoard('requester'), false)
  assert.equal(opensOnBoard('admin'), false)
})

test('a custom role decides for itself where its people open', () => {
  assert.equal(opensOnBoard('requester', reviewer), true)
  assert.equal(opensOnBoard('producer', { ...reviewer, baseRole: 'producer', opensOn: 'form' }), false)
})

test('a deleted custom role falls back to the person\'s base role', () => {
  assert.equal(resolveCustomRole('gone', [reviewer]), undefined)
  assert.equal(resolveCustomRole(null, [reviewer]), undefined)
  assert.equal(resolveCustomRole('campaign-reviewer', [reviewer]), reviewer)
  assert.equal(opensOnBoard('producer', resolveCustomRole('gone', [reviewer])), true)
})

test('a role name must be filled in and not repeat a built-in or existing role', () => {
  assert.equal(validateRoleName('  ', []), 'Give the role a name.')
  assert.equal(validateRoleName('producer', []), 'There is already a role called Producer.')
  assert.equal(validateRoleName('Campaign Reviewer', [reviewer]), 'There is already a role called Campaign reviewer.')
  assert.equal(validateRoleName('Approver', [reviewer]), null)
})

test('adding a role gives it a unique id taken from its name', () => {
  const once = addCustomRole([], { name: 'Campaign reviewer', baseRole: 'requester', opensOn: 'board', colour: '#134848' })
  assert.equal(once[0].id, 'campaign-reviewer')
  const twice = addCustomRole(once, { name: 'Campaign Reviewer!', baseRole: 'producer', opensOn: 'form', colour: '#134848' }, { allowDuplicateName: true })
  assert.equal(twice[1].id, 'campaign-reviewer-2')
  assert.equal(once.length, 1)
})
