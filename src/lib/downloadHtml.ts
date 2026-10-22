/** Saves HTML text to the person's computer as a file with the given name. */
export function downloadHtml(html: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
  const link = Object.assign(document.createElement('a'), { href: url, download: fileName })
  link.click()
  URL.revokeObjectURL(url)
}
