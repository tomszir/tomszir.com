/**
 * The command menu: a modal `<dialog>` with a combobox over `/search.json`. Bundled on its own by
 * `src/pages/command-menu.js.ts` and imported by the header on first open, so no page pays for it
 * until someone asks for it.
 */
// Bundled as text and adopted as a constructed stylesheet, which the CSP allows without a hash.
import styles from './command-menu.css'

interface Entry {
  group: string
  title: string
  detail: string
  href?: string
  action?: 'copy-email' | 'theme'
}

const GROUPS = ['Pages', 'Writing', 'Building', 'Actions', 'Sections']

/** Lower case without accents, so "riga" finds "Rīga". */
const fold = (text: string) => text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')

const words = (text: string) =>
  fold(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)

/**
 * How well an entry matches: every query word must start a word of the title, group or detail.
 * Lower is better; `undefined` is no match.
 */
function rank(entry: Entry, query: string[]): number | undefined {
  const title = words(`${entry.title} ${entry.group}`)
  const detail = words(entry.detail)
  let score = 0
  for (const word of query) {
    if (title.some((w) => w.startsWith(word))) continue
    if (detail.some((w) => w.startsWith(word))) score += 1
    else return undefined
  }
  return score + (entry.group === 'Sections' ? 0.5 : 0)
}

let dialog: HTMLDialogElement | undefined
let entries: Entry[] = []

