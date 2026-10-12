import { pathToFileURL } from 'node:url'
import { withClient } from './lib/connect.mjs'
import expected from './expected-schema.json' with { type: 'json' }

const COLUMNS_SQL = `
  select table_name, column_name from information_schema.columns
   where table_schema = 'public' and table_name <> 'schema_migrations'`

// Column names alone cannot see the failure mode most likely to exist on a
// hand-migrated database: a table with the right shape but no constraints.
const CONSTRAINTS_SQL = `
  select conname, pg_get_constraintdef(oid) as def
    from pg_constraint
   where connamespace = 'public'::regnamespace
     and conrelid::regclass::text <> 'schema_migrations'`

const INDEXES_SQL = `
  select indexname, indexdef from pg_indexes
   where schemaname = 'public' and tablename <> 'schema_migrations'`

const AUTH_FK_SQL = `
  select conname, conrelid::regclass::text as tbl from pg_constraint
   where contype = 'f' and confrelid::regclass::text like 'auth.%'`

export async function snapshot(client) {
  // Sequential, not Promise.all: a single pg Client cannot run concurrent
  // queries and warns (deprecated) when asked to.
  const cols = await client.query(COLUMNS_SQL)
  const cons = await client.query(CONSTRAINTS_SQL)
  const idx = await client.query(INDEXES_SQL)
  const tables = {}
  for (const r of cols.rows) (tables[r.table_name] ??= []).push(r.column_name)
  for (const t of Object.keys(tables)) tables[t].sort()
  return {
    tables,
    constraints: Object.fromEntries(cons.rows.map(r => [r.conname, r.def])),
    indexes: Object.fromEntries(idx.rows.map(r => [r.indexname, r.indexdef])),
  }
}

export async function compareSchema(client, spec) {
  const actual = await snapshot(client)
  const actualCols = Object.fromEntries(
    Object.entries(actual.tables).map(([t, c]) => [t, new Set(c)]))

  const missingTables = Object.keys(spec.tables).filter(t => !actualCols[t]).sort()
  const extraTables = Object.keys(actualCols).filter(t => !spec.tables[t]).sort()

  const missingColumns = []
  for (const [table, cols] of Object.entries(spec.tables)) {
    if (!actualCols[table]) continue
    for (const col of cols) if (!actualCols[table].has(col)) missingColumns.push(`${table}.${col}`)
  }

  const missingConstraints = Object.keys(spec.constraints)
    .filter(n => !(n in actual.constraints)).sort()
  const changedConstraints = Object.keys(spec.constraints)
    .filter(n => n in actual.constraints && actual.constraints[n] !== spec.constraints[n])
    .map(n => `${n}: expected ${spec.constraints[n]}, found ${actual.constraints[n]}`).sort()
  const missingIndexes = Object.keys(spec.indexes)
    .filter(n => !(n in actual.indexes)).sort()

  const { rows: auth } = await client.query(AUTH_FK_SQL)

  return {
    missingTables, extraTables, missingColumns: missingColumns.sort(),
    missingConstraints, changedConstraints, missingIndexes,
    authReferences: auth.map(r => `${r.tbl} (${r.conname})`).sort(),
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = await withClient(c => compareSchema(c, expected))
  const problems = r.missingTables.length + r.missingColumns.length +
    r.missingConstraints.length + r.changedConstraints.length +
    r.missingIndexes.length + r.authReferences.length

  const line = (label, v) => console.log(label.padEnd(16) + ':', v.join(', ') || 'none')
  console.log('\n=== Schema reconciliation ===')
  line('Missing tables', r.missingTables)
  line('Missing columns', r.missingColumns)
  line('Missing constr.', r.missingConstraints)
  line('Changed constr.', r.changedConstraints)
  line('Missing indexes', r.missingIndexes)
  line('auth.* FKs', r.authReferences)
  line('Extra tables', [...r.extraTables, '(informational)'])
  console.log(problems === 0 ? '\nSchema matches.' : `\n${problems} difference(s).`)

  // exitCode, not exit(): exit() truncates buffered stdout.
  process.exitCode = problems === 0 ? 0 : 1
}
