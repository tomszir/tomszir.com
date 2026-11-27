import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const writing = defineCollection({
  loader: glob({ base: './src/content/writing', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    /** A post set in its subject's own type, from `public/looks/<look>/<look>.css`. */
    look: z.enum(['pigeon']).optional(),
  }),
})

/** A brand icon for a button, from src/icons/: the store or site the button goes to. */
const brand = z.enum(['googlechrome', 'firefoxbrowser', 'github']).optional()

const building = defineCollection({
  loader: glob({ base: './src/content/building', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      /** The product's public address. Leave it out until the product's own site is public. */
      url: z.url().optional(),
      /** Where to get it, such as store listings: buttons in place of `url`, the first primary. */
      install: z.array(z.object({ label: z.string(), url: z.url(), icon: brand })).default([]),
      /** A post about the product, by its slug: linked from the page while it's published. */
      post: z.string().optional(),
      /**
       * A card inviting the visitor to try the product on the page, in a demo published with each
       * release (src/lib/demo.ts): `asset` is its file's name, `{version}` standing for the
       * release's, and `checkout` the product's local build of it, used on the dev server.
       */
      tryIt: z
        .object({
          title: z.string(),
          text: z.string(),
          label: z.string(),
          asset: z.string(),
          checkout: z.string().optional(),
        })
        .optional(),
      /** The latest release, shown as the Version fact and linked to its notes. */
      release: z.object({ version: z.string(), url: z.url() }).optional(),
      /** References after the buttons, as plain links. `url` may be a path on this site. */
      links: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
      /**
       * The product's app icon, square, in its own colours: shown on its page. Its card shows the
       * one-colour mark from `src/assets/marks/<id>.svg` instead.
       */
      icon: image(),
      /**
       * Its share card, a 1200 by 630 PNG, as a path from the repository root. Without one, the
       * card is drawn from the template like every other page's.
       */
      card: z.string().optional(),
      /** Pictures of the product, the first shown wide. Paths are relative to the entry. */
      images: z.array(z.object({ src: image(), alt: z.string() })).default([]),
      description: z.string(),
      with: z.string(),
      role: z.string(),
      status: z.string(),
      stack: z.string().optional(),
      order: z.number(),
      /** The words of the card in Latvian, for the Latvian pages; the product page stays English. */
      lv: z.object({
        description: z.string(),
        with: z.string(),
        role: z.string(),
        status: z.string(),
      }),
    }),
})

/** The long write-up for a product, kept apart from its facts; one file per product id. */
const writeUps = defineCollection({
  loader: glob({ base: './src/content/write-ups', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    product: z.string(),
    /** A draft shows on the dev server only. */
    draft: z.boolean().default(false),
  }),
})

/**
 * Policies kept in a product's own repository, fetched at build so the page here never drifts from
 * the one the store listings and the extension link to. A failed fetch fails the build.
 */
const policies = defineCollection({
  loader: {
    name: 'policies',
    load: async ({ store, renderMarkdown }) => {
      const repository = 'https://github.com/tomszir/aloft-extension'
      const response = await fetch(
        'https://raw.githubusercontent.com/tomszir/aloft-extension/main/PRIVACY.md',
      )
      if (!response.ok) throw new Error(`Aloft's PRIVACY.md: HTTP ${response.status}`)
      const body = (await response.text())
        // The page prints its own title.
        .replace(/^# .*\n+/, '')
        // Links into the repository, made absolute.
        .replace(/\]\((?!https?:|mailto:|#)([^)]+)\)/g, `](${repository}/blob/main/$1)`)
      store.clear()
      store.set({ id: 'aloft', data: {}, body, rendered: await renderMarkdown(body) })
    },
  },
})

export const collections = { writing, building, writeUps, policies }
