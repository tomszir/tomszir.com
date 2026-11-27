import { bundleScript } from '../lib/bundle'

/** The "Try it" button's script, loaded by product pages with a demo. */
export const GET = () => bundleScript('src/scripts/try.ts')
