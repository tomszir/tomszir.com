import { build } from 'esbuild'

/**
 * The command menu's script, bundled apart from the pages. Through Vite, its dynamic import would
 * bring a preload helper into every page's script: about a kilobyte, compressed, that the home
 * page's budget doesn't have.
 */
export async function GET() {
  const { outputFiles } = await build({
    entryPoints: ['src/scripts/command-menu.ts'],
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'es2022',
    loader: { '.css': 'text' },
    write: false,
  })
  return new Response(outputFiles[0]?.text, { headers: { 'Content-Type': 'text/javascript' } })
}
