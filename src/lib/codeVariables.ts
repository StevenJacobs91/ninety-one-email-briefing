import { THEME_ICONS } from './themeIcons'

export const CODE_VARIABLE_GROUPS = ['Colours', 'Images', 'Icons', 'Pardot', 'Links'] as const
export type CodeVariableGroup = typeof CODE_VARIABLE_GROUPS[number]

/**
 * Something the code can use: a {{variable}} the theme fills in, or an attribute (Pardot's own, or one of the
 * builder's markers) that goes inside a tag. An attribute has a `snippet`, the text that is put in the code.
 */
export interface CodeVariable {
  token: string
  label: string
  group: CodeVariableGroup
  snippet?: string
}

const attribute = (group: 'Pardot' | 'Links', snippet: string, label: string): CodeVariable => ({ token: snippet, snippet, label, group })

const ALL: readonly CodeVariable[] = [
  { token: 'primary', label: 'Primary colour', group: 'Colours' },
  { token: 'accent', label: 'Accent colour', group: 'Colours' },
  { token: 'tint01', label: 'Tint 1', group: 'Colours' },
  { token: 'tint02', label: 'Tint 2', group: 'Colours' },
  { token: 'tint03', label: 'Tint 3', group: 'Colours' },
  { token: 'text', label: 'Text colour: cream on a dark theme, charcoal on a light one', group: 'Colours' },
  { token: 'logo', label: 'Header logo', group: 'Images' },
  { token: 'stripe', label: 'Stripe', group: 'Images' },
  { token: 'slimStripe', label: 'Slim stripe', group: 'Images' },
  { token: 'footerLogo', label: 'Footer logo', group: 'Images' },
  { token: 'anniversary', label: '35 year logo', group: 'Images' },
  { token: 'heroImage', label: 'Header background image', group: 'Images' },
  ...THEME_ICONS.map((i): CodeVariable => ({ token: i.token, label: `${i.label} icon`, group: 'Icons' })),
  attribute('Pardot', 'pardot-region="paragraph"', 'Editable rich text'),
  attribute('Pardot', 'pardot-region="button"', 'Editable button: its words and its link'),
  attribute('Pardot', 'pardot-region="editable-image"', 'Editable image'),
  attribute('Pardot', 'pardot-region="subheading"', 'Editable sub-heading'),
  attribute('Pardot', 'pardot-region="detail"', 'Editable detail text'),
  attribute('Pardot', 'pardot-region="heading"', 'Editable heading (an article\'s title)'),
  attribute('Pardot', 'pardot-region="category"', 'Editable category title (an article\'s topic)'),
  attribute('Pardot', 'pardot-region="blurb"', 'Editable blurb (an article\'s summary)'),
  attribute('Pardot', 'pardot-region-type="simple"', 'Pardot region type: plain text'),
  attribute('Pardot', 'pardot-region-type="link"', 'Pardot region type: link'),
  attribute('Pardot', 'pardot-region-type="image"', 'Pardot region type: image'),
  attribute('Pardot', 'pardot-repeatable="article"', 'Marks the repeating unit: it can be added again in the builder. Name it for what repeats'),
  attribute('Pardot', 'pardot-removable="button"', 'Pardot lets this section be removed. Name it for the section'),
  attribute('Links', 'data-link="article"', 'Links with the same name share one URL, set once in the builder'),
  attribute('Links', 'data-utm-content="top-banner"', 'Names this link in its utm_content, in place of the one worked out from where it is'),
]

/** What the code is: a header can also ask for the email's own background image, and only module and header code takes attributes. */
export type CodeKind = 'module' | 'header' | 'fragment'

/** What code of this kind can use, grouped in the order Colours, Images, Icons, Pardot, Links. */
export function codeVariables(kind: CodeKind): readonly CodeVariable[] {
  return ALL.filter((v) => {
    if (v.token === 'heroImage') return kind === 'header'
    return v.snippet === undefined || kind !== 'fragment'
  })
}

/** The text that goes in the code: {{token}} for a variable, the snippet itself for an attribute. */
export function variableText(v: CodeVariable): string {
  return v.snippet ?? `{{${v.token}}}`
}

/**
 * The text to put at the cursor. An attribute is given a space before it when it would touch the tag name or another
 * attribute, and one after when it would touch the next attribute; a variable goes in exactly as it is.
 */
export function insertionText(before: string, after: string, text: string, isAttribute: boolean): string {
  if (!isAttribute) return text
  const lead = before !== '' && !/\s$/.test(before) ? ' ' : ''
  const trail = after !== '' && !/^[\s>/]/.test(after) ? ' ' : ''
  return `${lead}${text}${trail}`
}
