import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import { defineConfig, fontProviders } from 'astro/config'
import { subsets, unicodeRange } from './scripts/fonts.mjs'
import instrumentDark from './src/styles/code/instrument-dark.json' with { type: 'json' }
import instrumentLight from './src/styles/code/instrument-light.json' with { type: 'json' }

/** One @font-face per vendored subset of a family. */
const variants = (family, weight) =>
  Object.entries(subsets).map(([subset, text]) => ({
    src: [`./src/fonts/${family}-${subset}.woff2`],
    weight,
    style: 'normal',
    unicodeRange: unicodeRange(text),
  }))

export default defineConfig({
  site: 'https://tomszir.com',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      // The site's own palette, generated in both themes; see the site-design skill.
      themes: { light: instrumentLight, dark: instrumentDark },
      defaultColor: false,
      wrap: false,
    },
  },
  // Self-hosted, cut to the characters the site uses (scripts/vendor-fonts.mjs). Each file's
  // unicode-range comes from the same sets, so anything outside them falls back per character.
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Inter Tight',
      cssVariable: '--font-sans',
      fallbacks: ['system-ui', 'sans-serif'],
      options: { variants: variants('inter-tight', '400 600') },
    },
    {
      provider: fontProviders.local(),
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      fallbacks: ['ui-monospace', 'monospace'],
      options: { variants: variants('jetbrains-mono', '400 500') },
    },
  ],
})
