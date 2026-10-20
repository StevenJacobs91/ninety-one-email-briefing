import { fail, pass, type Rule } from './types'

export const lengthRules: Rule[] = [
  {
    id: 'LEN-01',
    category: 'length',
    label: 'Not too short',
    run: ({ chars, config }) =>
      chars >= config.thresholds.lengthMin
        ? pass
        : fail(`Only ${chars} characters; aim for at least ${config.thresholds.lengthMin}.`, 'Add a specific detail or benefit.'),
  },
  {
    id: 'LEN-02',
    category: 'length',
    label: 'Fits desktop inbox',
    run: ({ chars, config }) =>
      chars <= config.thresholds.desktopMax
        ? pass
        : fail(
            `${chars} characters; desktop inboxes cut off after about ${config.thresholds.desktopMax}.`,
            `Trim to ${config.thresholds.desktopMax} characters so it isn't cut off on desktop.`,
          ),
  },
  {
    id: 'LEN-03',
    category: 'length',
    label: 'Fits mobile inbox',
    run: ({ chars, config }) =>
      chars <= config.thresholds.mobileMax
        ? pass
        : fail(
            `${chars} characters; mobile shows roughly the first ${config.thresholds.mobileMax}.`,
            `Front-load the key message; mobile shows roughly the first ${config.thresholds.mobileMax} characters.`,
          ),
  },
  {
    id: 'LEN-04',
    category: 'length',
    label: 'Word count',
    run: ({ words, config }) => {
      const { wordsMin, wordsMax } = config.thresholds
      const n = words.length
      return n >= wordsMin && n <= wordsMax
        ? pass
        : fail(`${n} word${n === 1 ? '' : 's'}; aim for ${wordsMin} to ${wordsMax}.`, `Aim for ${wordsMin} to ${wordsMax} words.`)
    },
  },
]
