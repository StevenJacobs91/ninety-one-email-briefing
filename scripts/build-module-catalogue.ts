// Builds public/module-catalogue/<themeId>.json from "Themes and Modules/".
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { BRAND_THEMES } from '../src/lib/constants.ts'
import { themeFolderName } from '../src/lib/moduleEngine/catalogue.ts'

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
  writeFileSync(join(OUT, `${theme.id}.json`), JSON.stringify({ themeId: theme.id, shell, order: ordered, modules }))
}
writeFileSync(join(OUT, 'index.json'), JSON.stringify({ themes: BRAND_THEMES.map((t) => t.id) }))
console.log(`Wrote ${BRAND_THEMES.length} theme catalogues to ${OUT}`)
