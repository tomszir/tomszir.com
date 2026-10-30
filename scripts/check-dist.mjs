// Checks the built site in dist/: every page has a language, a title, a description and one h1;
// no page loads a resource from another origin; the home page's HTML, CSS and JavaScript fit in
// 14 KB compressed, the first round trip of a new connection. Fonts are counted separately.
// Placeholders ([LIKE THIS]) are reported as warnings until they're filled.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pageBytes } from './stamp-build.mjs'

const DIST = fileURLToPath(new URL('../dist', import.meta.url))
const ORIGIN = 'https://tomszir.com'
const HOME_BUDGET = 14 * 1024
const RESOURCE_RELS = new Set(['stylesheet', 'preload', 'modulepreload', 'icon', 'manifest'])

const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })

const attribute = (tag, name) => tag.match(new RegExp(`\\s${name}=["']([^"']*)["']`, 'i'))?.[1]

const isForeign = (url) => /^(https?:)?\/\//i.test(url) && !url.startsWith(ORIGIN)

/** The URLs a page loads, as opposed to the ones it links to. */
function resources(html) {
  const urls = []
  for (const [tag, name] of html.matchAll(
    /<(script|img|source|iframe|link|video|audio)\b[^>]*>/gi,
  )) {
    if (name.toLowerCase() === 'link') {
      const rels = (attribute(tag, 'rel') ?? '').toLowerCase().split(/\s+/)
      if (!rels.some((rel) => RESOURCE_RELS.has(rel))) continue
      urls.push(attribute(tag, 'href'))
    } else {
      urls.push(attribute(tag, 'src'))
      const srcset = attribute(tag, 'srcset')
      if (srcset)
        urls.push(...srcset.split(',').map((candidate) => candidate.trim().split(/\s+/)[0]))
    }
  }
  return urls.filter(Boolean)
}

const visibleText = (html) =>
  html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')

const errors = []
const warnings = []
const all = files(DIST)

for (const file of all.filter((path) => path.endsWith('.html'))) {
  const page = `/${relative(DIST, file)}`
  const html = readFileSync(file, 'utf8')

  if (!/<html[^>]*\slang=["'][a-z-]+["']/i.test(html)) errors.push(`${page}: no lang on <html>`)
  if (!/<title>[^<]+<\/title>/i.test(html)) errors.push(`${page}: no <title>`)
  if (!/<meta\s+name=["']description["']\s+content=["'][^"']+["']/i.test(html)) {
    errors.push(`${page}: no meta description`)
  }
  const h1s = html.match(/<h1\b/gi)?.length ?? 0
  if (h1s !== 1) errors.push(`${page}: ${h1s} h1 elements, expected 1`)

  for (const url of resources(html)) {
    if (isForeign(url)) errors.push(`${page}: loads ${url} from another origin`)
  }

  if (html.includes('data-build="page-kb"')) {
    const stamped = html.match(/data-build="page-kb"[^>]*value="([\d.]+)"/)?.[1]
    const measured = pageBytes(html) / 1024
    if (!stamped || Math.abs(Number(stamped) - measured) > 0.1) {
      errors.push(`${page}: prints ${stamped ?? 'no'} KB but weighs ${measured.toFixed(1)} KB`)
    }
  }

  const placeholders = new Set(visibleText(html).match(/\[[A-Z][A-Z0-9 ,.'-]*\]/g))
  if (placeholders.size > 0) warnings.push(`${page}: placeholders ${[...placeholders].join(', ')}`)
}

for (const file of all.filter((path) => path.endsWith('.css'))) {
  for (const [, url] of readFileSync(file, 'utf8').matchAll(/url\(\s*["']?([^"')]+)/g)) {
    if (isForeign(url)) errors.push(`/${relative(DIST, file)}: loads ${url} from another origin`)
  }
}

const home = readFileSync(join(DIST, 'index.html'), 'utf8')
const homeBytes = pageBytes(home)
const homeSummary = `home page: ${(homeBytes / 1024).toFixed(1)} KB of HTML, CSS and JS compressed (budget ${HOME_BUDGET / 1024} KB)`
if (homeBytes > HOME_BUDGET) errors.push(homeSummary)

for (const warning of warnings) console.warn(`warning  ${warning}`)
for (const error of errors) console.error(`error    ${error}`)
console.log(homeSummary)

if (errors.length > 0) {
  console.error(`check-dist: ${errors.length} error(s)`)
  process.exit(1)
}
console.log(`check-dist: ${all.filter((path) => path.endsWith('.html')).length} pages ok`)
