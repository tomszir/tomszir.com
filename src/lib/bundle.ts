import { build } from 'esbuild'

/**
 * A script bundled apart from the pages, served as its own file. Through Vite, a dynamic import
 * would bring a preload helper into every page's script, and an inline script or style would add
 * its hash to every page's Content-Security-Policy: bytes the home page's budget doesn't have. CSS
 * the script imports comes in as text, for a constructed stylesheet, which the policy allows.
 */
export async function bundleScript(entry: string): Promise<Response> {
  const { outputFiles } = await build({
    entryPoints: [entry],
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'es2022',
    loader: { '.css': 'text' },
    write: false,
  })
  return new Response(outputFiles[0]?.text, { headers: { 'Content-Type': 'text/javascript' } })
}
