/**
 * "Try it" on a product page: the button (`[data-try]`, the demo's address in its value) loads the
 * product's web demo when pressed, not before, mounts it on an element of its own under `<body>`
 * and opens it with its guided tour. What the demo would have done outside the page shows as a
 * note at the top; finishing the tour closes it and points at the install buttons. The demo
 * follows the site's colour scheme. On a phone or tablet the button is disabled: the demo is the
 * desktop extension's bar, driven from a keyboard (the same query as the card's styles). Bundled on its own by `src/pages/try.js.ts`.
 *
 * The demo's contract is in Aloft's docs/demo.md.
 */
import styles from './try.css'

interface DemoHandle {
  open(): void
  close(): void
  setScheme(scheme: Scheme): void
}
type Scheme = 'light' | 'dark' | 'system'
interface DemoModule {
  mountDemo(
    host: HTMLElement,
    options: {
      scheme: Scheme
      tour: boolean
      onWould: (what: string) => void
      onClose: () => void
      onFinish: () => void
    },
  ): DemoHandle
}

const NOTE_MS = 2600
const root = document.documentElement
/** The site's scheme: the toggle's choice, else the system's. */
const scheme = (): Scheme =>
  root.dataset.theme === 'dark' || root.dataset.theme === 'light' ? root.dataset.theme : 'system'

const handheld = matchMedia('(max-width: 640px), (hover: none) and (pointer: coarse)')

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-try]')) {
  const fit = () => {
    button.disabled = handheld.matches
  }
  fit()
  handheld.addEventListener('change', fit)
  let demo: DemoHandle | undefined
  let finished = false

  // One line at the top, over the demo, for what it would have done.
  const note = document.createElement('p')
  note.className = 'try-note'
  note.setAttribute('role', 'status')
  let hide = 0
  const say = (what: string) => {
    note.textContent = what
    note.dataset.on = ''
    clearTimeout(hide)
    hide = window.setTimeout(() => delete note.dataset.on, NOTE_MS)
  }

  const finish = () => {
    // Back on the page, the install buttons are the next step.
    const install = document.querySelector<HTMLElement>('[data-install]')
    if (!install) return
    install.scrollIntoView({ block: 'center', behavior: 'smooth' })
    install.focus({ preventScroll: true })
    install.dataset.pulse = ''
    install.addEventListener('animationend', () => delete install.dataset.pulse, { once: true })
  }

  button.addEventListener('click', async () => {
    if (!demo) {
      button.setAttribute('aria-busy', 'true')
      try {
        const { mountDemo } = (await import(button.dataset.try ?? '')) as DemoModule
        const host = document.createElement('div')
        document.body.append(host, note)
        demo = mountDemo(host, {
          scheme: scheme(),
          tour: true,
          onWould: say,
          onClose: () => {
            delete note.dataset.on
            if (finished) finish()
            finished = false
          },
          onFinish: () => {
            finished = true
            demo?.close()
          },
        })
        new MutationObserver(() => demo?.setScheme(scheme())).observe(root, {
          attributeFilter: ['data-theme'],
        })
      } finally {
        button.removeAttribute('aria-busy')
      }
    }
    demo.open()
  })
}

const sheet = new CSSStyleSheet()
sheet.replaceSync(styles)
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
