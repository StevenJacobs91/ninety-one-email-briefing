import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { rememberFiles, forgetFile, collectAttachments, clearAttachmentStore } from './attachmentStore.ts'

beforeEach(() => clearAttachmentStore())

const meta = (f: File) => ({ name: f.name, size: f.size, type: f.type })

test('remembered files come back as base64 attachments', async () => {
  const f = new File(['hello world'], 'notes.txt', { type: 'text/plain' })
  rememberFiles([f])
  const { found, missing } = await collectAttachments([meta(f)])
  assert.deepEqual(missing, [])
  assert.equal(found.length, 1)
  assert.equal(found[0].name, 'notes.txt')
  assert.equal(found[0].type, 'text/plain')
  assert.equal(Buffer.from(found[0].base64, 'base64').toString(), 'hello world')
})

test('a listed attachment whose file is no longer in memory is reported as missing', async () => {
  const f = new File(['x'], 'gone.pdf', { type: 'application/pdf' })
  const { found, missing } = await collectAttachments([meta(f)])
  assert.deepEqual(found, [])
  assert.deepEqual(missing, ['gone.pdf'])
})

test('a forgotten file is no longer attached', async () => {
  const f = new File(['abc'], 'a.txt', { type: 'text/plain' })
  rememberFiles([f])
  forgetFile(f.name, f.size)
  const { found, missing } = await collectAttachments([meta(f)])
  assert.equal(found.length, 0)
  assert.deepEqual(missing, ['a.txt'])
})

test('a file with no type is attached as a generic binary', async () => {
  const f = new File(['abc'], 'data.bin')
  rememberFiles([f])
  const { found } = await collectAttachments([{ name: 'data.bin', size: f.size, type: '' }])
  assert.equal(found[0].type, 'application/octet-stream')
})
