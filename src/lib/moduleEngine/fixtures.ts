// Test helpers only: read real library modules and parse them with linkedom.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseHTML } from 'linkedom'
import type { ParseDoc } from './regions.ts'

const THEME_DIR = join(process.cwd(), 'Themes and Modules', 'Modules', 'Agulhas Indigo Cape Coral')

export const parse: ParseDoc = (html) => parseHTML(html).document as unknown as Document

export function readModule(name: string): string {
  return readFileSync(join(THEME_DIR, `${name}.html`), 'utf8')
}
