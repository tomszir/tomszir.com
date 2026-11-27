import type { GetStaticPaths } from 'astro'
import { getProducts, productDemo } from '../../../lib/products'

/**
 * Each product's demo, served from this site under its versioned name. Fetched and checked at
 * build (src/lib/demo.ts); a product without one has no file here.
 */
export const getStaticPaths = (async () => {
  const products = await getProducts()
  const demos = await Promise.all(
    products.map(async (product) => [product, await productDemo(product)] as const),
  )
  return demos.flatMap(([product, demo]) =>
    demo
      ? [
          {
            params: { slug: product.id, demo: demo.file.replace(/\.js$/, '') },
            props: { code: demo.code },
          },
        ]
      : [],
  )
}) satisfies GetStaticPaths

export const GET = ({ props }: { props: { code: string } }) =>
  new Response(props.code, { headers: { 'Content-Type': 'text/javascript' } })
