#!/usr/bin/env node
/**
 * Downloads the Ninety One Visuelt web fonts from the Pardot file host into
 * public/fonts/ so the app can self-host them (the Pardot host sends no CORS
 * headers, which browsers require for @font-face resources).
 *
 *   npm run fonts:fetch
 */
const fs = require('fs')
const path = require('path')

const FONTS = {
  'NinetyOneVisueltDisplay_Regular.woff':
    'https://weare.ninetyone.com/l/28902/2020-04-27/8vjg6b/28902/241047/NinetyOneVisueltDisplay_Regular.woff',
  'NinetyOneVisuelt_Regular.woff':
    'https://weare.ninetyone.com/l/28902/2020-08-17/8y6kht/28902/252426/NinetyOneVisuelt_Regular.woff',
  'NinetyOneVisuelt_Light.woff':
    'https://weare.ninetyone.com/l/28902/2020-10-19/8zs4jq/28902/1603114661MAzRiC9E/NinetyOneVisuelt_Light.woff',
  'NinetyOneVisuelt_Medium.woff':
    'https://weare.ninetyone.com/l/28902/2020-07-13/8x6784/28902/249453/NinetyOneVisuelt_Medium.woff',
}

const outDir = path.join(__dirname, '..', 'public', 'fonts')
fs.mkdirSync(outDir, { recursive: true })

async function main() {
  let failed = 0
  for (const [name, url] of Object.entries(FONTS)) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      // WOFF files start with the magic bytes "wOFF"
      if (buf.subarray(0, 4).toString('ascii') !== 'wOFF') throw new Error('response is not a WOFF file')
      fs.writeFileSync(path.join(outDir, name), buf)
      console.log(`[fetch-fonts] ${name} (${(buf.length / 1024).toFixed(1)} KB)`)
    } catch (err) {
      failed++
      console.error(`[fetch-fonts] FAILED ${name}: ${err.message}`)
    }
  }
  if (failed) process.exit(1)
}

main()
