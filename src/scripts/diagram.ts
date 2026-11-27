/**
 * Makes each interactive diagram (src/components/write-up/Diagram.astro) a canvas that guides the
 * eye: one step at a time, its arrows and the parties it names lit and the rest faded, and, over
 * and over, a dot (a star in the text drawing, hopping cell to cell) travelling each lit arrow the
 * way things move, with the step's words in the bar under it. Click
 * a party or an arrow to go to its step; the arrows and dots in the bar, or the arrow keys, step.
 * Pinch, Ctrl or Cmd with the wheel, a double click, the buttons in the corner or + and - zoom; a
 * drag moves it once zoomed; Fit or 0 puts it back. A drawing wider than its panel starts fitted.
 * Without this script a diagram shows every step at once and scrolls sideways if it must.
 * Bundled on its own by `src/pages/diagram.js.ts`.
 */

const MAX_ZOOM = 4
/** Speeds in pixels per millisecond: the dot in the drawing's units, the star on screen. */
const DOT_SPEED = 0.22
const STAR_SPEED = 0.16
/** The rest after a run, before the next; how long the star stays on the arrowhead. */
const REST_MS = 600
const HOP_HOLD = 120
/** On a two-way arrow, the pause between the trip out and the trip back. */
const TURN_GAP = 350
/** How far the dot travels while fading in, and again while fading out. */
const FADE_DISTANCE = 28
/** How far the dot keeps from the blocks a line joins, and the room the arrowhead takes. */
const DOT_CLEARANCE = 10
const ARROWHEAD = 4
const still = matchMedia('(prefers-reduced-motion: reduce)')

type Point = { x: number; y: number }

/**
 * Zoom and pan for one diagram's board, as one transform on the drawing, measured in the drawing's
 * own place: the drawing is centred, first scaled to fit (never up), and that fitted size is what
 * the board holds; zooming scales past it, and panning keeps its edges at or past its place's.
 */
function canvas(board: HTMLElement, drawing: HTMLElement) {
  let fit = 1
  let scale = 1
  let x = 0
  let y = 0
  let dragged = false
  const pointers = new Map<number, Point>()
  let pinch: { distance: number; scale: number } | undefined
  const padding = () => Number.parseFloat(getComputedStyle(board).paddingLeft)

  const apply = () => {
    const width = drawing.offsetWidth * fit
    const height = drawing.offsetHeight * fit
    x = Math.min(0, Math.max(width - width * scale, x))
    y = Math.min(0, Math.max(height - height * scale, y))
    drawing.style.transform = `translate(${x}px, ${y}px) scale(${fit * scale})`
    // The layout keeps the drawing's unscaled size; give back what fitting took away. Unfitted, the
    // auto margins keep it centred.
    drawing.style.marginLeft = fit < 1 ? '0' : ''
    drawing.style.marginRight = fit < 1 ? `${width - drawing.offsetWidth}px` : ''
    drawing.style.marginBottom = `${height - drawing.offsetHeight}px`
    board.toggleAttribute('data-zoomed', scale > 1)
  }
  const measure = () => {
    fit = Math.min(1, (board.clientWidth - padding() * 2) / drawing.offsetWidth)
    apply()
  }
  const zoom = (factor: number, at: Point) => {
    const next = Math.min(MAX_ZOOM, Math.max(1, scale * factor))
    x = at.x - ((at.x - x) * next) / scale
    y = at.y - ((at.y - y) * next) / scale
    scale = next
    apply()
  }
  /** A point relative to the drawing's place in the board, before any zoom or pan. */
  const local = (point: { clientX: number; clientY: number }): Point => {
    const box = board.getBoundingClientRect()
    return {
      x: point.clientX - box.left - drawing.offsetLeft,
      y: point.clientY - box.top - drawing.offsetTop,
    }
  }
  const centre = (): Point => ({
    x: (drawing.offsetWidth * fit) / 2,
    y: (drawing.offsetHeight * fit) / 2,
  })
  const reset = () => {
    scale = 1
    apply()
  }

  board.addEventListener(
    'wheel',
    (event) => {
      // Plain scrolling stays the page's; with Ctrl or Cmd (and trackpad pinches) it zooms.
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      zoom(Math.exp(-event.deltaY * 0.01), local(event))
    },
    { passive: false },
  )
  board.addEventListener('dblclick', (event) => {
    if ((event.target as Element).closest('button')) return
    zoom(1.8, local(event))
  })

  board.addEventListener('pointerdown', (event) => {
    if ((event.target as Element).closest('button')) return
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    dragged = false
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()] as [Point, Point]
      pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale }
    }
  })
  board.addEventListener('pointermove', (event) => {
    const last = pointers.get(event.pointerId)
    if (!last) return
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()] as [Point, Point]
      const mid = local({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 })
      zoom((pinch.scale * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.distance / scale, mid)
      dragged = true
    } else if (scale > 1) {
      if (!dragged) board.setPointerCapture(event.pointerId)
      x += event.clientX - last.x
      y += event.clientY - last.y
      dragged = true
      apply()
    }
  })
  const lift = (event: PointerEvent) => {
    pointers.delete(event.pointerId)
    if (pointers.size < 2) pinch = undefined
  }
  board.addEventListener('pointerup', lift)
  board.addEventListener('pointercancel', lift)

  // Measured again whenever the panel or the drawing changes size: the window, but also a font
  // arriving after the first paint, which changes how wide the text drawing is.
  new ResizeObserver(measure).observe(board)
  new ResizeObserver(measure).observe(drawing.firstElementChild ?? drawing)
  measure()
  return {
    zoomIn: () => zoom(1.4, centre()),
    zoomOut: () => zoom(1 / 1.4, centre()),
    reset,
    /** Whether the pointer moved enough since it went down that a click shouldn't count. */
    wasDragged: () => dragged,
  }
}

