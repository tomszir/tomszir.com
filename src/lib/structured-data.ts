import { type Lang, t } from '../i18n'
import { site } from '../site'
import type { Post } from './posts'

const CONTEXT = 'https://schema.org'

const person = {
  '@type': 'Person',
  name: site.name,
  jobTitle: site.role.en,
  url: `${site.url}/`,
  email: `mailto:${site.email}`,
  sameAs: [site.github],
}

/** Toms, for the home page and the CV; while he's open to work, the role he's looking for. */
export function personData(lang: Lang) {
  const { availability } = site
  const { availability: labels } = t(lang)
  return {
    '@context': CONTEXT,
    ...person,
    jobTitle: site.role[lang],
    ...(availability.open && {
      seeks: {
        '@type': 'Demand',
        name: availability.roles[lang],
        areaServed: availability.where[lang],
        description: `${labels.open}. ${labels.from}: ${availability.from[lang]}.`,
      },
    }),
  }
}

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
