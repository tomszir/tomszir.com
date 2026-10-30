import { type CollectionEntry, getCollection } from 'astro:content'

export type Post = CollectionEntry<'writing'>

/** Published posts, newest first. Drafts are included only in development. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('writing', ({ data }) => import.meta.env.DEV || !data.draft)
  return posts.sort((a, b) => b.data.published.getTime() - a.data.published.getTime())
}

const WORDS_PER_MINUTE = 220

/** Minutes to read an entry's body: posts and product write-ups alike. */
export function readingMinutes(entry: { body?: string | undefined }): number {
  const words = entry.body?.trim().split(/\s+/).length ?? 0
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}

const dateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' })

/** `2026-10-30`: sortable, and the same for every reader. */
export const formatDate = (date: Date) => dateFormat.format(date)
