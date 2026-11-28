// Marquees that stand still for readers who ask for less motion. CSS can't stop a <marquee>, so
// each one is followed by a still copy of what it holds, and a stylesheet shows one or the other.
// Used on this site's copies of Pigeon pages; Pigeon itself only stills <blink>.

/** The stylesheet that swaps each marquee for its still copy under reduced motion. */
export const STILL_MARQUEE_CSS =
  '[data-still]{display:none}@media (prefers-reduced-motion:reduce){marquee{display:none}[data-still]{display:block}}'

/** A page's HTML with a still copy after each marquee. Nested marquees aren't copied apart. */
export const stillMarquees = (html: string): string =>
  html.replace(/<marquee\b[^>]*>([\s\S]*?)<\/marquee>/g, '$&<div data-still>$1</div>')
