import { readFileSync } from 'node:fs'
import type { APIRoute, GetStaticPaths } from 'astro'
import { getProducts } from '../../../lib/products'

/**
 * Each product's one-colour mark, which its card draws as a mask. Served beside the product's page
 * so the card's style attribute repeats its own link, which costs the home page next to nothing.
 */
export const getStaticPaths = (async () =>
  (await getProducts()).map((product) => ({
    params: { slug: product.id },
  }))) satisfies GetStaticPaths

export const GET: APIRoute = ({ params }) =>
  new Response(readFileSync(`src/assets/marks/${params.slug}.svg`), {
    headers: { 'Content-Type': 'image/svg+xml' },
  })
