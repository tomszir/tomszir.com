/**
 * The interface in English and Latvian. English pages keep their addresses; Latvian ones live
 * under `/lv`. Posts and product pages are English only (see `translated`).
 */
export const langs = ['en', 'lv'] as const
export type Lang = (typeof langs)[number]

/** A value written in both languages. */
export type Text = Record<Lang, string>

/** A page's language, from its path: everything under `/lv` is Latvian. */
export const langOf = (path: string): Lang => (/^\/lv(\/|\.html$|$)/.test(path) ? 'lv' : 'en')

/** An English path in the given language: `/cv` is `/lv/cv`, `/` is `/lv`. */
export const localePath = (lang: Lang, path: string) =>
  lang === 'en' ? path : path === '/' ? '/lv' : `/lv${path}`

/** A path without its language: `/lv/cv` is `/cv`, `/lv` is `/`. */
export const englishPath = (path: string) => path.replace(/^\/lv(?=\/|$)/, '') || '/'

/** The pages that exist in both languages, by their English path. */
export const translated = ['/', '/building', '/writing', '/cv', '/contact']

/** `getStaticPaths` for a page in `src/pages/[...lang]/`: the English page and the Latvian one. */
export const langPaths = () => [{ params: { lang: undefined } }, { params: { lang: 'lv' } }]

/**
 * Where the language switch leads from `path` to `lang`: the same page when it's translated,
 * else the section it belongs to, else the home page.
 */
export function switchPath(path: string, lang: Lang) {
  const english = englishPath(path)
  if (translated.includes(english)) return localePath(lang, english)
  const section = translated.find((page) => page !== '/' && english.startsWith(`${page}/`))
  return localePath(lang, section ?? '/')
}

const en = {
  skip: 'Skip to content',
  home: 'home',
  nav: { building: 'Building', writing: 'Writing', cv: 'CV', contact: 'Contact' },
  primary: 'Primary',
  menu: 'Menu',
  close: 'Close',
  search: 'Search',
  language: 'Language',
  theme: { idle: 'Switch theme', dark: 'Switch to dark theme', light: 'Switch to light theme' },
  footer: {
    email: 'Email',
    built: 'Built',
    from: 'from',
    measured: 'Every number here is measured at build time or computed in your browser.',
    source: 'Source',
  },
  intro:
    "I build software and care about how it's made. Developer in Latvia, writing code since I was ten and for a living for five years. Here's what's true right now.",
  now: {
    label: 'Now',
    building: 'Now building',
    side: 'On the side',
    latest: 'Latest post',
    firstPost: 'The first post is on its way.',
    subscribe: 'Subscribe via RSS to get it',
    time: 'Local time',
    sun: 'sun',
    above: 'above the horizon',
    below: 'below the horizon',
    page: 'This page',
    budget: 'KB of a 14 KB budget',
    build: 'Last build',
    from: 'from',
  },
  allWriting: 'All writing',
  availability: {
    label: 'Availability',
    open: 'Open to work',
    status: 'Status',
    roles: 'Roles',
    where: 'Where',
    from: 'From',
    email: 'Email me about a role',
  },
  product: { role: 'Role', status: 'Status' },
  empty: {
    nothing: 'Nothing published yet.',
    onItsWay: 'The first write-up is on its way.',
    rss: 'Get it by RSS',
  },
  building: { lede: "What I'm working on now, with the people I work with and on my own." },
  writing: {
    lede: 'Notes and essays on building software.',
    count: (n: number) => `${n === 1 ? '1 post' : `${n} posts`} so far.`,
    rss: 'RSS feed',
  },
  cv: {
    print: 'Print or save as PDF',
    download: 'Download .docx',
    file: 'Toms-Zvirbulis-CV.docx',
    experience: 'Experience',
    building: 'Building',
    skills: 'Skills',
    languages: 'Languages',
    education: 'Education',
    contact: 'Contact',
  },
  contact: {
    lede: 'Email is the quickest way to reach me.',
    copy: 'Copy email',
    copied: 'Copied',
    announced: 'Email address copied',
  },
  notFound: {
    title: 'Not found',
    description: "This page doesn't exist.",
    heading: 'Nothing here.',
    before: "The page you asked for doesn't exist. Try the",
    home: 'home page',
    or: 'or the',
    writing: 'writing',
  },
  /** Marks an English title on a Latvian page. */
  english: 'EN',
}

