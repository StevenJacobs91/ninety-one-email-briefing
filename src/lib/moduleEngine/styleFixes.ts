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

export function fixModuleStyles(moduleName: string, html: string): string {
  return (FIXES[moduleName] ?? []).reduce((out, [from, to]) => out.split(from).join(to), html)
}
