// Moves each product's pinned release (`release` in src/content/building/) to the latest one its
// repository has published. A product with a demo (`tryIt`) moves only to a release that already
// carries the demo and its .sha256: the release is published before they're attached, and a page
// pinned to it would lose its Try it card. The pull request's build checks the demo's hash.
import { appendFileSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { WORKSPACE } from './lib.mjs'

const ENTRIES = join(WORKSPACE, 'src/content/building')
const RELEASE_URL = /^https:\/\/github\.com\/([^/]+\/[^/]+)\/releases\/tag\/v(.+)$/

const frontmatter = (text) => text.match(/^---\n([\s\S]*?)\n---/)[1]

/** A top-level key's indented lines, as `{ key: value }`. */
function block(yaml, key) {
  const body = yaml.match(new RegExp(`^${key}:\\n((?:[ \\t]+.*\\n?)*)`, 'm'))?.[1]
  if (!body) return undefined
  return Object.fromEntries(
    [...body.matchAll(/^[ \t]+(\w+):[ \t]*(.*)$/gm)].map(([, name, value]) => [name, value.trim()]),
  )
}

const parts = (version) => version.split('.').map(Number)
function newer(a, b) {
  const [x, y] = [parts(a), parts(b)]
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]
  return false
}

function warn(message) {
  console.warn(process.env.GITHUB_ACTIONS ? `::warning::${message}` : `warning: ${message}`)
}

async function latestRelease(repo) {
  const headers = { accept: 'application/vnd.github+json' }
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers })
  if (response.status === 404) return undefined
  if (!response.ok) throw new Error(`${repo}: HTTP ${response.status}`)
  return response.json()
}

const moved = []
for (const name of readdirSync(ENTRIES)
  .filter((file) => file.endsWith('.md'))
  .sort()) {
  const path = join(ENTRIES, name)
  const text = readFileSync(path, 'utf8')
  const yaml = frontmatter(text)
  const release = block(yaml, 'release')
  if (!release) continue
  const product = yaml.match(/^name:[ \t]*(.+)$/m)[1].trim()
  const [, repo, pinned] = release.url.match(RELEASE_URL)

  const latest = await latestRelease(repo)
  const version = latest?.tag_name.replace(/^v/, '')
  if (!version || !newer(version, pinned)) continue

  const asset = block(yaml, 'tryIt')?.asset
  if (asset) {
    const file = asset.replaceAll('{version}', version)
    const attached = new Set(latest.assets.map((attachment) => attachment.name))
    const missing = [file, `${file}.sha256`].filter((wanted) => !attached.has(wanted))
    if (missing.length) {
      warn(`${product} stays at ${pinned}: ${latest.tag_name} has no ${missing.join(' or ')} yet`)
      continue
    }
  }

  const pinnedYaml = yaml.replace(/^release:\n(?:[ \t]+.*\n?)*/m, (releaseBlock) =>
    releaseBlock
      .replace(/^([ \t]+version:[ \t]*).*$/m, `$1${version}`)
      .replace(/^([ \t]+url:[ \t]*.*\/releases\/tag\/v).*$/m, `$1${version}`),
  )
  writeFileSync(
    path,
    text.replace(yaml, () => pinnedYaml),
  )
  moved.push(`${product} ${version}`)
  console.log(`${product}: ${pinned} -> ${version}`)
}

if (!moved.length) console.log('Every product is on its latest release.')
if (process.env.GITHUB_OUTPUT)
  appendFileSync(process.env.GITHUB_OUTPUT, `moved=${moved.join(', ')}\n`)
