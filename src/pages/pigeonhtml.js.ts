import { bundleScript } from '../lib/bundle'

/** The PigeonHTML post's editor, with Pigeon's sanitizer in it: loaded by that post alone. */
export const GET = () => bundleScript('src/scripts/try-pigeonhtml.ts')
