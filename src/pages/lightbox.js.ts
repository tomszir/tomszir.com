import { bundleScript } from '../lib/bundle'

/** The picture viewer's script, loaded by pages that show a gallery. */
export const GET = () => bundleScript('src/scripts/lightbox.ts')
