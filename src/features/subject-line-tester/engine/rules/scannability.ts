import { charCount, wordCore } from '../text'
import { fail, pass, type Rule } from './types'

const OPENERS: Record<string, string> = { ')': '(', ']': '[', '}': '{' }

function bracketsBalanced(text: string): boolean {
  const stack: string[] = []
  for (const c of text) {
    if ('([{'.includes(c)) stack.push(c)
    else if (c in OPENERS && stack.pop() !== OPENERS[c]) return false
  }
  return stack.length === 0
}

export const scannabilityRules: Rule[] = [
  {
    id: 'SCN-01',
    category: 'scannability',
    label: 'Emoji restraint',
    run: ({ emoji, config }) => {
      const adjacent = emoji.some((e, i) => i > 0 && emoji[i - 1].end === e.start)
      if (emoji.length <= config.thresholds.emojiMax && !adjacent) return pass
      const reason = adjacent ? 'Two emoji sit side by side.' : `${emoji.length} emoji; at most ${config.thresholds.emojiMax} allowed.`
      return fail(reason, 'Use one well-placed emoji at most.')
    },
  },
  {
    id: 'SCN-02',
    category: 'scannability',
    label: 'Clean formatting',
    run: ({ rendered }) => {
      const issues: string[] = []
      if (rendered !== rendered.trim()) issues.push('leading or trailing space')
      if (/\s{2,}/.test(rendered.trim())) issues.push('double space')
      if (!bracketsBalanced(rendered)) issues.push('unbalanced brackets')
      if (((rendered.match(/"/g) ?? []).length) % 2 !== 0) issues.push('unbalanced quotes')
      return issues.length === 0
        ? pass
        : fail(`Formatting problems: ${issues.join(', ')}.`, 'Tidy spacing and close any brackets.')
    },
  },
  {
    id: 'SCN-03',
    category: 'scannability',
    label: 'Valid merge tags',
    run: ({ tags, broken }) => {
      const unknown = tags.filter((t) => !t.known)
      if (unknown.length === 0 && broken.length === 0) return pass
      const parts = [
        ...unknown.map((t) => `unknown field "${t.field}"`),
        ...broken.map((b) => `broken or unresolved tag "${b}"`),
      ]
      return fail(`Personalisation problems: ${parts.join(', ')}.`, 'Fix or remove the broken personalisation tag.')
    },
  },
  {
    id: 'SCN-04',
    category: 'scannability',
    label: 'Easy to read',
    run: ({ words, tags, config }) => {
      // An unresolved tag is reported by SCN-03; judging it here too would count one mistake twice.
      const unresolved = tags.filter((t) => !t.known)
      const judged = words.filter((w) => !unresolved.some((t) => w.start < t.renderedEnd && w.end > t.renderedStart))
      const lengths = judged.map((w) => ({ core: wordCore(w.text).core, len: charCount(wordCore(w.text).core) }))
      if (lengths.length === 0) return pass
      const longest = lengths.reduce((a, b) => (b.len > a.len ? b : a))
      const avg = lengths.reduce((n, w) => n + w.len, 0) / lengths.length
      if (longest.len > config.thresholds.longestWordMax) {
        return fail(`"${longest.core}" is ${longest.len} characters long.`, 'Swap long words for shorter ones.')
      }
      if (avg > config.thresholds.avgWordMax) {
        return fail(`Average word length is ${avg.toFixed(1)}; aim for ${config.thresholds.avgWordMax} or less.`, 'Swap long words for shorter ones.')
      }
      return pass
    },
  },
]
