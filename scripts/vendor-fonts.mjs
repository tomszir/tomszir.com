// Vendors the fonts in vendor/fonts.lock.json into src/fonts/: packs each source package at its
// pinned version, checks its sha512 against the lock, and cuts its Latin and Latin Extended files
// down to the characters in scripts/fonts.mjs. Review the diff like any other.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import subsetFont from 'subset-font'
import { families, subsets } from './fonts.mjs'
import { WORKSPACE } from './lib.mjs'

const out = join(WORKSPACE, 'src', 'fonts')
const scratch = mkdtempSync(join(tmpdir(), 'tomszir-fonts-'))

try {
  rmSync(out, { recursive: true, force: true })
  mkdirSync(join(out, 'LICENSES'), { recursive: true })

  for (const family of families) {
    const dir = join(scratch, family.name)
    mkdirSync(dir)
    execFileSync(
      'npm',
      ['pack', `${family.package}@${family.version}`, '--pack-destination', dir, '--silent'],
      { stdio: ['ignore', 'pipe', 'inherit'] },
    )
    const tarball = join(
      dir,
      readdirSync(dir).find((name) => name.endsWith('.tgz')),
    )
    const integrity = `sha512-${createHash('sha512').update(readFileSync(tarball)).digest('base64')}`
    if (integrity !== family.integrity) {
      throw new Error(
        `${family.package}@${family.version}: integrity ${integrity} does not match the lock`,
      )
    }
    execFileSync('tar', ['xzf', tarball, '-C', dir])
    const files = join(dir, 'package', 'files')

    for (const [subset, text] of Object.entries(subsets)) {
      const source = readFileSync(join(files, `${family.name}-${subset}-wght-normal.woff2`))
      const [min, max] = family.weight
      const cut = await subsetFont(source, text, {
        targetFormat: 'woff2',
        variationAxes: { wght: { min, max } },
      })
      writeFileSync(join(out, `${family.name}-${subset}.woff2`), cut)
      console.log(
        `${family.name}-${subset}: ${(source.length / 1024).toFixed(1)} KB -> ${(cut.length / 1024).toFixed(1)} KB`,
      )
    }
    writeFileSync(
      join(out, 'LICENSES', `${family.name}.txt`),
      readFileSync(join(dir, 'package', 'LICENSE'), 'utf8'),
    )
  }
} finally {
  rmSync(scratch, { recursive: true, force: true })
}
