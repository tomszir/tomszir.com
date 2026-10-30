// Shared helpers for the repository scripts. Plain Node with no dependencies.
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const WORKSPACE = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Git run from a hook inherits GIT_DIR, which would point every call at the hook's repository.
function gitEnv() {
  const env = { ...process.env }
  delete env.GIT_DIR
  delete env.GIT_COMMON_DIR
  return env
}

export function git(cwd, ...args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: gitEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 1 << 28,
  }).trim()
}
