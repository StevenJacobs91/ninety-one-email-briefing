import { test } from 'node:test'
import assert from 'node:assert/strict'
import { codeVariables, CODE_VARIABLE_GROUPS, insertionText, variableText } from './codeVariables.ts'
import { THEME_TOKENS } from './customModules.ts'
import { THEME_ICONS } from './themeIcons.ts'

test('a header can use every variable the renderer fills in, each with a label', () => {
  const header = codeVariables('header').filter((v) => v.snippet === undefined)
  assert.deepEqual([...new Set(header.map((v) => v.token))].sort(), [...THEME_TOKENS].sort())
  assert.ok(codeVariables('header').every((v) => v.label.trim() !== ''))
})

test('every icon variable is offered, named for its icon', () => {
  const icons = codeVariables('module').filter((v) => v.group === 'Icons')
  assert.deepEqual(icons.map((v) => v.token), THEME_ICONS.map((i) => i.token))
  assert.ok(icons.every((v) => /icon$/i.test(v.label)))
})

test('the header background image is only offered to headers', () => {
  assert.ok(codeVariables('header').some((v) => v.token === 'heroImage'))
  assert.ok(!codeVariables('module').some((v) => v.token === 'heroImage'))
  assert.ok(!codeVariables('fragment').some((v) => v.token === 'heroImage'))
})

test('the variables come in groups, colours first, and nothing is listed twice', () => {
  const all = codeVariables('header')
  assert.deepEqual([...new Set(all.map((v) => v.group))], [...CODE_VARIABLE_GROUPS])
  assert.deepEqual(CODE_VARIABLE_GROUPS, ['Colours', 'Images', 'Icons', 'Pardot', 'Links'])
  assert.equal(new Set(all.map(variableText)).size, all.length)
})

test('Pardot\'s own attributes are offered to modules and headers, as the text that goes in the code', () => {
  for (const kind of ['module', 'header'] as const) {
    const pardot = codeVariables(kind).filter((v) => v.group === 'Pardot').map(variableText)
    for (const attr of [
      'pardot-region="paragraph"', 'pardot-region="button"', 'pardot-region="editable-image"', 'pardot-region="subheading"', 'pardot-region="detail"',
      'pardot-region="heading"', 'pardot-region="category"', 'pardot-region="blurb"',
      'pardot-region-type="simple"', 'pardot-region-type="link"', 'pardot-region-type="image"',
      'pardot-repeatable="article"', 'pardot-removable="button"',
    ]) assert.ok(pardot.includes(attr), `${attr} is offered`)
  }
})

test('the builder\'s link markers are offered too', () => {
  const links = codeVariables('module').filter((v) => v.group === 'Links').map(variableText)
  assert.deepEqual(links, ['data-link="article"', 'data-utm-content="top-banner"'])
})

test('code in a signature or disclaimer is offered the theme variables only', () => {
  const fragment = codeVariables('fragment')
  assert.ok(fragment.length > 0 && fragment.every((v) => v.snippet === undefined))
})

test('a variable is written {{token}}, an attribute as it is', () => {
  assert.equal(variableText({ token: 'accent', label: 'Accent colour', group: 'Colours' }), '{{accent}}')
  assert.equal(variableText({ token: 'pardot-region:button', label: 'x', group: 'Pardot', snippet: 'pardot-region="button"' }), 'pardot-region="button"')
})

test('an attribute gets a space where it needs one, and a variable never does', () => {
  const attr = 'pardot-region="paragraph"'
  assert.equal(insertionText('<td', '>', attr, true), ' pardot-region="paragraph"')
  assert.equal(insertionText('<td ', '>', attr, true), 'pardot-region="paragraph"')
  assert.equal(insertionText('<td ', 'class="x">', attr, true), 'pardot-region="paragraph" ')
  assert.equal(insertionText('<td', ' class="x">', attr, true), ' pardot-region="paragraph"')
  assert.equal(insertionText('<br', '/>', attr, true), ' pardot-region="paragraph"')
  assert.equal(insertionText('', '', attr, true), 'pardot-region="paragraph"')
  assert.equal(insertionText('<td bgcolor="', '">', '{{primary}}', false), '{{primary}}')
})
