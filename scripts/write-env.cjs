#!/usr/bin/env node
/**
 * Writes dist/env.js from the current process environment so the SPA can read
 * config at runtime (window.__ENV__) instead of having it baked in at build.
 *
 * Run at container startup, before the static server:
 *   node scripts/write-env.cjs && pm2 serve dist --no-daemon --spa
 *
 * Only variables prefixed VITE_ are exposed — never put server secrets
 * (e.g. API_SECRET) behind that prefix.
 */
const fs = require('fs')
const path = require('path')

const PREFIX = 'VITE_'
const outDir = process.argv[2] || path.join(__dirname, '..', 'dist')
const outFile = path.join(outDir, 'env.js')

const env = {}
for (const [key, value] of Object.entries(process.env)) {
  if (key.startsWith(PREFIX) && value !== undefined) env[key] = value
}

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(outFile, `window.__ENV__ = ${JSON.stringify(env)};\n`)

console.log(`[write-env] wrote ${outFile} with keys: ${Object.keys(env).join(', ') || '(none)'}`)
