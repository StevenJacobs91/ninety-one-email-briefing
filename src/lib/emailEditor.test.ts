import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EDITOR_PRESETS, editorLabel, openCommand, resolveEmailEditor, shellQuote } from './emailEditor.ts'

test('Dreamweaver is the first option and the default', () => {
  assert.equal(EDITOR_PRESETS[0].id, 'dreamweaver')
  assert.deepEqual(resolveEmailEditor(undefined), { app: 'dreamweaver', appName: 'Adobe Dreamweaver 2025' })
})

test('VS Code and "another app" are the other options', () => {
  assert.deepEqual(EDITOR_PRESETS.map((p) => p.id), ['dreamweaver', 'vscode', 'other'])
  assert.equal(EDITOR_PRESETS.find((p) => p.id === 'vscode')!.appName, 'Visual Studio Code')
})

test('a saved choice is kept, including an application name the team edited', () => {
  assert.deepEqual(resolveEmailEditor({ app: 'dreamweaver', appName: 'Adobe Dreamweaver 2024' }), { app: 'dreamweaver', appName: 'Adobe Dreamweaver 2024' })
  assert.deepEqual(resolveEmailEditor({ app: 'other', appName: 'BBEdit' }), { app: 'other', appName: 'BBEdit' })
})

test('an unknown choice or a blank name falls back to something usable', () => {
  assert.equal(resolveEmailEditor({ app: 'nonsense' as never, appName: 'x' }).app, 'dreamweaver')
  assert.equal(resolveEmailEditor({ app: 'vscode', appName: '   ' }).appName, 'Visual Studio Code')
  assert.equal(resolveEmailEditor({ app: 'other', appName: '' }).appName, '')
})

test('the button names the application in plain words', () => {
  assert.equal(editorLabel({ app: 'dreamweaver', appName: 'Adobe Dreamweaver 2025' }), 'Dreamweaver')
  assert.equal(editorLabel({ app: 'vscode', appName: 'Visual Studio Code' }), 'VS Code')
  assert.equal(editorLabel({ app: 'other', appName: 'BBEdit' }), 'BBEdit')
  assert.equal(editorLabel({ app: 'other', appName: '' }), 'editor')
})

test('text is quoted so the shell reads it as one word, whatever it contains', () => {
  assert.equal(shellQuote('plain'), "'plain'")
  assert.equal(shellQuote('Advisor Impact.html'), "'Advisor Impact.html'")
  assert.equal(shellQuote("it's"), "'it'\\''s'")
  assert.equal(shellQuote('"; rm -rf ~ #'), `'"; rm -rf ~ #'`)
})

test('the Terminal command opens the downloaded file in the chosen app', () => {
  assert.equal(
    openCommand({ app: 'dreamweaver', appName: 'Adobe Dreamweaver 2025' }, 'Advisor Impact.html'),
    `open -a 'Adobe Dreamweaver 2025' ~/Downloads/'Advisor Impact.html'`,
  )
})

test('the command is safe even for an odd application or file name', () => {
  const cmd = openCommand({ app: 'other', appName: "Bob's Editor" }, "a b'c.html")
  assert.equal(cmd, `open -a 'Bob'\\''s Editor' ~/Downloads/'a b'\\''c.html'`)
})
