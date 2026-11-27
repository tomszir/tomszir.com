/**
 * The picture viewer: a modal `<dialog>` over a gallery's pictures (src/components/Lightbox.astro).
 * The pictures sit side by side on a track: a drag or swipe moves it under the pointer, showing the
 * neighbour, and lets go onto the nearest picture; the arrow keys, Home, End and the side buttons
 * slide it too. A click or Z zooms to twice the fitted size, alone on the screen, where dragging
 * or scrolling pans; on touch a double tap zooms and a tap shows or hides the controls. Esc, the
 * close button, a click beside the picture or Back closes it. The controls fade
 * after a moment without input. Bundled on its own by `src/pages/lightbox.js.ts`.
 */
// Bundled as text and adopted as a constructed stylesheet, which the CSP allows without a hash.
import styles from './lightbox.css'

const IDLE_MS = 2500
const DOUBLE_TAP_MS = 300
const SLIDE = 'translate 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
/** The gap between slides, matching `.lightbox-track`. */
const GAP = 16
const still = matchMedia('(prefers-reduced-motion: reduce)')

/** One picture the viewer shows, and what on the page opens it. */
interface Picture {
  trigger: HTMLElement
  src: () => string
  width: number
  height: number
  alt: string
  pixels: boolean
}

/**
 * A group's pictures: a gallery's links to each picture's full size, or the pictures in an
 * article's text (not a diagram's), which open as they are.
 */
function picturesIn(group: HTMLElement): Picture[] {
  const links = [...group.querySelectorAll<HTMLAnchorElement>('[data-viewer-item]')]
  if (links.length > 0) {
    return links.map((link) => ({
      trigger: link,
      src: () => link.href,
      width: Number(link.dataset.width),
      height: Number(link.dataset.height),
      alt: link.querySelector('img')?.alt ?? '',
      pixels: false,
    }))
  }
  return [...group.querySelectorAll<HTMLImageElement>('.prose img')]
    .filter((image) => !image.closest('.diagram, a'))
    .map((image) => ({
      trigger: image,
      src: () => image.currentSrc || image.src,
      width: image.width || image.naturalWidth,
      height: image.height || image.naturalHeight,
      alt: image.alt,
      pixels: image.classList.contains('pixels'),
    }))
}

let sheet: CSSStyleSheet | undefined
for (const group of document.querySelectorAll<HTMLElement>('[data-viewer]')) {
  const dialog = group.querySelector<HTMLDialogElement>('[data-lightbox]')
  const pictures = picturesIn(group)
  if (!dialog || pictures.length === 0) continue
  if (!sheet) {
    sheet = new CSSStyleSheet()
    sheet.replaceSync(styles)
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
  }
  setUp(pictures, dialog)
}

