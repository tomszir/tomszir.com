// Checks the built site in dist/: every page has a language that matches its address (`lv` under
// /lv), a title, a description, one h1, a canonical URL without .html (that address redirects), a
// Content-Security-Policy, share tags with a 1200 by 630 card that exists in dist/, and JSON-LD
// that parses; translated pairs name each other with hreflang; the touch icon is 180 by 180 and
// the command menu's index parses; no page loads a resource from another origin; both home pages'
// HTML, CSS and JavaScript fit in 14 KB compressed, the first round trip of a new connection.
// Fonts are counted separately. Placeholders ([LIKE THIS]) are reported as warnings until they're
// filled.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateRawSync } from 'node:zlib'
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

/** A `<meta>` tag's content, by its `property` or `name`. */
const meta = (html, key) =>
  html.match(
    new RegExp(`<meta\\s+(?:property|name)=["']${key}["']\\s+content=["']([^"']*)["']`, 'i'),
  )?.[1]

/** A PNG's size as "width by height", or what's wrong with the file. */
function pngSize(path) {
  if (!existsSync(path)) return 'missing'
  const bytes = readFileSync(path)
  if (bytes.toString('latin1', 1, 4) !== 'PNG') return 'not a PNG'
  return `${bytes.readUInt32BE(16)} by ${bytes.readUInt32BE(20)}`
}

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

