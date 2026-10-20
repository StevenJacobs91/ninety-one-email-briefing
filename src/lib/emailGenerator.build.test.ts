import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateEmailHtml } from './emailGenerator.ts'
import { seedBuild, bindBrief } from './moduleEngine/seed.ts'
import { addModule } from './moduleEngine/build.ts'
import type { ThemeCatalogue } from './moduleEngine/catalogue.ts'
import { parse } from './moduleEngine/fixtures.ts'
import type { BriefPayload } from '../types/brief.types'

const cat: ThemeCatalogue = JSON.parse(
  readFileSync(join(process.cwd(), 'public', 'module-catalogue', 'agulhas-coral.json'), 'utf8'),
)

function brief(withBuild: boolean): BriefPayload {
  let build = bindBrief(seedBuild('agulhas-coral'), { headline: 'Built headline', subHeadline: 'Built sub', bodyIntro: 'Built intro' }, cat, parse)
  build = addModule(build, 'Single Primary CTA', 2)
  return {
    meta: { briefId: 'b', createdAt: '', updatedAt: '', status: 'draft' },
    campaign: { theme: 'agulhas-coral', campaignName: 'My Campaign', subjectLine: 'S', previewText: 'P', fromName: 'N', fromAddress: 'a@b.co', emailType: 'campaign' },
    audience: { region: ['ZA'], channel: [], clientGroup: [] },
    content: {
      headline: 'Legacy headline', subHeadline: '', bodyIntro: 'Legacy intro', sections: [], modules: [],
      cta: { label: '', url: '', openInNewTab: true }, includeUnsubscribe: true,
      ...(withBuild ? { build } : {}),
    },
    assets: { headerType: 'standard', logoVariant: 'horizontal', heroImageUrl: '', heroImageAlt: '', additionalAssetUrls: [], attachments: [] },
    deadlines: { sendDate: '2026-11-01', urgency: 'standard', oneOnOneRequired: false },
  } as unknown as BriefPayload
}

test('a brief with a build renders the library shell and the edited modules', () => {
  const html = generateEmailHtml(brief(true), undefined, { catalogue: cat, parse })
  assert.ok(html.startsWith(cat.shell.head.slice(0, 40)))
  assert.ok(html.includes('Built headline') && html.includes('Built intro'))
  assert.ok(html.includes('Single Primary CTA'))
})

test('empty utm_campaign slots in library links are filled with the campaign name', () => {
  const html = generateEmailHtml(brief(true), undefined, { catalogue: cat, parse })
  assert.ok(html.includes('utm_campaign=My%20Campaign'))
  assert.ok(!/utm_campaign=(?=["'&])/.test(html))
})

test('a brief without a build still uses the legacy generator', () => {
  const html = generateEmailHtml(brief(false), undefined, { catalogue: cat, parse })
  assert.ok(html.includes('Legacy headline'))
  assert.ok(!html.includes('Built headline'))
})

test('a build with no catalogue loaded falls back to the legacy generator', () => {
  const html = generateEmailHtml(brief(true))
  assert.ok(html.includes('Legacy headline'))
})
