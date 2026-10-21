import { test } from 'node:test'
import assert from 'node:assert/strict'
import { attachmentPath, safeFileName, validateUpload, MAX_ATTACHMENTS, MAX_FILE_BYTES } from './attachmentRules.ts'

test('a file name is made safe for a storage path but stays recognisable', () => {
  assert.equal(safeFileName('Q3 report (final).pdf'), 'Q3-report-final.pdf')
  assert.equal(safeFileName('../../etc/passwd'), 'etc-passwd')
  assert.equal(safeFileName('Café menu — v2.docx'), 'Cafe-menu-v2.docx')
  assert.equal(safeFileName('   '), 'file')
  assert.equal(safeFileName('a'.repeat(200) + '.png').length <= 100, true)
  assert.ok(safeFileName('a'.repeat(200) + '.png').endsWith('.png'))
})

test('files are stored under the team, then the brief, with a unique prefix', () => {
  assert.equal(attachmentPath('team-1', 'brief-9', 'My File.pdf', 'abc123'), 'team-1/brief-9/abc123-My-File.pdf')
})

test('an ordinary image, PDF or document is accepted', () => {
  for (const [name, type] of [['a.png', 'image/png'], ['b.pdf', 'application/pdf'], ['c.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], ['d.xlsx', ''], ['e.csv', 'text/csv']] as const) {
    assert.equal(validateUpload({ name, size: 1000, type }), null, name)
  }
})

test('a file over the size limit is refused with the limit in the message', () => {
  const msg = validateUpload({ name: 'big.pdf', size: MAX_FILE_BYTES + 1, type: 'application/pdf' })
  assert.match(msg ?? '', /10 MB/)
})

test('an empty file and an executable are refused', () => {
  assert.match(validateUpload({ name: 'empty.pdf', size: 0, type: 'application/pdf' }) ?? '', /empty/i)
  assert.match(validateUpload({ name: 'run.exe', size: 10, type: 'application/x-msdownload' }) ?? '', /not allowed|type/i)
  assert.match(validateUpload({ name: 'x.js', size: 10, type: 'text/javascript' }) ?? '', /not allowed|type/i)
})

test('at most ten attachments per brief', () => {
  assert.equal(MAX_ATTACHMENTS, 10)
})
