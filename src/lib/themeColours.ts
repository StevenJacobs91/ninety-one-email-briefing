export interface ThemeColours {
  primary: string
  accent: string
}

export const THEME_COLOURS: Record<string, ThemeColours> = {
  'leatherback-coral':     { primary: '#134848', accent: '#fbaa96' },
  'leatherback-yellowood': { primary: '#134848', accent: '#fcaa28' },
  'marula-gold':           { primary: '#0a3323', accent: '#cf6f13' },
  'marula-coral':          { primary: '#0a3323', accent: '#fbaa96' },
  'pinotage-coral':        { primary: '#591739', accent: '#fbaa96' },
  'springbok-red':         { primary: '#e8e5ce', accent: '#d83949' },
  'springbok-teal':        { primary: '#e8e5ce', accent: '#009d80' },
  'springbok-burgundy':    { primary: '#e8e5ce', accent: '#591739' },
  'agulhas-gold':          { primary: '#221b3b', accent: '#cf6f13' },
  'agulhas-teal':          { primary: '#221b3b', accent: '#009d80' },
  'agulhas-red':           { primary: '#221b3b', accent: '#d83949' },
  'agulhas-coral':         { primary: '#221b3b', accent: '#fbaa96' },
  'agulhas-yellowwood':    { primary: '#221b3b', accent: '#fcaa28' },
  'galjoen-coral':         { primary: '#74908d', accent: '#fbaa96' },
  'galjoen-green':         { primary: '#74908d', accent: '#134848' },
}

export function getThemeColours(themeId: string): ThemeColours {
  return THEME_COLOURS[themeId] ?? { primary: '#134848', accent: '#fbaa96' }
}