/** Typed as the English table, so a string missing in Latvian fails `astro check`. */
const lv: typeof en = {
  skip: 'Pāriet uz saturu',
  home: 'sākumlapa',
  nav: { building: 'Projekti', writing: 'Raksti', cv: 'CV', contact: 'Kontakti' },
  primary: 'Galvenā navigācija',
  menu: 'Izvēlne',
  close: 'Aizvērt',
  search: 'Meklēt',
  language: 'Valoda',
  theme: {
    idle: 'Pārslēgt motīvu',
    dark: 'Pārslēgt uz tumšo motīvu',
    light: 'Pārslēgt uz gaišo motīvu',
  },
  footer: {
    email: 'E-pasts',
    built: 'Būvēts',
    from: 'no',
    measured: 'Katrs skaitlis šeit ir izmērīts būvēšanas laikā vai aprēķināts jūsu pārlūkā.',
    source: 'Pirmkods',
  },
  intro:
    'Es veidoju programmatūru, un man rūp, kā tā top. Izstrādātājs Latvijā: kodu rakstu kopš desmit gadu vecuma, profesionāli piecus gadus. Lūk, kas notiek šobrīd.',
  now: {
    label: 'Šobrīd',
    building: 'Šobrīd veidoju',
    side: 'Blakusprojekts',
    latest: 'Jaunākais raksts',
    firstPost: 'Pirmais raksts jau top.',
    subscribe: 'Abonējiet RSS, lai to saņemtu',
    time: 'Vietējais laiks',
    sun: 'saule',
    above: 'virs horizonta',
    below: 'zem horizonta',
    page: 'Šī lapa',
    budget: 'KB no 14 KB budžeta',
    build: 'Pēdējais būvējums',
    from: 'no',
  },
  allWriting: 'Visi raksti',
  availability: {
    label: 'Pieejamība',
    open: 'Meklēju darbu',
    status: 'Statuss',
    roles: 'Amati',
    where: 'Kur',
    from: 'Sākot no',
    email: 'Rakstiet man par vakanci',
  },
  product: { role: 'Loma', status: 'Statuss' },
  empty: {
    nothing: 'Vēl nekas nav publicēts.',
    onItsWay: 'Pirmais raksts jau top.',
    rss: 'Saņemt ar RSS',
  },
  building: { lede: 'Pie kā strādāju šobrīd, gan kopā ar citiem, gan viens.' },
  writing: {
    lede: 'Piezīmes un esejas par programmatūras veidošanu, angļu valodā.',
    count: (n: number) => {
      // Latvian counts: 1, 21, 31 raksts; 0, 10 to 20, 30 rakstu; the rest raksti.
      const form = new Intl.PluralRules('lv').select(n)
      const word = form === 'one' ? 'raksts' : form === 'zero' ? 'rakstu' : 'raksti'
      return `Līdz šim ${n} ${word}.`
    },
    rss: 'RSS plūsma',
  },
  cv: {
    print: 'Drukāt vai saglabāt kā PDF',
    download: 'Lejupielādēt .docx',
    file: 'Toms-Zvirbulis-CV-LV.docx',
    experience: 'Pieredze',
    building: 'Projekti',
    skills: 'Prasmes',
    languages: 'Valodas',
    education: 'Izglītība',
    contact: 'Kontakti',
  },
  contact: {
    lede: 'Ātrākais veids, kā ar mani sazināties, ir e-pasts.',
    copy: 'Kopēt e-pastu',
    copied: 'Nokopēts',
    announced: 'E-pasta adrese nokopēta',
  },
  notFound: {
    title: 'Nav atrasts',
    description: 'Šādas lapas nav.',
    heading: 'Te nekā nav.',
    before: 'Lapa, ko meklējāt, neeksistē. Ieskatieties',
    home: 'sākumlapā',
    or: 'vai',
    writing: 'rakstos',
  },
  english: 'EN',
}

const strings = { en, lv }

export const t = (lang: Lang) => strings[lang]