function setUp(items: Picture[], dialog: HTMLDialogElement) {
  const part = <T extends Element>(name: string) => dialog.querySelector(`[data-${name}]`) as T
  const frame = part<HTMLElement>('frame')
  const view = part<HTMLElement>('window')
  const track = part<HTMLElement>('track')
  const caption = part<HTMLElement>('caption')
  const count = part<HTMLElement>('count')
  const previous = part<HTMLButtonElement>('previous')
  const next = part<HTMLButtonElement>('next')
  const close = part<HTMLButtonElement>('close')

  // One slide per picture, each scrolling on its own when zoomed. Files load as they come near.
  const slides = items.map((item) => {
    const slide = document.createElement('div')
    slide.className = 'lightbox-slide'
    const image = document.createElement('img')
    image.className = 'lightbox-image'
    image.alt = item.alt
    image.width = item.width
    image.height = item.height
    image.decoding = 'async'
    image.draggable = false
    image.classList.toggle('pixels', item.pixels)
    slide.append(image)
    track.append(slide)
    return { slide, image, href: item.src }
  })

  // One size for every picture, from the first one's shape, so the viewer never shrinks or jumps.
  const first = items[0] as Picture
  dialog.style.setProperty('--ratio', `${first.width} / ${first.height}`)

  let index = 0
  let zoomed = false
  const current = () => slides[index] as (typeof slides)[number]

  // The controls show on any input and fade once it stops, unless one of them has focus.
  let idleTimer: number | undefined
  const wake = () => {
    dialog.removeAttribute('data-idle')
    clearTimeout(idleTimer)
    idleTimer = window.setTimeout(() => dialog.setAttribute('data-idle', ''), IDLE_MS)
  }
  const toggleControls = () => {
    if (dialog.hasAttribute('data-idle')) wake()
    else {
      clearTimeout(idleTimer)
      dialog.setAttribute('data-idle', '')
    }
  }

  /** Puts the track at the current picture, `offset` pixels along where a drag has taken it. */
  const place = (offset = 0, animate = false) => {
    const step = view.clientWidth + GAP
    track.style.transition = animate && !still.matches ? SLIDE : 'none'
    track.style.translate = `${-index * step + offset}px 0`
  }

  /**
   * Zoomed, the current picture alone fills the screen at twice its fitted size (never past its
   * own pixels), and scrolls. The point that was clicked, or the centre, stays put.
   */
  const setZoom = (on: boolean, at?: { x: number; y: number }) => {
    if (on === zoomed) return
    zoomed = on
    const { slide, image } = current()
    const box = image.getBoundingClientRect()
    image.style.width = on ? `${Math.min(image.naturalWidth, box.width * 2)}px` : ''
    dialog.toggleAttribute('data-zoomed', on)
    if (!on) {
      place()
      return
    }
    track.style.transition = 'none'
    track.style.translate = ''
    const x = at?.x ?? box.left + box.width / 2
    const y = at?.y ?? box.top + box.height / 2
    slide.scrollLeft = image.offsetLeft + ((x - box.left) / box.width) * image.offsetWidth - x
    slide.scrollTop = image.offsetTop + ((y - box.top) / box.height) * image.offsetHeight - y
  }

  /** Moves to picture `target`, sliding the track there unless the viewer is just opening. */
  const show = (target: number, animate = true) => {
    setZoom(false)
    index = Math.max(0, Math.min(items.length - 1, target))
    slides.forEach(({ slide }, i) => {
      slide.toggleAttribute('data-current', i === index)
    })
    for (const near of [index - 1, index, index + 1]) {
      const slide = slides[near]
      if (slide && !slide.image.src) slide.image.src = slide.href()
    }
    caption.textContent = current().image.alt
    count.textContent = `${index + 1} / ${items.length}`
    previous.disabled = index === 0
    next.disabled = index === items.length - 1
    place(0, animate)
    wake()
  }

  const open = (target: number) => {
    dialog.showModal()
    show(target, false)
    document.documentElement.setAttribute('data-viewer-open', '')
    // An entry of its own, so Back closes the viewer instead of leaving the page.
    history.pushState({ viewer: true }, '')
  }

  items.forEach(({ trigger, alt }, i) => {
    trigger.addEventListener('click', (event) => {
      // On a link, a modified or middle click keeps its meaning: the picture in a new tab.
      const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
      if (trigger instanceof HTMLAnchorElement && (event.button !== 0 || modified)) return
      event.preventDefault()
      open(i)
    })
    // A picture in the text isn't a link, so it's made a button that opens.
    if (trigger instanceof HTMLImageElement) {
      trigger.classList.add('lightbox-zoomable')
      trigger.tabIndex = 0
      trigger.setAttribute('role', 'button')
      trigger.setAttribute('aria-label', `View larger: ${alt}`)
      trigger.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        open(i)
      })
    }
  })

  previous.addEventListener('click', () => show(index - 1))
  next.addEventListener('click', () => show(index + 1))
  /** Every way out goes through here: the viewer fades out, then the dialog closes. */
  const shut = async () => {
    if (!dialog.open || dialog.hasAttribute('data-closing')) return
    if (!still.matches) {
      dialog.setAttribute('data-closing', '')
      await Promise.all(
        dialog.getAnimations({ subtree: true }).map((animation) => animation.finished),
      )
      dialog.removeAttribute('data-closing')
    }
    dialog.close()
  }

  close.addEventListener('click', shut)
  // Beside the picture, the dialog itself is what's clicked: the blurred page closes the viewer.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) shut()
  })
  addEventListener('resize', () => {
    if (dialog.open && !zoomed) place()
  })

  dialog.addEventListener('close', () => {
    clearTimeout(idleTimer)
    setZoom(false)
    document.documentElement.removeAttribute('data-viewer-open')
    if (history.state?.viewer) history.back()
  })
  addEventListener('popstate', () => {
    shut()
  })

  // Esc zooms out first, then closes, fading like every other way out.
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault()
    if (zoomed) setZoom(false)
    else shut()
  })

  dialog.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse') wake()
  })
  dialog.addEventListener('keydown', (event) => {
    wake()
    if (event.metaKey || event.ctrlKey || event.altKey) return
    const moves: Record<string, number> = {
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      Home: 0,
      End: items.length - 1,
    }
    if (event.key in moves && !zoomed) {
      event.preventDefault()
      show(moves[event.key] as number)
    } else if (event.key === 'z' || event.key === 'Z') {
      event.preventDefault()
      setZoom(!zoomed)
    }
  })

  // One gesture handler for mouse, pen and touch. Zoomed, a drag pans the picture. Not zoomed, a
  // sideways drag moves the track with the pointer, stiffer past either end, and nothing moves up
  // or down. A click zooms; on touch a tap shows or hides the controls and a double tap zooms.
  let start:
    | { x: number; y: number; left: number; top: number; id: number; touch: boolean; at: number }
    | undefined
  let axis: 'x' | 'y' | undefined
  let lastTap = 0

  frame.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || (event.target as Element).closest('button')) return
    const { slide } = current()
    start = {
      x: event.clientX,
      y: event.clientY,
      left: slide.scrollLeft,
      top: slide.scrollTop,
      id: event.pointerId,
      touch: event.pointerType !== 'mouse',
      at: event.timeStamp,
    }
    axis = undefined
    frame.setPointerCapture(event.pointerId)
  })

  frame.addEventListener('pointermove', (event) => {
    if (!start || event.pointerId !== start.id) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (!axis && Math.hypot(dx, dy) > 6) axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'
    if (!axis) return
    if (zoomed) {
      current().slide.scrollLeft = start.left - dx
      current().slide.scrollTop = start.top - dy
    } else if (axis === 'x') {
      const pastEnd = (dx > 0 && index === 0) || (dx < 0 && index === items.length - 1)
      place(pastEnd ? dx / 3 : dx)
    }
  })

  const end = (event: PointerEvent) => {
    if (!start || event.pointerId !== start.id) return
    const dx = event.clientX - start.x
    const { touch } = start
    // A quick flick counts as much as a long drag.
    const fast = Math.abs(dx) / Math.max(1, event.timeStamp - start.at) > 0.5
    start = undefined

    if (event.type === 'pointercancel') {
      if (!zoomed) place(0, true)
      return
    }
    if (!axis) {
      const at = { x: event.clientX, y: event.clientY }
      if (!touch) setZoom(!zoomed, at)
      else if (event.timeStamp - lastTap < DOUBLE_TAP_MS) {
        lastTap = 0
        setZoom(!zoomed, at)
      } else {
        lastTap = event.timeStamp
        toggleControls()
      }
      return
    }
    if (zoomed || axis === 'y') return
    const far = Math.abs(dx) > view.clientWidth * 0.2 || (fast && Math.abs(dx) > 30)
    show(far ? index + (dx < 0 ? 1 : -1) : index)
  }
  frame.addEventListener('pointerup', end)
  frame.addEventListener('pointercancel', end)
}
