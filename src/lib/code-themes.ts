import instrumentDark from '../styles/code/instrument-dark.json'
import instrumentLight from '../styles/code/instrument-light.json'

/**
 * The site's code themes, as astro:components' Code takes them, for code that a component writes
 * rather than a fenced block. JSON widens each theme's `type` to a string, so it's set again here.
 */
export const codeThemes = {
  light: { ...instrumentLight, type: 'light' as const },
  dark: { ...instrumentDark, type: 'dark' as const },
}