/**
 * Sends a marker along each lit arrow, start to arrowhead, again and again until stopped: a dot
 * on the graph paper, gliding and fading in and out; a star in the text drawing, hopping a cell at
 * a time. Both keep one speed in screen distance, so a long arrow takes longer than a short one
 * and a tall text cell takes as long as its height. The arrows of a step set off together and the
 * rest comes after the longest. Returns the function that stops it.
 */
function animate(drawing: HTMLElement, step: number): () => void {
  if (still.matches) return () => {}
  const svg = drawing.querySelector('svg')
  const chars = drawing.querySelector<HTMLElement>('.diagram-chars')
  /** A marker: its element, how long a run takes, and where it is after so long. */
  const markers: {
    element: HTMLElement | SVGElement
    duration: number
    at: (ms: number) => void
  }[] = []

  if (svg) {
    for (const edge of svg.querySelectorAll(`.diagram-edge[data-step="${step}"]`)) {
      const path = edge.querySelector('path')
      if (!path) continue
      const both = edge.hasAttribute('data-both')
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      dot.setAttribute('class', 'diagram-token')
      dot.setAttribute('r', '4')
      svg.append(dot)
      // The open line only: clear of the block it leaves, and short of the arrowhead.
      const length = path.getTotalLength()
      const from = Math.min(DOT_CLEARANCE, length / 3)
      const to = Math.max(from, length - DOT_CLEARANCE - ARROWHEAD)
      const leg = (to - from) / DOT_SPEED
      // A two-way arrow gets two whole trips, out and then back, with a gap between them.
      const duration = both ? leg * 2 + TURN_GAP : leg
      markers.push({
        element: dot,
        duration,
        at: (ms) => {
          const back = ms > leg
          const run = back ? ms - leg - TURN_GAP : ms
          if (run < 0) {
            dot.style.opacity = '0'
            return
          }
          const t = back ? 1 - run / leg : run / leg
          const point = path.getPointAtLength(from + (to - from) * t)
          dot.setAttribute('cx', String(point.x))
          dot.setAttribute('cy', String(point.y))
          // Each trip fades in over its first stretch and out over its last.
          dot.style.opacity = String(
            Math.min(
              1,
              (run * DOT_SPEED) / FADE_DISTANCE,
              ((leg - run) * DOT_SPEED) / FADE_DISTANCE,
            ),
          )
        },
      })
    }
  } else if (chars) {
    const routes: { step: number; both: boolean; cells: [number, number][] }[] = JSON.parse(
      chars.dataset.routes ?? '[]',
    )
    // A cell's size, measured from the drawing's own font.
    const probe = document.createElement('span')
    probe.textContent = '0'.repeat(20)
    chars.append(probe)
    const cell = {
      w: probe.offsetWidth / 20,
      h: Number.parseFloat(getComputedStyle(chars).lineHeight),
    }
    probe.remove()
    for (const route of routes.filter((r) => r.step === step)) {
      const star = document.createElement('span')
      star.className = 'diagram-star'
      star.textContent = '*'
      chars.append(star)
      // When the star reaches each cell of a trip: the distance to it in pixels, at one speed.
      const arrivals: number[] = []
      route.cells.forEach(([x, y], i) => {
        const [px, py] = route.cells[i - 1] ?? [x, y]
        const step = Math.hypot((x - px) * cell.w, (y - py) * cell.h)
        arrivals.push((arrivals[i - 1] ?? 0) + step / STAR_SPEED)
      })
      const leg = (arrivals.at(-1) ?? 0) + HOP_HOLD
      // A two-way arrow gets two whole trips, out and then back, with a gap between them.
      const duration = route.both ? leg * 2 + TURN_GAP : leg
      const reversed = [...route.cells].reverse()
      markers.push({
        element: star,
        duration,
        at: (ms) => {
          const back = ms > leg
          const run = back ? ms - leg - TURN_GAP : ms
          star.style.visibility = run < 0 ? 'hidden' : ''
          if (run < 0) return
          const cells = back ? reversed : route.cells
          let i = 0
          while (i + 1 < arrivals.length && (arrivals[i + 1] ?? 0) <= run) i++
          const [x, y] = cells[i] ?? [0, 0]
          star.style.translate = `${x * cell.w}px ${y * cell.h}px`
        },
      })
    }
  }

  const period = Math.max(0, ...markers.map((marker) => marker.duration)) + REST_MS
  let frame = 0
  const start = performance.now()
  const tick = (now: number) => {
    const elapsed = (now - start) % period
    for (const marker of markers) {
      const moving = elapsed < marker.duration
      marker.element.style.visibility = moving ? '' : 'hidden'
      if (moving) marker.at(elapsed)
    }
    frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
  return () => {
    cancelAnimationFrame(frame)
    for (const marker of markers) marker.element.remove()
  }
}

for (const figure of document.querySelectorAll<HTMLElement>('[data-diagram]')) {
  const steps: string[][] = JSON.parse(figure.dataset.diagram ?? '[]')
  const items = [...figure.querySelectorAll<HTMLElement>('.diagram-steps li')]
  const board = figure.querySelector<HTMLElement>('[data-board]')
  const drawing = figure.querySelector<HTMLElement>('[data-canvas]')
  const tools = figure.querySelector<HTMLElement>('.diagram-tools')
  const bar = figure.querySelector<HTMLElement>('.diagram-bar')
  const now = figure.querySelector<HTMLElement>('.diagram-now')
  const dots = [...figure.querySelectorAll<HTMLButtonElement>('[data-go]')]
  if (!board || !drawing || !tools || !bar || !now || steps.length === 0) continue
  const view = canvas(board, drawing)
  let stop = () => {}

  let index = 0
  const show = (target: number) => {
    index = (target + steps.length) % steps.length
    const lit = new Set(steps[index])
    for (const edge of figure.querySelectorAll<HTMLElement | SVGElement>('[data-step]')) {
      edge.toggleAttribute('data-on', Number(edge.dataset.step) === index + 1)
    }
    for (const node of figure.querySelectorAll<HTMLElement | SVGElement>('[data-node]')) {
      node.toggleAttribute('data-on', lit.has(node.dataset.node ?? ''))
    }
    dots.forEach((dot, i) => {
      if (i === index) dot.setAttribute('aria-current', 'step')
      else dot.removeAttribute('aria-current')
    })
    now.innerHTML = items[index]?.innerHTML ?? ''
    stop()
    stop = animate(drawing, index + 1)
  }

  // A party or an arrow leads to its step: an arrow's own, a party's first.
  board.addEventListener('click', (event) => {
    if (view.wasDragged()) return
    const target = event.target as Element
    const edge = target.closest<HTMLElement | SVGElement>('[data-step]')
    if (edge) return show(Number(edge.dataset.step) - 1)
    const node = target.closest<HTMLElement | SVGElement>('[data-node]')
    if (!node) return
    const first = steps.findIndex((names) => names.includes(node.dataset.node ?? ''))
    if (first >= 0) show(first)
  })
  board.addEventListener('keydown', (event) => {
    const keys: Record<string, () => void> = {
      ArrowLeft: () => show(index - 1),
      ArrowRight: () => show(index + 1),
      '+': view.zoomIn,
      '=': view.zoomIn,
      '-': view.zoomOut,
      '0': view.reset,
    }
    const act = keys[event.key]
    if (!act || event.metaKey || event.ctrlKey || event.altKey) return
    event.preventDefault()
    act()
  })

  tools.querySelector('[data-zoom="1"]')?.addEventListener('click', view.zoomIn)
  tools.querySelector('[data-zoom="-1"]')?.addEventListener('click', view.zoomOut)
  tools.querySelector('[data-fit]')?.addEventListener('click', view.reset)
  bar.querySelector('[data-back]')?.addEventListener('click', () => show(index - 1))
  bar.querySelector('[data-next]')?.addEventListener('click', () => show(index + 1))
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => show(i))
  })

  // The words keep the height of the longest step's, so nothing under them moves from step to
  // step; measured again whenever the bar's width changes.
  let measuredWidth = 0
  const holdHeight = () => {
    if (bar.clientWidth === measuredWidth) return
    measuredWidth = bar.clientWidth
    now.style.minHeight = ''
    const shown = now.innerHTML
    let tallest = 0
    for (const item of items) {
      now.innerHTML = item.innerHTML
      tallest = Math.max(tallest, now.offsetHeight)
    }
    now.innerHTML = shown
    now.style.minHeight = `${tallest}px`
  }
  new ResizeObserver(holdHeight).observe(bar)

  board.tabIndex = 0
  figure.classList.add('diagram-live')
  tools.hidden = false
  bar.hidden = false
  show(0)
}
