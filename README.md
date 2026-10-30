# tomszir.com

My personal site. I wanted something that shows I know what I'm doing without looking like every other portfolio, so it's eight static pages, one stylesheet and one small script, and the build checks its own output before anything goes live.

It's built with [Astro](https://astro.build) and served from Cloudflare Workers static assets. Nothing runs on a server when you load a page.

## How it works

Most of the work happens at build time:

1. `astro build` renders every page to HTML, bundles the CSS and copies the fonts into `dist/`.
2. `scripts/stamp-build.mjs` measures each page, gzipped together with the CSS and JS it loads, and writes the size, the build date and the commit into it. That's where the numbers on the home page and in the footer come from.
3. `scripts/check-dist.mjs` reads every built page and fails if one is missing a `lang`, a title, a description or a single `h1`, if anything loads from another origin, if the home page goes over 14 KB compressed, or if a printed size is more than 0.1 KB off the real one.

The 14 KB budget is roughly what fits in the first round trip of a new connection. The home page is at about 11.5 KB.

Every page works with JavaScript off. The scripts that exist only add to it: the theme set before first paint, the theme toggle, the clock and the sun's elevation over Riga, the moving highlight in lists and the nav, the sticky header, the phone menu and the copy buttons. Page-to-page animation is plain CSS view transitions, not a client-side router.

Fonts and icons live in the repository. Both are pinned by version and checksum and pulled in by a script, and the fonts are cut down to the characters the site uses (ASCII, the Latvian letters and a few symbols), which took them from 75 KB to 48 KB.

## Working on it

You need [mise](https://mise.jdx.dev). It pins Node and pnpm.

```sh
mise install
pnpm install
pnpm dev          # http://localhost:4321
```

Before calling anything done:

```sh
mise run check    # type check, Biome, build, stamp, check-dist
```

Also useful:

| Command                      | Does                                                              |
| ---------------------------- | ----------------------------------------------------------------- |
| `pnpm fmt`                   | Formats everything with Biome                                     |
| `pnpm build && pnpm preview` | The production build, served locally                              |
| `mise run icons:vendor`      | Re-vendors the icons from `vendor/icons.lock.json`                |
| `mise run fonts:vendor`      | Re-vendors and re-subsets the fonts from `vendor/fonts.lock.json` |
| `pnpm run deploy`            | Builds and deploys to Cloudflare (needs `wrangler login`)         |

The dev server doesn't run the stamp step, so the build numbers show as dashes there. Restart it after renaming a content file or changing the content schema.

## Where things are

| Path                     | What's in it                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `src/site.ts`            | The facts the pages print: name, roles, experience, links                             |
| `src/content/writing/`   | Posts, `.md` or `.mdx`                                                                |
| `src/content/building/`  | One file per product: its facts, in the frontmatter                                   |
| `src/content/write-ups/` | A product's longer write-up, one file per product id, `draft: true` until done        |
| `src/pages/`             | The routes                                                                            |
| `src/components/`        | Layout pieces, and `write-up/` for the blocks posts can use                           |
| `src/styles/`            | `tokens.css` (colours, type, spacing), `global.css`, and the code highlighting themes |
| `src/scripts/`           | The small client scripts                                                              |
| `scripts/`               | Build checks and the vendoring scripts                                                |

## Writing a post

Add a file to `src/content/writing/`:

```mdx
---
title: The title
description: One sentence for the list, the feed and search results.
published: 2026-10-30
draft: true
---

import Decision from '../../components/write-up/Decision.astro'

## A section

Text, links and code blocks as usual.

<Decision chosen="What I picked" instead="What I didn't">
  Why.
</Decision>
```

`draft: true` keeps it on the dev server and out of the build. Every `##` heading goes into the contents list on the side. Besides `Decision` there's `Flow`, for a sequence of steps, and `Note`, for an aside.

A character the fonts don't have falls back to the system font. To use a new symbol, add it to `vendor/fonts.lock.json` and run `mise run fonts:vendor`.

## Licence

The code is MIT. The writing, the product write-ups and my personal details are mine; see [LICENSE](LICENSE). The fonts (OFL-1.1) and icons (ISC and CC0-1.0) keep their own licences, next to them in `src/fonts/LICENSES/` and `src/icons/LICENSES/`.
