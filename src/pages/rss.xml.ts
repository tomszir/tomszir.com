import rss from '@astrojs/rss'
import type { APIContext } from 'astro'
import { getPosts } from '../lib/posts'
import { site } from '../site'

export async function GET(context: APIContext) {
  const posts = await getPosts()
  return rss({
    title: `${site.name}: writing`,
    description: 'Notes and essays on building software.',
    site: context.site ?? site.url,
    trailingSlash: false,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.published,
      link: `/writing/${post.id}`,
    })),
  })
}
