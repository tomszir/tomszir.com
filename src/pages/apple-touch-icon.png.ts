import { Resvg } from '@resvg/resvg-js'
import type { APIRoute } from 'astro'
import { colours } from '../lib/cards'

// The mark from favicon.svg on the dark ground: iOS fills a transparent icon with black.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <rect width="180" height="180" fill="${colours.bg}"/>
  <rect x="56" y="56" width="68" height="68" fill="${colours.accent}"/>
</svg>`

export const GET: APIRoute = () =>
  new Response(new Uint8Array(new Resvg(svg).render().asPng()), {
    headers: { 'Content-Type': 'image/png' },
  })
