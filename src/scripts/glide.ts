/**
 * One highlight per `[data-glide]` list that moves between its `[data-glide-item]` rows, so a
 * hover handed from row to row travels instead of fading out and back in. Without this script
 * each row highlights on its own.
 */
for (const list of document.querySelectorAll<HTMLElement>('[data-glide]')) {
  const items = [...list.querySelectorAll<HTMLElement>('[data-glide-item]')]
  if (items.length === 0) continue

  const band = document.createElement('div')
  band.className = 'glide-band'
  band.setAttribute('aria-hidden', 'true')
  list.prepend(band)

  let current = 0

  const place = (index: number, active: boolean) => {
    const item = items[index]
    if (!item) return
    current = index
    list.style.setProperty('--glide-x', `${item.offsetLeft}px`)
    list.style.setProperty('--glide-y', `${item.offsetTop}px`)
    list.style.setProperty('--glide-w', `${item.offsetWidth}px`)
    list.style.setProperty('--glide-h', `${item.offsetHeight}px`)
    list.toggleAttribute('data-glide-active', active)
    for (const [i, row] of items.entries())
      row.toggleAttribute('data-current', active && i === index)
  }

  for (const [index, item] of items.entries()) {
    item.addEventListener('pointerenter', () => place(index, true))
    item.addEventListener('focusin', () => place(index, true))
  }

  list.addEventListener('pointerleave', () => {
    if (!list.contains(document.activeElement)) place(current, false)
  })
  list.addEventListener('focusout', (event) => {
    if (!(event.relatedTarget instanceof Node && list.contains(event.relatedTarget))) {
      place(current, false)
    }
  })

  list.dataset.glideReady = ''
}
