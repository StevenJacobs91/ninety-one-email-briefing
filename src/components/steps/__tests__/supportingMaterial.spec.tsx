// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormProvider, useForm } from 'react-hook-form'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const svc = vi.hoisted(() => ({
  uploadAttachment: vi.fn(),
  removeStoredAttachment: vi.fn(),
}))
const auth = vi.hoisted(() => ({ teamId: 't1' as string | undefined }))

vi.mock('../../../lib/attachmentStorage', () => svc)
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ profile: auth.teamId ? { teamId: auth.teamId } : null }) }))

import { SupportingMaterial } from '../SupportingMaterial'
import { clearAttachmentStore, collectAttachments } from '../../../lib/attachmentStore'

type Form = { meta: { briefId: string }; assets: { attachments: { name: string; size: number; type: string; path?: string }[]; additionalAssetUrls: string[] } }

let current: Form['assets']['attachments'] = []
function Harness({ initial = [] }: { initial?: Form['assets']['attachments'] }) {
  const form = useForm<Form>({ defaultValues: { meta: { briefId: 'b1' }, assets: { attachments: initial, additionalAssetUrls: [] } } })
  current = form.watch('assets.attachments')
  return <FormProvider {...form}><SupportingMaterial /></FormProvider>
}

const input = () => document.querySelector('input[type="file"]') as HTMLInputElement
const pdf = (name = 'brief.pdf', body = 'PDFDATA') => new File([body], name, { type: 'application/pdf' })

// jsdom's File has no arrayBuffer(); browsers do.
if (!Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function (this: Blob) {
    return new Promise<ArrayBuffer>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.readAsArrayBuffer(this)
    })
  }
}

beforeEach(() => {
  svc.uploadAttachment.mockReset()
  svc.removeStoredAttachment.mockReset().mockResolvedValue(true)
  auth.teamId = 't1'
  clearAttachmentStore()
  current = []
})
afterEach(cleanup)

describe('SupportingMaterial attachments', () => {
  it('saves a chosen file under the team and brief and lists it as saved', async () => {
    const user = userEvent.setup()
    const f = pdf()
    svc.uploadAttachment.mockResolvedValue({ name: 'brief.pdf', size: f.size, type: 'application/pdf', path: 't1/b1/ab-brief.pdf' })
    render(<Harness />)
    await user.upload(input(), f)
    await waitFor(() => expect(screen.getByText('brief.pdf')).toBeTruthy())
    expect(svc.uploadAttachment).toHaveBeenCalledWith('t1', 'b1', f)
    expect(current).toEqual([{ name: 'brief.pdf', size: f.size, type: 'application/pdf', path: 't1/b1/ab-brief.pdf' }])
    expect(screen.getByText('Saved')).toBeTruthy()
  })

  it('keeps the file for this session and says so when it cannot be saved', async () => {
    const user = userEvent.setup()
    const f = pdf('notes.pdf', 'NOTES')
    svc.uploadAttachment.mockRejectedValue(new Error('Bucket not found'))
    render(<Harness />)
    await user.upload(input(), f)
    await waitFor(() => expect(screen.getByText('notes.pdf')).toBeTruthy())
    expect(current[0].path).toBeUndefined()
    expect(screen.getByRole('alert').textContent).toMatch(/notes\.pdf.*not saved|could not be saved/i)
    expect(screen.getByText('This session only')).toBeTruthy()
    const { found } = await collectAttachments(current)
    expect(Buffer.from(found[0].base64, 'base64').toString()).toBe('NOTES')
  })

  it('refuses a file type that is not allowed, without uploading it', async () => {
    const user = userEvent.setup({ applyAccept: false })
    render(<Harness />)
    await user.upload(input(), new File(['MZ'], 'run.exe', { type: 'application/x-msdownload' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toMatch(/run\.exe.*not allowed/i)
    expect(svc.uploadAttachment).not.toHaveBeenCalled()
    expect(current).toEqual([])
  })

  it('stops at ten attachments and says so', async () => {
    const user = userEvent.setup()
    const nine = Array.from({ length: 9 }, (_, i) => ({ name: `f${i}.pdf`, size: 5, type: 'application/pdf', path: `p${i}` }))
    svc.uploadAttachment.mockImplementation(async (_t: string, _b: string, file: File) => ({ name: file.name, size: file.size, type: file.type, path: `p/${file.name}` }))
    render(<Harness initial={nine} />)
    await user.upload(input(), [pdf('a.pdf'), pdf('b.pdf')])
    await waitFor(() => expect(current.length).toBe(10))
    expect(svc.uploadAttachment).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('alert').textContent).toMatch(/10/)
  })

  it('removes a saved file from storage when it is taken off the brief', async () => {
    const user = userEvent.setup()
    render(<Harness initial={[{ name: 'gone.pdf', size: 5, type: 'application/pdf', path: 't1/b1/x-gone.pdf' }]} />)
    await user.click(screen.getByRole('button', { name: 'Remove gone.pdf' }))
    expect(svc.removeStoredAttachment).toHaveBeenCalledWith('t1/b1/x-gone.pdf')
    expect(current).toEqual([])
  })

  it('keeps the file in this session only when nobody is signed in to a team', async () => {
    auth.teamId = undefined
    const user = userEvent.setup()
    render(<Harness />)
    await user.upload(input(), pdf('local.pdf'))
    await waitFor(() => expect(screen.getByText('local.pdf')).toBeTruthy())
    expect(svc.uploadAttachment).not.toHaveBeenCalled()
    expect(screen.getByText('This session only')).toBeTruthy()
  })
})
