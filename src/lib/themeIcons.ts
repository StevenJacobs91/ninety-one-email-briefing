// The icons a module can ask for by name, one image per brand theme, set in Settings → Brand Themes.
// Each is a variable in module code: {{iconClock}} becomes the selected theme's clock icon.

interface IconDef {
  key: string
  token: string
  label: string
  hint: string
  /** The file name of this icon in the theme's own library modules, used where Brand Themes has none set */
  find: RegExp
}

const file = (name: string) => new RegExp(`icon_[a-z0-9_]*${name}`, 'i')

export const THEME_ICONS = [
  { key: 'clock', token: 'iconClock', label: 'Clock', hint: '40×40 px', find: file('clock[a-z0-9_]*\\.png') },
  { key: 'calendar', token: 'iconCalendar', label: 'Calendar', hint: '40×40 px', find: file('calendar[a-z0-9_]*40x40\\.png') },
  { key: 'calendarLarge', token: 'iconCalendarLarge', label: 'Calendar (large)', hint: '119×119 px', find: file('calendar_119x119\\.png') },
  { key: 'location', token: 'iconLocation', label: 'Location', hint: '40×40 px', find: file('location[a-z0-9_]*\\.png') },
  { key: 'document', token: 'iconDocument', label: 'Document', hint: '40×40 px', find: file('document[a-z0-9_]*\\.png') },
  { key: 'arrow', token: 'iconArrow', label: 'Arrow (go)', hint: '20×20 px', find: /icon_(?:go_|[a-z0-9_]*web_link)[a-z0-9_]*\.png/i },
  { key: 'facebook', token: 'iconFacebook', label: 'Facebook', hint: '80×80 px', find: /icon_social_facebook[a-z0-9_]*\.png/i },
  { key: 'instagram', token: 'iconInstagram', label: 'Instagram', hint: '80×80 px', find: /icon_social_instagram[a-z0-9_]*\.png/i },
  { key: 'linkedin', token: 'iconLinkedin', label: 'LinkedIn', hint: '80×80 px', find: /icon_social_linkedin[a-z0-9_]*\.png/i },
  { key: 'youtube', token: 'iconYoutube', label: 'YouTube', hint: '80×80 px', find: /icon_social_youtube[a-z0-9_]*\.png/i },
  { key: 'spotify', token: 'iconSpotify', label: 'Spotify', hint: '80×80 px', find: /icon_social_spotify[a-z0-9_]*\.png/i },
  { key: 'applePodcasts', token: 'iconApplePodcasts', label: 'Apple Podcasts', hint: '80×80 px', find: /icon_social_apple_podcasts[a-z0-9_]*\.png/i },
] as const satisfies readonly IconDef[]

export type ThemeIconKey = typeof THEME_ICONS[number]['key']
export type ThemeIconToken = typeof THEME_ICONS[number]['token']

/** The 35-year logo of a theme, found in its own library when none is set (the badge on a header). */
export const ANNIVERSARY_FIND = /image_35_years_graphic[a-z0-9_]*\.png/i

/** The address of a library image: the whole URL around the file name `find` matches. */
export function libraryImage(html: string, find: RegExp): string | undefined {
  return html.match(new RegExp(`https?://[^"'\\s)<>]*${find.source}`, find.flags.replace('g', '')))?.[0]
}
