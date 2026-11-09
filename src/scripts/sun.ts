/**
 * The sun's elevation over Riga, shown in the home page's local-time panel. Low-precision solar
 * position, good to about a degree.
 */
const LATITUDE = 56.95
const LONGITUDE = 24.11
const RAD = Math.PI / 180

function sunElevation(date: Date): number {
  const days = date.getTime() / 86_400_000 - 10_957.5
  const anomaly = (357.529 + 0.98560028 * days) * RAD
  const meanLongitude = 280.459 + 0.98564736 * days
  const longitude = (meanLongitude + 1.915 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly)) * RAD
  const obliquity = (23.439 - 0.00000036 * days) * RAD
  const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(longitude), Math.cos(longitude))
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(longitude))
  const siderealHours = (18.697374558 + 24.06570982441908 * days) % 24
  const hourAngle = (siderealHours * 15 + LONGITUDE) * RAD - rightAscension
  const latitude = LATITUDE * RAD
  return (
    Math.asin(
      Math.sin(latitude) * Math.sin(declination) +
        Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle),
    ) / RAD
  )
}

function update() {
  const elevation = sunElevation(new Date())

  for (const el of document.querySelectorAll('[data-sun]')) el.textContent = elevation.toFixed(1)
  for (const el of document.querySelectorAll<HTMLElement>('[data-sun-word]')) {
    el.textContent = (elevation > 0 ? el.dataset.above : el.dataset.below) ?? ''
  }
  for (const el of document.querySelectorAll<HTMLElement>('[data-sun-wrap]')) el.hidden = false
}

update()
setInterval(update, 5 * 60_000)