async function build(): Promise<HTMLDialogElement> {
  entries = await (await fetch('/search.json')).json()
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(styles)
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]

  const element = document.createElement('dialog')
  element.className = 'command-menu'
  element.setAttribute('aria-label', 'Search the site')

  const input = Object.assign(document.createElement('input'), {
    className: 'command-input',
    type: 'text',
    autocomplete: 'off',
    spellcheck: false,
    placeholder: 'Search pages, writing and actions',
  })
  input.setAttribute('role', 'combobox')
  input.setAttribute('aria-label', 'Search')
  input.setAttribute('aria-expanded', 'true')
  input.setAttribute('aria-controls', 'command-list')
  input.setAttribute('aria-autocomplete', 'list')

  const close = Object.assign(document.createElement('button'), {
    className: 'command-close button',
    type: 'button',
    textContent: 'Close',
  })
  close.addEventListener('click', () => element.close())

  const field = Object.assign(document.createElement('div'), { className: 'command-field' })
  field.append(input, close)

  const band = Object.assign(document.createElement('div'), { className: 'command-band' })
  band.setAttribute('aria-hidden', 'true')
  const list = Object.assign(document.createElement('div'), {
    className: 'command-list',
    id: 'command-list',
  })
  list.setAttribute('role', 'listbox')
  list.setAttribute('aria-label', 'Results')

  const empty = Object.assign(document.createElement('p'), {
    className: 'command-empty',
    textContent: 'Nothing matches. ',
    hidden: true,
  })
  empty.append(
    Object.assign(document.createElement('a'), {
      className: 'link',
      href: '/writing',
      textContent: 'All writing',
    }),
  )

  const results = Object.assign(document.createElement('div'), { className: 'command-results' })
  results.append(band, list, empty)

  const count = Object.assign(document.createElement('p'), { className: 'sr-only' })
  count.setAttribute('aria-live', 'polite')

  const panel = Object.assign(document.createElement('div'), { className: 'command-panel' })
  panel.append(field, results, count)
  element.append(panel)
  document.body.append(element)

  let shown: { entry: Entry; option: HTMLElement }[] = []
  let selected = 0

  const select = (index: number) => {
    selected = shown.length > 0 ? (index + shown.length) % shown.length : 0
    const current = shown[selected]
    for (const { option } of shown)
      option.setAttribute('aria-selected', String(option === current?.option))
    if (!current) {
      input.removeAttribute('aria-activedescendant')
      band.hidden = true
      return
    }
    input.setAttribute('aria-activedescendant', current.option.id)
    band.hidden = false
    band.style.setProperty('--y', `${current.option.offsetTop}px`)
    band.style.setProperty('--h', `${current.option.offsetHeight}px`)
    current.option.scrollIntoView({ block: 'nearest' })
  }

  const show = () => {
    const query = words(input.value)
    const matches = entries
      .map((entry, order) => ({ entry, order, score: rank(entry, query) }))
      .filter((match) => match.score !== undefined)
      .sort((a, b) =>
        query.length > 0
          ? (a.score ?? 0) - (b.score ?? 0) || a.order - b.order
          : GROUPS.indexOf(a.entry.group) - GROUPS.indexOf(b.entry.group) || a.order - b.order,
      )

    list.replaceChildren()
    shown = []
    let group: HTMLElement | undefined
    for (const { entry } of matches) {
      // Grouped by kind while browsing; one ranked list once there's a query.
      const label = query.length > 0 ? 'Results' : entry.group
      if (group?.dataset.group !== label) {
        group = document.createElement('div')
        group.setAttribute('role', 'group')
        group.dataset.group = label
        const heading = document.createElement('div')
        heading.className = 'command-label meta muted'
        heading.id = `command-group-${label.toLowerCase()}`
        heading.textContent = label
        group.setAttribute('aria-labelledby', heading.id)
        group.append(heading)
        list.append(group)
      }
      const option = document.createElement('div')
      option.className = 'command-option'
      option.id = `command-option-${shown.length}`
      option.setAttribute('role', 'option')
      const title = document.createElement('span')
      title.className = 'command-title'
      title.textContent = entry.title
      const detail = document.createElement('span')
      detail.className = 'command-detail muted'
      detail.textContent = query.length > 0 ? `${entry.group} · ${entry.detail}` : entry.detail
      option.append(title, detail)
      const index = shown.length
      option.addEventListener('pointermove', () => {
        if (selected !== index) select(index)
      })
      option.addEventListener('click', () => choose(index))
      group.append(option)
      shown.push({ entry, option })
    }

    empty.hidden = shown.length > 0
    count.textContent =
      shown.length === 0 ? 'No results' : `${shown.length} result${shown.length === 1 ? '' : 's'}`
    select(0)
  }

  const choose = async (index: number) => {
    const chosen = shown[index]
    if (!chosen) return
    const { entry, option } = chosen
    if (entry.action === 'copy-email') {
      try {
        await navigator.clipboard.writeText(entry.detail)
      } catch {
        return
      }
      const detail = option.querySelector('.command-detail')
      if (detail) detail.textContent = 'Copied'
      count.textContent = 'Email address copied'
      setTimeout(() => element.close(), 700)
    } else if (entry.action === 'theme') {
      element.close()
      document.querySelector<HTMLButtonElement>('[data-theme-toggle]')?.click()
    } else if (entry.href) {
      element.close()
      location.assign(entry.href)
    }
  }

  input.addEventListener('input', show)
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      select(selected + (event.key === 'ArrowDown' ? 1 : -1))
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      select(event.key === 'Home' ? 0 : shown.length - 1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      choose(selected)
    }
  })
  // A click on the backdrop lands on the dialog itself, outside the panel.
  element.addEventListener('click', (event) => {
    if (event.target === element) element.close()
  })
  element.addEventListener('close', () => {
    input.value = ''
    document.documentElement.removeAttribute('data-command-open')
  })

  show()
  return element
}

/** Opens the menu, building it on first use. The dialog returns focus to the opener on close. */
export async function openMenu() {
  dialog ??= await build()
  if (dialog.open) return
  document.documentElement.setAttribute('data-command-open', '')
  dialog.showModal()
  // After showModal: the selection band measures the options, which have no size while closed.
  dialog.querySelector<HTMLInputElement>('.command-input')?.dispatchEvent(new Event('input'))
}
