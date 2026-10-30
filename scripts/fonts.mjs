// The character sets the vendored fonts are cut to, shared by the vendoring script and the font
// config, so the files and their unicode-range can never disagree.
import { readFileSync } from 'node:fs'

const lock = JSON.parse(readFileSync(new URL('../vendor/fonts.lock.json', import.meta.url), 'utf8'))

const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('')

/** Characters kept per subset: the Latin file holds ASCII and the symbols, Latin Extended the Latvian letters. */
export const subsets = { latin: ascii + lock.symbols, 'latin-ext': lock.latvian }

export const families = lock.families

/** `unicode-range` values for a set of characters, with runs of code points merged. */
export function unicodeRange(text) {
  const points = [...new Set([...text].map((c) => c.codePointAt(0)))].sort((a, b) => a - b)
  const ranges = []
  for (const p of points) {
    const last = ranges.at(-1)
    if (last && p === last[1] + 1) last[1] = p
    else ranges.push([p, p])
  }
  const hex = (n) => n.toString(16).toUpperCase().padStart(4, '0')
  return ranges.map(([a, b]) => (a === b ? `U+${hex(a)}` : `U+${hex(a)}-${hex(b)}`))
}
