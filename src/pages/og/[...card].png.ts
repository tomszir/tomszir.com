import type { APIRoute, GetStaticPaths } from 'astro'
import { type Card, getCards, renderCard } from '../../lib/cards'

export const getStaticPaths = (async () =>
  (await getCards()).map((card) => ({
    params: { card: card.path },
    props: { card },
  }))) satisfies GetStaticPaths

export const GET: APIRoute<{ card: Card }> = async ({ props }) =>
  new Response(await renderCard(props.card), { headers: { 'Content-Type': 'image/png' } })
