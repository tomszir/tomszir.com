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
  }),
})

const building = defineCollection({
  loader: glob({ base: './src/content/building', pattern: '**/*.md' }),
  schema: z.object({
    name: z.string(),
    /** The product's public address. Leave it out until the product's own site is public. */
    url: z.url().optional(),
    description: z.string(),
    with: z.string(),
    role: z.string(),
    status: z.string(),
    stack: z.string().optional(),
    order: z.number(),
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

export const collections = { writing, building, writeUps }
