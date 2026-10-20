// Builds public/module-catalogue/<themeId>.json from "Themes and Modules/".
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { BRAND_THEMES } from '../src/lib/constants.ts'
import { themeFolderName, type ThemeCatalogue } from '../src/lib/moduleEngine/catalogue.ts'
import { whiten } from '../src/lib/moduleEngine/whiten.ts'

const ROOT = join(process.cwd(), 'Themes and Modules')
const OUT = join(process.cwd(), 'public', 'module-catalogue')
const MIN_MODULES = 48

// Template order, from the module library README ("Modules, in template order").
function templateOrder(readme: string): string[] {
  return [...readme.matchAll(/^\| `([^`]+)\.html` \|/gm)].map((m) => m[1])
}

function splitShell(master: string, label: string): { head: string; tail: string } {
  const marker = 'class="email-container"'
  const markerAt = master.indexOf(marker)
  const containerAt = master.lastIndexOf('<table', markerAt)
  if (markerAt < 0 || master.indexOf(marker, markerAt + marker.length) >= 0) {
    throw new Error(`${label}: master must contain exactly one email-container table`)
  }
  const openTbody = master.indexOf('<tbody>', containerAt)
  const bodyEnd = master.indexOf('<!-- Body : END -->')
  const closeTbody = master.lastIndexOf('</tbody>', bodyEnd)
  if (openTbody < 0 || bodyEnd < 0 || closeTbody < openTbody) {
    throw new Error(`${label}: could not locate the email-container body boundaries`)
  }
  const headEnd = openTbody + '<tbody>'.length
  return { head: master.slice(0, headEnd), tail: master.slice(closeTbody) }
}

// White themes with an exact Springbok Cream sibling (same accent, same images).
// Coral, Yellowwood and Gold have no sibling: their accent-coloured logo, stripes
// and icons do not exist for a light background, so they stay unavailable.
const WHITE_FROM: Record<string, string> = {
  'white-red': 'springbok-red',
  'white-teal': 'springbok-teal',
  'white-pinotage': 'springbok-burgundy',
}
const built = new Map<string, ThemeCatalogue>()

mkdirSync(OUT, { recursive: true })
const readmePath = join(ROOT, 'Modules', 'README.md')
const order = existsSync(readmePath) ? templateOrder(readFileSync(readmePath, 'utf8')) : []

for (const theme of BRAND_THEMES) {
  const folder = themeFolderName(theme.label)
  const dir = join(ROOT, 'Modules', folder)
  if (!existsSync(dir)) throw new Error(`Missing module folder for ${theme.id}: ${dir}`)
  const all = readdirSync(dir).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5))
  // iCloud sync leaves "<name> 2.html" copies beside the originals; ignore them.
  const names = all.filter((n) => !(n.endsWith(' 2') && all.includes(n.slice(0, -2))))
  if (names.length < MIN_MODULES) throw new Error(`${theme.id}: only ${names.length} modules in ${dir}`)
  const modules: Record<string, string> = {}
  for (const n of names) modules[n] = readFileSync(join(dir, `${n}.html`), 'utf8')

  const masterPath = join(ROOT, 'HTML Templates', `${folder} - All Modules.html`)
  if (!existsSync(masterPath)) throw new Error(`Missing master template for ${theme.id}: ${masterPath}`)
  const shell = splitShell(readFileSync(masterPath, 'utf8'), theme.id)

  const ordered = [...order.filter((n) => n in modules), ...names.filter((n) => !order.includes(n)).sort()]
  const catalogue: ThemeCatalogue = { themeId: theme.id, shell, order: ordered, modules }
  built.set(theme.id, catalogue)
  writeFileSync(join(OUT, `${theme.id}.json`), JSON.stringify(catalogue))
}

for (const [whiteId, baseId] of Object.entries(WHITE_FROM)) {
  const base = built.get(baseId)
  if (!base) throw new Error(`${whiteId}: base theme ${baseId} was not built`)
  const modules = Object.fromEntries(Object.entries(base.modules).map(([n, html]) => [n, whiten(html)]))
  const derived: ThemeCatalogue = {
    themeId: whiteId,
    shell: { head: whiten(base.shell.head), tail: whiten(base.shell.tail) },
    order: base.order,
    modules,
  }
  writeFileSync(join(OUT, `${whiteId}.json`), JSON.stringify(derived))
}
writeFileSync(join(OUT, 'index.json'), JSON.stringify({ themes: [...BRAND_THEMES.map((t) => t.id), ...Object.keys(WHITE_FROM)] }))
console.log(`Wrote ${BRAND_THEMES.length + Object.keys(WHITE_FROM).length} theme catalogues to ${OUT}`)
