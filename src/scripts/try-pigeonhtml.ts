// The PigeonHTML post's editor: what's typed goes through Pigeon's own validator and sanitizer
// (vendor/pigeonhtml/, bundled by scripts/pigeonhtml-examples.mjs), problems are marked in the code
// (code-editor.ts), and the page is written into a frame the way Explorer writes one. Loaded by
// that post alone.
import {
  PAGE_BUDGET_BYTES,
  type PageUrls,
  PIGEONHTML_VERSION,
  sanitize,
  validate,
} from '../../vendor/pigeonhtml/pigeonhtml.js'
import frame from '../content/pigeonhtml/frame.json'
import { stillMarquees } from '../lib/still-marquee'
import { codeEditor, format } from './code-editor'

const images: Record<string, string> = frame.images
const urls: PageUrls = {
  image: (src) => (src.startsWith('data:') ? src : images[src]),
  link: (href) => (href.startsWith('pigeon://') || href.startsWith('#') ? href : undefined),
}

for (const editor of document.querySelectorAll<HTMLElement>('[data-try]')) {
  const source = editor.querySelector('textarea')
  const view = editor.querySelector('iframe')
  const verdict = editor.querySelector<HTMLElement>('[data-try-verdict]')
  const problems = editor.querySelector<HTMLOListElement>('[data-try-problems]')
  const size = editor.querySelector<HTMLElement>('[data-try-size]')
  if (!source || !view || !verdict || !problems || !size) continue

  const render = (text: string) => {
    const found = validate(text)
    const { html, bytes } = sanitize(text, urls)

    verdict.textContent =
      found.length === 0
        ? `Valid PigeonHTML ${PIGEONHTML_VERSION}!`
        : `${found.length} ${found.length === 1 ? 'thing' : 'things'} Pigeon takes out`
    verdict.toggleAttribute('data-valid', found.length === 0)
    problems.replaceChildren(
      ...found.map(({ line, column, message }) => {
        const item = document.createElement('li')
        const at = document.createElement('span')
        at.className = 'try-at'
        at.textContent = `${line}:${column}`
        const text = document.createElement('span')
        text.textContent = message
        item.append(at, text)
        return item
      }),
    )
    size.textContent = `${(bytes / 1024).toFixed(1)} KB of ${PAGE_BUDGET_BYTES / 1024} KB`

    const doc = view.contentDocument
    if (!doc) return
    doc.open()
    doc.write(frame.document.split('{page}').join(stillMarquees(html)))
    doc.close()
  }

  let pending: number | undefined
  const code = codeEditor(source, {
    check: validate,
    onChange: (text) => {
      clearTimeout(pending)
      pending = window.setTimeout(() => render(text), 150)
    },
  })
  editor.querySelector('[data-try-format]')?.addEventListener('click', () => {
    format(code)
    code.focus()
  })
  const first = () => render(source.value)
  if (view.contentDocument?.readyState === 'complete') first()
  else view.addEventListener('load', first, { once: true })
  editor.hidden = false
}
