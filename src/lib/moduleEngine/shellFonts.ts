/** The brand's Display font file, as the library's own second Display rule already references it. */
export const DISPLAY_WOFF =
  'https://weare.ninetyone.com/l/28902/2020-04-27/8vjg6b/28902/241047/NinetyOneVisueltDisplay_Regular.woff'

/**
 * The library's master templates define Ninety One Visuelt Display twice: the normal-weight rule (the one
 * headings match) offers only an installed copy or a relative file that does not exist, and the real font
 * file sits on a second rule at weight 200 that headings never use. Without the font installed, every
 * heading fell back to Arial. Give the normal-weight rule the real file.
 */
export function fixShellFonts(head: string): string {
  return head.replace(/url\(\s*(['"])Ninety One Visuelt Display\.ttf\1\s*\)/g, `url("${DISPLAY_WOFF}")`)
}
