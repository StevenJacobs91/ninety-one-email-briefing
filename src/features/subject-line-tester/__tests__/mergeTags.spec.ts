import { describe, expect, it } from 'vitest'
import { renderMergeTags } from '../engine/mergeTags'
import { createMockMergeTagSyntax, createMockSampleContactProvider } from '../adapters/mock'

const syntax = createMockMergeTagSyntax()
const sample = createMockSampleContactProvider()

describe('renderMergeTags', () => {
  it('replaces known tags with sample values', () => {
    const r = renderMergeTags('Hi {{Recipient.FirstName}}, welcome', syntax, sample)
    expect(r.rendered).toBe('Hi Alexandra, welcome')
    expect(r.tags).toHaveLength(1)
    expect(r.tags[0]).toMatchObject({ field: 'Recipient.FirstName', known: true })
    expect(r.broken).toEqual([])
  })

  it('tolerates spaces inside the braces', () => {
    expect(renderMergeTags('{{ Recipient.FirstName }}', syntax, sample).rendered).toBe('Alexandra')
  })

  it('keeps an unknown tag as written and marks it unknown', () => {
    const r = renderMergeTags('Hi {{Recipient.Nickname}}', syntax, sample)
    expect(r.rendered).toBe('Hi {{Recipient.Nickname}}')
    expect(r.tags[0]).toMatchObject({ field: 'Recipient.Nickname', known: false })
  })

  it('reports empty or unclosed braces as broken', () => {
    expect(renderMergeTags('Hi {{ }}', syntax, sample).broken).toHaveLength(1)
    expect(renderMergeTags('Hi {{Recipient.FirstName', syntax, sample).broken).toHaveLength(1)
    expect(renderMergeTags('Hi Recipient.FirstName}}', syntax, sample).broken).toHaveLength(1)
  })

  it('reports unresolved placeholders like [Name]', () => {
    const r = renderMergeTags('Hi [Name], your update', syntax, sample)
    expect(r.broken).toEqual(['[Name]'])
    expect(r.rendered).toBe('Hi [Name], your update')
  })

  it('is repeatable: no regex state carries over between calls', () => {
    const a = renderMergeTags('Hi {{Recipient.FirstName}}', syntax, sample)
    const b = renderMergeTags('Hi {{Recipient.FirstName}}', syntax, sample)
    expect(b).toEqual(a)
  })

  it('leaves text with no tags untouched', () => {
    const r = renderMergeTags('Plain subject', syntax, sample)
    expect(r).toEqual({ rendered: 'Plain subject', tags: [], broken: [] })
  })
})

describe('rendered offsets of tags', () => {
  it('records where each tag ended up in the rendered text', () => {
    const r = renderMergeTags('Hi {{Recipient.FirstName}}, {{Recipient.Nickname}} here', syntax, sample)
    expect(r.rendered).toBe('Hi Alexandra, {{Recipient.Nickname}} here')
    const [known, unknown] = r.tags
    expect(r.rendered.slice(known.renderedStart, known.renderedEnd)).toBe('Alexandra')
    expect(r.rendered.slice(unknown.renderedStart, unknown.renderedEnd)).toBe('{{Recipient.Nickname}}')
  })
})
