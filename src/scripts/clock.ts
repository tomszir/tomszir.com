/** Fills every `[data-clock]` with the current time in the zone it names. */
for (const clock of document.querySelectorAll<HTMLTimeElement>('[data-clock]')) {
  const format = new Intl.DateTimeFormat('en-GB', {
    timeZone: clock.dataset.clock ?? 'Europe/Riga',
    hour: '2-digit',
    minute: '2-digit',
  })
  const tick = () => {
    clock.textContent = ` ${format.format(new Date())}`
  }
  tick()
  clock.hidden = false
  setInterval(tick, 30_000)
}
