// The exports of pigeonhtml.js, from Pigeon's packages/pigeonhtml/src/types.ts and index.ts.

/** What a page may load or link to, decided by whoever shows it. */
export interface PageUrls {
  /** The URL to serve an image the page names from, or undefined to drop the image. */
  readonly image: (src: string) => string | undefined
  /** The address a link goes to, or undefined to drop the link and keep its text. */
  readonly link: (href: string) => string | undefined
}

/** Something the sanitizer took out. */
export interface Removed {
  readonly what: 'element' | 'attribute' | 'property' | 'url' | 'comment'
  /** The element, attribute or CSS property's name, or the URL. */
  readonly name: string
}

export interface Sanitized {
  /** The page as it may be rendered: no doctype, only what the allowlists keep. */
  readonly html: string
  /** The page's `<title>`, as text. */
  readonly title: string | undefined
  /** The source's size in UTF-8 bytes, to hold against PAGE_BUDGET_BYTES. */
  readonly bytes: number
  readonly removed: readonly Removed[]
}

/** Something in a page that isn't PigeonHTML, where it starts in the source (1-based). */
export interface Problem {
  readonly line: number
  readonly column: number
  readonly message: string
}

export declare const PIGEONHTML_VERSION: string
export declare const PAGE_BUDGET_BYTES: number
export declare function sanitize(source: string, urls: PageUrls): Sanitized
export declare function validate(source: string): readonly Problem[]
