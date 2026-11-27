import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * A product's web demo: one self-contained script published with each of its GitHub releases,
 * with its SHA-256 beside it. The build fetches the one for the release a product's page pins,
 * checks it against the hash and serves it from this site, so visitors never contact GitHub.
 * Nothing is committed here.
 *
 * A release from before the demo has no such file: the product then shows no "Try it" card, and
 * the build says so. Any other failure, a hash that doesn't match above all, fails the build.
 *
 * `DEMO_DIR` points at a local build of it instead (Aloft's `.output/demo`); on the dev server,
 * the product's checkout next to this repository is used when it has one, so a demo can be tried
 * here before it's released.
 */
export interface Demo {
  /** The file's name, which carries its version: a new release is a new address. */
  file: string
  code: string
}

const loaded = new Map<string, Promise<Demo | undefined>>()

/**
 * The demo for a release. `asset` names the file, with `{version}` for the version, and
 * `release` is the release's page, `https://github.com/<owner>/<repo>/releases/tag/v<version>`.
 */
export function loadDemo(
  asset: string,
  release: { version: string; url: string },
  checkout?: string,
): Promise<Demo | undefined> {
  const file = asset.replaceAll('{version}', release.version)
  const key = `${release.url} ${file}`
  let demo = loaded.get(key)
  if (!demo) {
    demo = fetchDemo(file, release.url, checkout)
    loaded.set(key, demo)
  }
  return demo
}

/** The `sha256sum` line's hash, for the file it names. */
function expectedHash(line: string, file: string) {
  const match = line.trim().match(/^([0-9a-f]{64}) [ *](.+)$/)
  if (!match || match[2] !== file) throw new Error(`${file}.sha256 isn't a hash of ${file}`)
  return match[1]
}

function verified(file: string, code: string, sums: string): Demo {
  const actual = createHash('sha256').update(code).digest('hex')
  if (actual !== expectedHash(sums, file)) {
    throw new Error(`${file} doesn't match its SHA-256: refusing to serve it`)
  }
  return { file, code }
}

async function fetchDemo(file: string, releaseUrl: string, checkout?: string) {
  const local =
    process.env.DEMO_DIR ??
    (import.meta.env.DEV && checkout && existsSync(checkout) ? checkout : undefined)
  if (local) {
    const path = join(local, file)
    if (!existsSync(path)) {
      console.warn(`[demo] ${path} isn't built: no Try it card. Run pnpm demo:build there.`)
      return undefined
    }
    return verified(file, readFileSync(path, 'utf8'), readFileSync(`${path}.sha256`, 'utf8'))
  }
  const base = releaseUrl.replace('/releases/tag/', '/releases/download/')
  const get = async (name: string) => {
    const response = await fetch(`${base}/${name}`)
    if (response.status === 404) return undefined
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`)
    return response.text()
  }
  const [code, sums] = await Promise.all([get(file), get(`${file}.sha256`)])
  if (code === undefined || sums === undefined) {
    console.warn(`[demo] ${releaseUrl} has no ${file}: no Try it card.`)
    return undefined
  }
  return verified(file, code, sums)
}
