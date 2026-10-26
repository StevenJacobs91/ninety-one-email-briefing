// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { SubjectLineTesterDialog } from '../components/SubjectLineTesterDialog'

afterEach(cleanup)

it('is drawn on the page itself, above the sticky header, so no column can paint over it', () => {
  const { container } = render(
    <aside style={{ position: 'sticky' }}>
      <SubjectLineTesterDialog initial={{ subject: 'Hello', senderName: '', preheader: '' }} onClose={() => {}} />
    </aside>,
  )
  const dialog = screen.getByRole('dialog')
  expect(container.contains(dialog)).toBe(false)
  expect(document.body.contains(dialog)).toBe(true)
  expect(dialog.parentElement?.className).toContain('z-[70]')
})
