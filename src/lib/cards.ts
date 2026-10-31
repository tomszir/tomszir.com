import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'
import { site } from '../site'
import { formatDate, getPosts } from './posts'
import { getProducts } from './products'

/** A page's preview card: `path` is the page's path without the leading slash, `index` for `/`. */
export interface Card {
  path: string
  label: string
  title: string
  description: string
}

const CARD_WIDTH = 1200
const CARD_HEIGHT = 630

/** Every page with its own card. The 404 page shares the home page's. */
export async function getCards(): Promise<Card[]> {
  const role = site.facts.find((fact) => fact.label === 'Role')?.value
  const sections = Object.entries(site.pages).map(([path, page]) => ({
    path,
    label: site.name,
    ...page,
  }))
  const posts = (await getPosts()).map((post) => ({
    path: `writing/${post.id}`,
    label: `Writing · ${formatDate(post.data.published)}`,
    title: post.data.title,
    description: post.data.description,
  }))
  const products = (await getProducts()).map((product) => ({
    path: `building/${product.id}`,
    label: `Building · ${product.data.role}`,
    title: product.data.name,
    description: product.data.description,
  }))
  return [
    {
      path: 'index',
      label: `${role} · ${site.place}`,
      title: site.name,
      description: site.description,
    },
    ...sections,
    ...posts,
    ...products,
  ]
}

// The build runs from the repository root; bundling moves this module, so paths start there.
const root = process.cwd()

/** The dark theme's colours, read from the tokens so the card can't drift from the site. */
export const colours = (() => {
  const css = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8')
  const dark = css.match(/:root\[data-theme='dark'\] \{([^}]*)\}/)?.[1] ?? ''
  const token = (name: string) => {
    const value = dark.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1]
    if (!value) throw new Error(`tokens.css: no dark --${name}`)
    return value
  }
  return { bg: token('bg'), fg: token('fg'), muted: token('muted'), accent: token('accent') }
})()

const font = (file: string) => readFileSync(join(root, 'src/fonts/card', file))

// Satori falls back by family, not by file, so each subset is its own family and the styles list
// the Latin Extended one second: the Latvian letters live only there.
const fonts = (['latin', 'latin-ext'] as const).flatMap((subset) => [
  { name: `Inter Tight ${subset}`, weight: 400, data: font(`inter-tight-400-${subset}.ttf`) },
  { name: `Inter Tight ${subset}`, weight: 600, data: font(`inter-tight-600-${subset}.ttf`) },
  {
    name: `JetBrains Mono ${subset}`,
    weight: 500,
    data: font(`jetbrains-mono-500-${subset}.ttf`),
  },
]) satisfies Parameters<typeof satori>[1]['fonts']

type Node = { type: string; props: Record<string, unknown> }

const h = (type: string, style: Record<string, unknown>, ...children: (Node | string)[]): Node => ({
  type,
  props: { style, children },
})

/** The card as a PNG: label at the top, title and description, `tomszir.com` at the foot. */
export async function renderCard(card: Card): Promise<Uint8Array<ArrayBuffer>> {
  const titleSize = card.title.length > 40 ? 64 : 80
  const mono = {
    fontFamily: 'JetBrains Mono latin, JetBrains Mono latin-ext',
    fontWeight: 500,
    fontSize: 26,
  }

  const svg = await satori(
    h(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: 72,
        background: colours.bg,
        color: colours.fg,
        fontFamily: 'Inter Tight latin, Inter Tight latin-ext',
      },
      h('div', { ...mono, color: colours.muted }, card.label),
      h(
        'div',
        { display: 'flex', flexDirection: 'column', gap: 24 },
        h(
          'div',
          {
            fontSize: titleSize,
            fontWeight: 600,
            lineHeight: 1.05,
            letterSpacing: -0.045 * titleSize,
            lineClamp: 3,
          },
          card.title,
        ),
        h(
          'div',
          { fontSize: 30, lineHeight: 1.4, color: colours.muted, maxWidth: 940, lineClamp: 2 },
          card.description,
        ),
      ),
      h(
        'div',
        { ...mono, display: 'flex', alignItems: 'center', gap: 16 },
        h('div', { width: 20, height: 20, background: colours.accent }),
        'tomszir.com',
      ),
    ),
    { width: CARD_WIDTH, height: CARD_HEIGHT, fonts },
  )
  return new Uint8Array(new Resvg(svg).render().asPng())
}
