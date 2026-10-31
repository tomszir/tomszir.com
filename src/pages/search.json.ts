import { render } from 'astro:content'
import { getCards } from '../lib/cards'
import { getPosts } from '../lib/posts'
import { getProducts, getWriteUp } from '../lib/products'
import { site } from '../site'

/**
 * The command menu's index, fetched on first open: every page with a card, the `##` sections of
 * posts and write-ups, and the site's actions.
 */
export async function GET() {
  const pages = (await getCards()).map((card) => ({
    group: card.path.startsWith('writing/')
      ? 'Writing'
      : card.path.startsWith('building/')
        ? 'Building'
        : 'Pages',
    title: card.title,
    detail: card.description,
    href: card.path === 'index' ? '/' : `/${card.path}`,
  }))

  const articles = [
    ...(await getPosts()).map((post) => ({
      entry: post,
      title: post.data.title,
      href: `/writing/${post.id}`,
    })),
    ...(
      await Promise.all(
        (
          await getProducts()
        ).map(async (product) => {
          const writeUp = await getWriteUp(product)
          return writeUp
            ? [{ entry: writeUp, title: product.data.name, href: `/building/${product.id}` }]
            : []
        }),
      )
    ).flat(),
  ]
  const sections = (
    await Promise.all(
      articles.map(async ({ entry, title, href }) =>
        (
          await render(entry)
        ).headings
          .filter((heading) => heading.depth === 2)
          .map((heading) => ({
            group: 'Sections',
            title: heading.text,
            detail: title,
            href: `${href}#${heading.slug}`,
          })),
      ),
    )
  ).flat()

  const actions = [
    { group: 'Actions', title: 'Copy email', detail: site.email, action: 'copy-email' },
    { group: 'Actions', title: 'Switch theme', detail: 'Light or dark', action: 'theme' },
    {
      group: 'Actions',
      title: 'GitHub',
      detail: site.github.replace('https://', ''),
      href: site.github,
    },
    { group: 'Actions', title: 'RSS feed', detail: 'Every post, in full', href: '/rss.xml' },
    { group: 'Actions', title: 'Source', detail: 'This site on GitHub', href: site.source },
  ]

  return Response.json([...pages, ...actions, ...sections])
}