/** A page's `hreflang` alternates, as "lang url" strings, sorted. */
const alternates = (html) =>
  [...html.matchAll(/<link\b[^>]*rel=["']alternate["'][^>]*>/gi)]
    .map(([tag]) => [attribute(tag, 'hreflang'), attribute(tag, 'href')])
    .filter(([lang]) => lang)
    .map(([lang, href]) => `${lang} ${href}`)
    .sort()

/** The built page for one of the site's URLs: `/` is index.html, `/lv/cv` is lv/cv.html. */
const pageFor = (url) => {
  const path = new URL(url).pathname
  return `/${path === '/' ? 'index' : path.slice(1)}.html`
}

/** Names an anonymised CV must not print: the clients, their products and their domains. */
const CLIENT_NAMES = [
  /\bRode\b/,
  /DCS Flow/i,
  /Valsts kase/i,
  /State Treasury/i,
  /\bTIS2\b/,
  /elieta/i,
  /Patentu valde/i,
  /Patent Office/,
  /Tiesu administrācija/i,
  /POLICE CLIENT/,
]

/** One file out of a zip, such as `word/document.xml` out of a .docx, found by its central directory entry. */
function unzip(path, name) {
  const zip = readFileSync(path)
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  let entry = zip.readUInt32LE(end + 16)
  for (let i = 0; i < zip.readUInt16LE(end + 10); i++) {
    const method = zip.readUInt16LE(entry + 10)
    const size = zip.readUInt32LE(entry + 20)
    const nameLength = zip.readUInt16LE(entry + 28)
    const extra = zip.readUInt16LE(entry + 30) + zip.readUInt16LE(entry + 32)
    if (zip.toString('utf8', entry + 46, entry + 46 + nameLength) === name) {
      const local = zip.readUInt32LE(entry + 42)
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28)
      const data = zip.subarray(start, start + size)
      return (method === 8 ? inflateRawSync(data) : data).toString('utf8')
    }
    entry += 46 + nameLength + extra
  }
  return undefined
}

const errors = []
const warnings = []
const all = files(DIST)
const alternatesByPage = new Map()

for (const file of all.filter((path) => path.endsWith('.html'))) {
  const page = `/${relative(DIST, file)}`
  const html = readFileSync(file, 'utf8')

  const lang = html.match(/<html[^>]*\slang=["']([a-z-]+)["']/i)?.[1]
  const expected = /^\/lv(\/|\.html$)/.test(page) ? 'lv' : 'en'
  if (!lang) errors.push(`${page}: no lang on <html>`)
  else if (lang !== expected) errors.push(`${page}: lang is ${lang}, expected ${expected}`)
  alternatesByPage.set(page, alternates(html))
  if (!/<title>[^<]+<\/title>/i.test(html)) errors.push(`${page}: no <title>`)
  if (!/<meta\s+name=["']description["']\s+content=["'][^"']+["']/i.test(html)) {
    errors.push(`${page}: no meta description`)
  }
  const h1s = html.match(/<h1\b/gi)?.length ?? 0
  if (h1s !== 1) errors.push(`${page}: ${h1s} h1 elements, expected 1`)
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1]
  if (!canonical) errors.push(`${page}: no canonical URL`)
  else if (canonical.endsWith('.html')) errors.push(`${page}: canonical ${canonical} redirects`)

  const policy = html.match(
    /<meta\s+http-equiv="content-security-policy"\s+content="([^"]+)"/i,
  )?.[1]
  if (!policy?.includes("default-src 'self'")) errors.push(`${page}: no Content-Security-Policy`)

  for (const key of ['og:site_name', 'og:image:alt', 'twitter:card']) {
    if (!meta(html, key)) errors.push(`${page}: no ${key}`)
  }
  const card = meta(html, 'og:image')
  if (!card?.startsWith(`${ORIGIN}/`)) errors.push(`${page}: og:image ${card ?? 'missing'}`)
  else {
    const size = pngSize(join(DIST, card.slice(ORIGIN.length)))
    if (size !== '1200 by 630') errors.push(`${page}: card ${card} is ${size}`)
  }
  for (const [, json] of html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      JSON.parse(json)
    } catch {
      errors.push(`${page}: JSON-LD does not parse`)
    }
  }

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

// A translated pair names both versions and English as the default, and each names the same three.
for (const [page, links] of alternatesByPage) {
  if (links.length === 0) continue
  const langs = links.map((link) => link.split(' ')[0]).join(', ')
  if (langs !== 'en, lv, x-default')
    errors.push(`${page}: alternates ${langs}, expected en, lv, x-default`)
  for (const link of links) {
    const other = pageFor(link.split(' ')[1])
    const back = alternatesByPage.get(other)
    if (!back) errors.push(`${page}: alternate ${other} doesn't exist`)
    else if (back.join() !== links.join()) errors.push(`${page} and ${other}: alternates differ`)
  }
}

// The CV in Word, one per language, holding the same words as the page.
const cvTexts = new Map()
for (const file of ['cv.docx', 'lv/cv.docx']) {
  const xml = existsSync(join(DIST, file)) && unzip(join(DIST, file), 'word/document.xml')
  if (!xml) errors.push(`/${file}: missing or not a Word document`)
  else cvTexts.set(`/${file}`, xml.replace(/<[^>]+>/g, ''))
}

// While the CV is anonymised no client name may appear anywhere: pages, Word files, the search index.
if (readFileSync(join(DIST, 'cv.html'), 'utf8').includes('data-clients="anonymous"')) {
  const texts = [
    ...all
      .filter((path) => path.endsWith('.html'))
      .map((path) => [`/${relative(DIST, path)}`, visibleText(readFileSync(path, 'utf8'))]),
    ...cvTexts,
    ['/search.json', readFileSync(join(DIST, 'search.json'), 'utf8')],
  ]
  for (const [page, text] of texts) {
    for (const name of CLIENT_NAMES) {
      const found = text.match(name)?.[0]
      if (found) errors.push(`${page}: names the client "${found}" while the CV is anonymised`)
    }
  }
}

const touchIconSize = pngSize(join(DIST, 'apple-touch-icon.png'))
if (touchIconSize !== '180 by 180') errors.push(`/apple-touch-icon.png is ${touchIconSize}`)

// The command menu's index: every entry needs a title and somewhere to go or something to do.
try {
  const index = JSON.parse(readFileSync(join(DIST, 'search.json'), 'utf8'))
  if (
    !Array.isArray(index) ||
    index.some((entry) => !entry.title || !(entry.href || entry.action))
  ) {
    errors.push('/search.json: an entry without a title, href or action')
  }
} catch (error) {
  errors.push(`/search.json: ${error.code === 'ENOENT' ? 'missing' : 'does not parse'}`)
}

// Both home pages, English and Latvian, fit the budget.
const homeSummaries = ['index.html', 'lv.html'].map((file) => {
  const bytes = pageBytes(readFileSync(join(DIST, file), 'utf8'))
  const summary = `/${file}: ${(bytes / 1024).toFixed(1)} KB of HTML, CSS and JS compressed (budget ${HOME_BUDGET / 1024} KB)`
  if (bytes > HOME_BUDGET) errors.push(summary)
  return summary
})

for (const warning of warnings) console.warn(`warning  ${warning}`)
for (const error of errors) console.error(`error    ${error}`)
for (const summary of homeSummaries) console.log(summary)

if (errors.length > 0) {
  console.error(`check-dist: ${errors.length} error(s)`)
  process.exit(1)
}
console.log(`check-dist: ${all.filter((path) => path.endsWith('.html')).length} pages ok`)
