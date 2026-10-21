// Spacing the brand wants applied on top of the library markup. Kept here, not in
// the library files, so the source stays as designed and the preview and the
// sent email can never disagree.
const FIXES: Record<string, [from: string, to: string][]> = {
  // 30px above the greeting and 15px below it, set on the cell (Outlook ignores
  // padding on a <p>); the paragraph adds no margin of its own.
  Greeting: [
    ['padding: 30px 40px 30px 40px;', 'padding: 30px 40px 15px 40px;'],
    ['margin: 0px 0 15px;', 'margin: 0px;'],
  ],
  // The greeting above supplies the space, so body content starts flush and
  // keeps 30px below.
  'Body Content': [
    ['padding: 30px 40px 30px 40px;', 'padding: 0px 40px 30px 40px;'],
  ],
}

// Corrections to the supplied library found in the brand audit.
const UNSUBSCRIBE_LINK = ['<a href="{{Unsubscribe}}" style="color:#424224; text-decoration: none"', '<a href="{{Unsubscribe}}" class="link" style="color:#424242; text-decoration: none"'] as [string, string]
// "#424224" is a typo for the brand grey #424242, and with no class the dark-mode rules never reach the link,
// so it stayed near-invisible on the dark footer. `.link` is the shell's dark-mode link colour.
for (const name of ['Disclaimer', 'Disclaimer - UK']) FIXES[name] = [UNSUBSCRIBE_LINK]
// Brand cream is #e8e5ce.
FIXES['Plain Logo Header'] = [['color: #e8e5cf;', 'color: #e8e5ce;']]

// Fixes for one theme only. Warm Yellowwood is a Leatherback Green theme, but its Small Header was built in
// Marula Green; its Cape Coral sibling uses Leatherback's darkest tint, #0d3232.
const THEME_FIXES: Record<string, Record<string, [from: string, to: string][]>> = {
  'leatherback-yellowood': { 'Small Header': [['#0a3323', '#0d3232'], ['#0A3323', '#0d3232']] },
}

export function fixModuleStyles(moduleName: string, html: string, themeId?: string): string {
  const fixes = [...(FIXES[moduleName] ?? []), ...(themeId ? THEME_FIXES[themeId]?.[moduleName] ?? [] : [])]
  return fixes.reduce((out, [from, to]) => out.split(from).join(to), html)
}
