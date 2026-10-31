import { site } from '../site'
import type { Post } from './posts'

const CONTEXT = 'https://schema.org'

const person = {
  '@type': 'Person',
  name: site.name,
  jobTitle: site.facts.find((fact) => fact.label === 'Role')?.value,
  url: `${site.url}/`,
  email: `mailto:${site.email}`,
  sameAs: [site.github],
}

/** Toms, for the home page and the CV. */
export const personData = { '@context': CONTEXT, ...person }

/** A post, with the same URL and card the page's head points to. */
export function postData(post: Post) {
  const url = `${site.url}/writing/${post.id}`
  const { title, description, published, updated } = post.data
  return {
    '@context': CONTEXT,
    '@type': 'BlogPosting',
    headline: title,
    description,
    datePublished: published.toISOString(),
    dateModified: (updated ?? published).toISOString(),
    author: person,
    url,
    mainEntityOfPage: url,
    image: `${site.url}/og/writing/${post.id}.png`,
  }
}
