import { type Lang, localePath, type Text, t } from '../i18n'
import { site } from '../site'
import { getProducts, productText } from './products'

/** A label and its value, one per line. */
export interface Fact {
  label: string
  value: string
}

/** A client of a contractor, with the work done for it. */
export interface Client {
  name: string
  when: string
  highlights: string[]
}

/**
 * The CV in one language, with the client naming and availability settings applied. The page and
 * the Word file both print this, so they can't disagree.
 */
export async function getCv(lang: Lang) {
  const text = t(lang)
  const { availability, clients } = site
  const client = (item: {
    client: Text | { named: Text; anonymous: Text }
    when: string
    highlights: readonly Text[]
  }): Client => ({
    name: ('named' in item.client
      ? item.client[clients.named ? 'named' : 'anonymous']
      : item.client)[lang],
    when: item.when,
    highlights: item.highlights.map((highlight) => highlight[lang]),
  })
  const inLang = (value: string | Text) => (typeof value === 'string' ? value : value[lang])

  return {
    name: site.name,
    headline: site.headline[lang],
    summary: site.summary[lang],
    contact: [
      { label: site.email, href: `mailto:${site.email}` },
      { label: site.github.replace('https://', ''), href: site.github },
      { label: site.url.replace('https://', ''), href: `${site.url}${localePath(lang, '/')}` },
    ],
    availability: availability.open
      ? [
          { label: text.availability.status, value: text.availability.open },
          { label: text.availability.roles, value: availability.roles[lang] },
          { label: text.availability.where, value: availability.where[lang] },
          { label: text.availability.from, value: availability.from[lang] },
        ]
      : undefined,
    skills: site.skills.map((skill) => ({ label: skill.label[lang], value: inLang(skill.value) })),
    jobs: site.experience.map((job) => ({
      company: job.company,
      role: job.role[lang],
      years: job.years[lang],
      intro: job.intro[lang],
      highlights: job.highlights.map((highlight: Text) => highlight[lang]),
      clients: job.clients.map(client),
    })),
    building: [
      // A product made at a job under Experience is described there already.
      ...(await getProducts())
        .filter((product) => !site.experience.some((job) => job.company === product.data.with))
        .map((product) => {
          const words = productText(product, lang)
          return {
            name: product.data.name,
            href: `/building/${product.id}`,
            role: words.role,
            description: words.description,
          }
        }),
      {
        name: site.thisSite.name,
        href: site.source,
        role: site.thisSite.role[lang],
        description: site.thisSite.description[lang],
      },
    ],
    languages: site.languages.map((language) => ({
      label: language.label[lang],
      value: language.value[lang],
    })),
    education: site.education.map((study) => ({
      school: study.school[lang],
      field: study.field[lang],
      years: study.years,
      note: study.note[lang],
    })),
  }
}
