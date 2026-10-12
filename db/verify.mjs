import { pathToFileURL } from 'node:url'
import { withClient } from './lib/connect.mjs'
import expected from './expected-schema.json' with { type: 'json' }

export async function compareSchema(client, spec) {
  const { rows } = await client.query(`
    select table_name, column_name from information_schema.columns
     where table_schema = 'public' and table_name <> 'schema_migrations'`)

  const actual = {}
  for (const r of rows) (actual[r.table_name] ??= new Set()).add(r.column_name)

  const missingTables = Object.keys(spec).filter(t => !actual[t]).sort()
  const extraTables = Object.keys(actual).filter(t => !spec[t]).sort()
  const missingColumns = []
  for (const [table, cols] of Object.entries(spec)) {
    if (!actual[table]) continue
    for (const col of cols) if (!actual[table].has(col)) missingColumns.push(`${table}.${col}`)
  }

  const { rows: auth } = await client.query(`
    select conname, conrelid::regclass::text as tbl from pg_constraint
     where contype = 'f' and confrelid::regclass::text like 'auth.%'`)

  return {
    missingTables, extraTables, missingColumns: missingColumns.sort(),
    authReferences: auth.map(r => `${r.tbl} (${r.conname})`).sort(),
  }
}

// pathToFileURL, not a hand-built `file://` string: this project's path
// contains spaces, which import.meta.url percent-encodes, so the naive
// comparison never matched and the CLI body silently never ran.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = await withClient(c => compareSchema(c, expected))
  const problems =
    r.missingTables.length + r.missingColumns.length + r.authReferences.length

  console.log('\n=== Schema reconciliation ===')
  console.log('Missing tables :', r.missingTables.join(', ') || 'none')
  console.log('Missing columns:', r.missingColumns.join(', ') || 'none')
  console.log('auth.* FKs     :', r.authReferences.join(', ') || 'none')
  console.log('Extra tables   :', r.extraTables.join(', ') || 'none  (informational)')
  console.log(problems === 0 ? '\nSchema matches.' : `\n${problems} difference(s).`)
  // Set exitCode rather than calling process.exit(): exit() can truncate
  // buffered stdout, which silently produced an empty report.
  process.exitCode = problems === 0 ? 0 : 1
}
