// Vendors the icons in vendor/icons.lock.json into src/icons/ from their npm packages at the
// pinned versions. Each tarball's sha512 must match the lock. Review the diff like any other.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { WORKSPACE } from './lib.mjs'

const lock = JSON.parse(readFileSync(join(WORKSPACE, 'vendor', 'icons.lock.json'), 'utf8'))
const out = join(WORKSPACE, 'src', 'icons')
const scratch = mkdtempSync(join(tmpdir(), 'tomszir-icons-'))

/** One shape for every icon: 24 px viewBox, sized by CSS, coloured by currentColor. */
export function normalise(svg, style) {
  const body = svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<title>[\s\S]*?<\/title>/g, '')
    .replace(/<svg\b[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/\s*\n\s*/g, '')
    .trim()
  const paint =
    style === 'fill'
      ? 'fill="currentColor"'
      : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${paint}>${body}</svg>\n`
}

try {
  const extracted = {}
  for (const [id, source] of Object.entries(lock.sources)) {
    const dir = join(scratch, id)
    mkdirSync(dir)
    execFileSync(
      'npm',
      ['pack', `${source.package}@${source.version}`, '--pack-destination', dir, '--silent'],
      {
        stdio: ['ignore', 'pipe', 'inherit'],
      },
    )
    const tarball = join(
      dir,
      readdirSync(dir).find((name) => name.endsWith('.tgz')),
    )
    const integrity = `sha512-${createHash('sha512').update(readFileSync(tarball)).digest('base64')}`
    if (integrity !== source.integrity) {
      throw new Error(
        `${source.package}@${source.version}: integrity ${integrity} does not match the lock`,
      )
    }
    execFileSync('tar', ['xzf', tarball, '-C', dir])
    extracted[id] = join(dir, 'package')
  }

  rmSync(out, { recursive: true, force: true })
  mkdirSync(join(out, 'LICENSES'), { recursive: true })
  for (const [id, source] of Object.entries(lock.sources)) {
    writeFileSync(
      join(out, 'LICENSES', `${source.package}.txt`),
      readFileSync(join(extracted[id], source.license), 'utf8'),
    )
  }
  for (const icon of lock.icons) {
    const source = lock.sources[icon.source]
    const svg = readFileSync(
      join(extracted[icon.source], source.path.replace('{icon}', icon.name)),
      'utf8',
    )
    writeFileSync(join(out, `${icon.name}.svg`), normalise(svg, source.style))
    console.log(`vendored ${icon.name} (${source.package} ${source.version})`)
  }
} finally {
  rmSync(scratch, { recursive: true, force: true })
}
