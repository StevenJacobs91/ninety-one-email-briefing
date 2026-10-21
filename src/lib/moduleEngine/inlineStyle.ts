// Small helpers for the inline style="" attribute on module elements. Written as string handling, not CSSOM,
// so it behaves the same in the browser and in the DOM used by the tests, and keeps declaration order
// (email clients take the last declaration).

export type Declaration = [prop: string, value: string]

export function parseStyle(style: string | null | undefined): Declaration[] {
  return (style ?? '')
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const i = d.indexOf(':')
      return i < 0 ? null : ([d.slice(0, i).trim().toLowerCase(), d.slice(i + 1).trim()] as Declaration)
    })
    .filter((d): d is Declaration => d !== null)
}

export function serializeStyle(decls: Declaration[]): string {
  return decls.map(([p, v]) => `${p}: ${v}`).join('; ') + (decls.length ? ';' : '')
}

/** Sets a property, replacing an existing one and keeping the rest in order. An empty value removes it. */
export function setStyleProp(el: Element, prop: string, value: string): void {
  const decls = parseStyle(el.getAttribute('style')).filter(([p]) => p !== prop)
  if (value !== '') decls.push([prop, value])
  if (decls.length) el.setAttribute('style', serializeStyle(decls))
  else el.removeAttribute('style')
}
