import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// AC-1: the engine imports nothing from React, the DOM or the network.
const ENGINE = join(__dirname, '..', 'engine')

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : []
  })
}

describe('engine purity (AC-1)', () => {
  const sources = files(ENGINE).map((p) => ({ p, src: readFileSync(p, 'utf8') }))

  it('finds the engine files', () => {
    expect(sources.length).toBeGreaterThan(8)
  })

  it('imports only zod and its own files or adapter types', () => {
    for (const { p, src } of sources) {
      for (const m of src.matchAll(/from\s+'([^']+)'/g)) {
        const spec = m[1]
        expect(spec.startsWith('.') || spec === 'zod', `${p} imports ${spec}`).toBe(true)
        expect(spec).not.toMatch(/react|react-dom|axios/)
      }
    }
  })

  it('uses no DOM, network or timer globals', () => {
    const forbidden = /\b(window|document|fetch|XMLHttpRequest|localStorage|sessionStorage|setTimeout|setInterval|navigator|Math\.random|Date\.now|new Date)\b/
    for (const { p, src } of sources) {
      const code = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
      expect(forbidden.test(code), `${p} uses a forbidden global`).toBe(false)
    }
  })
})
