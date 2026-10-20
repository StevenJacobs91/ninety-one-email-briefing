// Spacing the brand wants applied on top of the library markup. Kept here, not in
// the library files, so the source stays as designed and the preview and the
// sent email can never disagree.
const FIXES: Record<string, [from: string, to: string][]> = {
  // The greeting sits 30px above the next module and nothing more: no top
  // padding, and no extra paragraph margin stacking on the cell's bottom padding.
  Greeting: [
    ['padding: 30px 40px 30px 40px;', 'padding: 0px 40px 30px 40px;'],
    ['margin: 0px 0 15px;', 'margin: 0px;'],
  ],
}

export function fixModuleStyles(moduleName: string, html: string): string {
  return (FIXES[moduleName] ?? []).reduce((out, [from, to]) => out.split(from).join(to), html)
}
