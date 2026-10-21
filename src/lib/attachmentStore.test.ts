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

test('a saved attachment is fetched from storage, so it survives a reload', async () => {
  const downloaded: string[] = []
  const { found, missing } = await collectAttachments(
    [{ name: 'brief.pdf', size: 5, type: 'application/pdf', path: 't/b/1-brief.pdf' }],
    async (path) => { downloaded.push(path); return new Blob(['PDF!!'], { type: 'application/pdf' }) },
  )
  assert.deepEqual(downloaded, ['t/b/1-brief.pdf'])
  assert.deepEqual(missing, [])
  assert.equal(Buffer.from(found[0].base64, 'base64').toString(), 'PDF!!')
  assert.equal(found[0].name, 'brief.pdf')
  assert.equal(found[0].type, 'application/pdf')
})

test('a saved attachment that cannot be fetched is reported as missing, not dropped silently', async () => {
  const { found, missing } = await collectAttachments(
    [{ name: 'a.pdf', size: 1, type: 'application/pdf', path: 't/b/1-a.pdf' }],
    async () => { throw new Error('offline') },
  )
  assert.deepEqual(found, [])
  assert.deepEqual(missing, ['a.pdf'])
})

test('a saved attachment is preferred over a copy in memory, and unsaved ones still use memory', async () => {
  const mem = new File(['mem'], 'm.txt', { type: 'text/plain' })
  rememberFiles([mem])
  const { found } = await collectAttachments(
    [{ name: 'm.txt', size: mem.size, type: 'text/plain' }, { name: 's.txt', size: 3, type: 'text/plain', path: 'p' }],
    async () => new Blob(['sto'], { type: 'text/plain' }),
  )
  assert.deepEqual(found.map((f) => Buffer.from(f.base64, 'base64').toString()), ['mem', 'sto'])
})
