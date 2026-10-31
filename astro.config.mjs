import { readdirSync, readFileSync } from 'node:fs'
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

/**
 * Each post's sitemap date: `updated` when set, else `published`. Read from the front matter,
 * since the config can't use the content collections.
 */
const postDates = new Map(
  readdirSync('./src/content/writing')
    .filter((file) => /\.mdx?$/.test(file))
    .map((file) => {
      const source = readFileSync(`./src/content/writing/${file}`, 'utf8')
      const field = (name) => source.match(new RegExp(`^${name}:\\s*['"]?([\\d-]+)`, 'm'))?.[1]
      const date = field('updated') ?? field('published')
      return [`https://tomszir.com/writing/${file.replace(/\.mdx?$/, '')}`, date]
    }),
)

export default defineConfig({
  site: 'https://tomszir.com',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  // A per-page policy with hashes of that page's scripts and style elements. Style attributes
  // stay allowed: Shiki colours code with them, and pages set view-transition names and
  // build-fill values the same way. Frame and transport rules are headers (public/_headers).
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'",
      ],
      styleDirective: { resources: [{ resource: "'unsafe-inline'", kind: 'attribute' }] },
    },
  },
  integrations: [
    mdx(),
    sitemap({
      serialize: (item) => {
        const date = postDates.get(item.url)
        return date ? { ...item, lastmod: new Date(date).toISOString() } : item
      },
    }),
  ],
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
