// Loads the PigeonHTML post's editor (/pigeonhtml.js, with Pigeon's sanitizer and CodeMirror in
// it) only once its section comes near, so reading the post never pays for it.

// Each editor sits hidden in a slot that's always laid out, since a hidden element never comes
// into view.
const slots = document.querySelectorAll('[data-try-slot]')
// A variable, so the bundler leaves the import for the browser to make.
const editor = '/pigeonhtml.js'
const observer = new IntersectionObserver(
  (entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return
    observer.disconnect()
    import(editor)
  },
  { rootMargin: '800px 0px' },
)
for (const slot of slots) observer.observe(slot)
