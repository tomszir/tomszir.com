/**
 * The site's palette as Aloft themes, in the format Aloft's settings import. The bar's panel is
 * the site's ground (`--bg`), and text, muted and accent are the tokens. The dark selected row sits
 * a step above `--raised`, so it shows at a glance. Every text pair passes Aloft's 4.5:1 check.
 */
export const aloftThemes = [
  {
    id: 'instrument-dark',
    theme: {
      name: 'Instrument Dark',
      scheme: 'dark',
      colors: {
        panel: '#0B0B0A',
        selected: '#1D1D1B',
        border: '#242422',
        text: '#E9E8E3',
        muted: '#8F8E88',
        accent: '#FF6B35',
      },
      radius: 16,
    },
  },
  {
    id: 'instrument-light',
    theme: {
      name: 'Instrument Light',
      scheme: 'light',
      colors: {
        panel: '#F7F7F5',
        selected: '#E5E5E0',
        border: '#DCDCD6',
        text: '#121212',
        muted: '#5F5F5B',
        accent: '#E8480C',
      },
      radius: 16,
    },
  },
] as const

/** A theme file's contents: what Aloft's "Export" writes and "Import" reads. */
export const aloftThemeFile = (theme: (typeof aloftThemes)[number]['theme']) =>
  `${JSON.stringify({ format: 'aloft-theme', version: 1, theme }, null, 2)}\n`

export const aloftPrivacy = {
  title: 'Aloft privacy policy',
  description:
    'What Aloft reads, what it keeps, and why nothing it reads ever leaves your browser.',
}
