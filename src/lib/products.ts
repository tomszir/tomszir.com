import { type CollectionEntry, getCollection } from 'astro:content'
import type { Lang } from '../i18n'

export type Product = CollectionEntry<'building'>

export async function getProducts(): Promise<Product[]> {
  const products = await getCollection('building')
  return products.sort((a, b) => a.data.order - b.data.order)
}

/** A product's description, who it's with, role and status in the page's language. */
export const productText = ({ data }: Product, lang: Lang) =>
  lang === 'lv'
    ? data.lv
    : { description: data.description, with: data.with, role: data.role, status: data.status }

export type WriteUp = CollectionEntry<'writeUps'>

/** A product's write-up, if it has one that should render in this build. */
export async function getWriteUp(product: Product): Promise<WriteUp | undefined> {
  const writeUps = await getCollection(
    'writeUps',
    ({ data }) => data.product === product.id && (import.meta.env.DEV || !data.draft),
  )
  return writeUps[0]
}

/** The labelled values shown for a product, in display order. */
export function productFacts(product: Product) {
  const { data } = product
  return [
    { label: 'With', value: data.with },
    { label: 'Role', value: data.role },
    ...(data.stack ? [{ label: 'Stack', value: data.stack }] : []),
  ]
}
