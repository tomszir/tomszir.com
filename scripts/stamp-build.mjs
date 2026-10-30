// Writes the build's facts into the built pages: the commit, the build date, and each page's
// own compressed size (its HTML plus the CSS and JS it loads, gzipped), so the numbers the site
// prints are measured, not typed. Runs after `astro build`.
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const DIST = fileURLToPath(new URL('../dist', import.meta.url))
export const BUDGET_KB = 14

const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })

const gzipped = (buffer) => gzipSync(buffer, { level: 9 }).length

/** Compressed bytes of a page and the stylesheets and scripts it loads from this site. */
export function pageBytes(html, dist = DIST) {
  const urls = [
    ...[...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)],
    ...[...html.matchAll(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["']/gi)],
    ...[...html.matchAll(/<script\b[^>]*\ssrc=["']([^"']+)["']/gi)],
  ]
    .map((match) => match[1])
    .filter((url) => url.startsWith('/'))
  return [...new Set(urls)].reduce(
    (sum, url) => sum + gzipped(readFileSync(join(dist, url))),
    gzipped(Buffer.from(html)),
  )
}

function commit() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim()
  } catch {
    return 'uncommitted'
  }
}

const fill = (html, name, value) =>
  html.replace(
    new RegExp(`(<data\\b[^>]*data-build="${name}"[^>]*>)[^<]*(</data>)`, 'g'),
    (_, open, close) => `${open.replace(/value="[^"]*"/, `value="${value}"`)}${value}${close}`,
  )

/** Points the links around a commit stamp at that commit; they link to the branch until then. */
const linkCommit = (html, sha) =>
  html.replace(/<a\b[^>]*data-build-link="commit"[^>]*>/g, (tag) =>
    tag.replace(/href="([^"]*)\/commits\/main"/, `href="$1/commit/${sha}"`),
  )

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const now = new Date()
  const facts = {
    commit: commit(),
    date: new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Europe/Riga',
    }).format(now),
  }

  for (const file of files(DIST).filter((path) => path.endsWith('.html'))) {
    let html = readFileSync(file, 'utf8')
    if (!html.includes('data-build=')) continue
    html = fill(html, 'commit', facts.commit)
    if (facts.commit !== 'uncommitted') html = linkCommit(html, facts.commit)
    html = fill(html, 'date', facts.date)
    // Writing the size in changes the size; a second pass settles it.
    for (let pass = 0; pass < 2; pass++) {
      const kb = (pageBytes(html) / 1024).toFixed(1)
      const percent = Math.min(100, (Number(kb) / BUDGET_KB) * 100).toFixed(0)
      html = fill(html, 'page-kb', kb).replace(
        /(data-build-fill[^>]*style=["']--fill:\s*)[^;"']*/g,
        `$1${percent}%`,
      )
    }
    writeFileSync(file, html)
  }
  console.log(`stamp-build: ${facts.commit}, ${facts.date}`)
}
