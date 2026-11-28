import { bundleScript } from '../lib/bundle'

/** Loads the PigeonHTML post's editor as its section comes near: loaded by that post alone. */
export const GET = () => bundleScript('src/scripts/pigeonhtml-post.ts')
