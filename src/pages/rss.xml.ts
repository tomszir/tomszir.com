import { loadRenderers } from 'astro:container'
import { render } from 'astro:content'
import { getContainerRenderer } from '@astrojs/mdx/container-renderer'
import rss from '@astrojs/rss'
import type { APIContext } from 'astro'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { getPosts } from '../lib/posts'
import { site } from '../site'

export async function GET(context: APIContext) {
  const posts = await getPosts()
  const container = await AstroContainer.create({
    renderers: await loadRenderers([getContainerRenderer()]),
  })
  return rss({
    title: `${site.name}: writing`,
    description: 'Notes and essays on building software.',
    site: context.site ?? site.url,
    trailingSlash: false,
    items: await Promise.all(
      posts.map(async (post) => {
        const { Content } = await render(post)
        const html = await container.renderToString(Content)
        return {
          title: post.data.title,
          description: post.data.description,
          pubDate: post.data.published,
          link: `/writing/${post.id}`,
          // Feed readers resolve links against the feed, not the post, so root-relative ones are
          // made absolute.
          content: html.replace(/(href|src)="\//g, `$1="${site.url}/`),
        }
      }),
    ),
  })
}
