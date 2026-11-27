import { bundleScript } from '../lib/bundle'

/** The diagrams' script, loaded by pages that show one. */
export const GET = () => bundleScript('src/scripts/diagram.ts')
