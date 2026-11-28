// Generates the PigeonHTML post's examples from Pigeon's own sanitizer and validator, since the
// site's build can't reach that repository: the pages shown in frames (public/looks/pigeon/pages/),
// src/content/pigeonhtml/examples.json, which records the Pigeon commit it came from, and the
// sanitizer itself bundled for the post's live editor (vendor/pigeonhtml/).
//
//   PIGEON=../pigeon node scripts/pigeonhtml-examples.mjs           writes them
//   PIGEON=../pigeon node scripts/pigeonhtml-examples.mjs --check   fails if any would change
//
// An example source marks what it expects the sanitizer to drop with ⟦ ⟧. The run fails unless
// every problem the validator reports starts at or before a mark that names it, and every mark has
// one (or is the end tag of an element that has), so the struck-through parts the post shows are
// the ones Pigeon drops.
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { git, WORKSPACE } from './lib.mjs'

const PIGEON = resolve(WORKSPACE, process.env.PIGEON ?? '../pigeon')
const PACKAGE = join(PIGEON, 'packages/pigeonhtml/src')
const { sanitize, validate, PAGE_BUDGET_BYTES, PIGEONHTML_VERSION } = await import(
  pathToFileURL(join(PACKAGE, 'index.ts')).href
)
const { ELEMENT_TABLE, DROPPED_WITH_CONTENT } = await import(
  pathToFileURL(join(PACKAGE, 'allowlists.ts')).href
)

const { STILL_MARQUEE_CSS, stillMarquees } = await import(
  pathToFileURL(join(WORKSPACE, 'src/lib/still-marquee.ts')).href
)

const CONTENT = join(WORKSPACE, 'src/content/pigeonhtml')
const FRAMES = join(WORKSPACE, 'public/looks/pigeon/pages')
const FRAMES_URL = '/looks/pigeon/pages'
const VENDOR = join(WORKSPACE, 'vendor/pigeonhtml')
const COMMIT = git(PIGEON, 'rev-parse', '--short', 'HEAD').trim()

/** Every file the run makes, by path, written at the end or, with --check, compared. */
const outputs = new Map()

/** Images the pages may load, by the name they use, and the file in Pigeon each one is. */
const IMAGES = { 'pigeon.png': 'assets/brand/pigeon-48.png' }

const urls = {
  // A data: URL reaches the host only when Pigeon's own check passes it, as an image.
  image: (src) =>
    src.startsWith('data:') ? src : src in IMAGES ? `${FRAMES_URL}/${src}` : undefined,
  link: (href) => (href.startsWith('pigeon://') || href.startsWith('#') ? href : undefined),
}

// Pigeon's base stylesheet for a page's frame (apps/web/src/apps/explorer/page-frame/
// frame-document.ts), pointed at the look's copies of the two fonts, with still marquees added.
const SANS = ['Tahoma', 'Verdana', 'Arial', 'Helvetica', 'Geneva', 'Trebuchet MS']
const MONO = ['Courier New', 'Courier', 'Lucida Console', 'Monaco']
const face = (family, url, format) =>
  `@font-face{font-family:"${family}";src:url("${url}") format("${format}")}`
const BASE_STYLESHEET = [
  ...SANS.map((family) => face(family, '/looks/pigeon/wine-tahoma.woff2', 'woff2')),
  ...MONO.map((family) => face(family, '/looks/pigeon/vera-sans-mono.ttf', 'truetype')),
  'html{font-family:"Tahoma"}',
  'pre,tt,code,kbd,samp,xmp,listing,plaintext{font-family:"Courier New"}',
  'img{image-rendering:pixelated}',
  'blink{animation:pg-blink 1s steps(1) infinite}',
  '@keyframes pg-blink{50%{visibility:hidden}}',
  '@media (prefers-reduced-motion:reduce){blink{animation:none}}',
  // This site's own addition: marquees stand still too (src/lib/still-marquee.ts).
  STILL_MARQUEE_CSS,
].join('\n')
const POLICY = "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; font-src 'self'"

/** The document Explorer writes into a page's frame: policy, base styles, the page, no doctype. */
const frameDocument = (html) =>
  `<meta http-equiv="Content-Security-Policy" content="${POLICY}"><style>${BASE_STYLESHEET}</style>${html}\n`

const fail = (message) => {
  console.error(`pigeonhtml-examples: ${message}`)
  process.exit(1)
}

/** The source without its marks, and each mark's line, columns and text, 1-based as Problem is. */
function readMarks(marked) {
  const marks = []
  const lines = marked.split('\n').map((line, index) => {
    const segments = []
    let plain = ''
    for (const part of line.split(/(⟦[^⟧]*⟧)/)) {
      if (part === '') continue
      const dropped = part.startsWith('⟦')
      const text = dropped ? part.slice(1, -1) : part
      if (dropped) marks.push({ line: index + 1, column: plain.length + 1, text })
      segments.push(dropped ? { text, dropped } : { text })
      plain += text
    }
    if (/[⟦⟧]/.test(plain)) fail(`line ${index + 1}: a mark is left open`)
    return { plain, segments }
  })
  return { source: lines.map((line) => line.plain).join('\n'), lines, marks }
}

/** The name a problem's message gives, as the source would spell it. */
function named(message) {
  const match =
    message.match(/^<([a-z0-9]+)>/) ??
    message.match(/^The (\S+) attribute/) ??
    message.match(/^The CSS property (\S+)/) ??
    message.match(/^This address can't be used: (.*)$/) ??
    message.match(/^(@\S+) isn't/)
  return match?.[1]
}

/** A mark's text as the browser reads it: character references and CSS escapes decoded. */
const decoded = (text) =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\\([0-9a-f]{1,6}) ?/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))

/** What a problem drops, as a short label: `<video>`, `loading` attribute, the address. */
function dropLabel(message) {
  const name = named(message)
  if (message.startsWith('<')) return `<${name}>`
  if (message.startsWith('This address')) return 'the address'
  if (message.startsWith('This CSS selector')) return 'the rule'
  if (message.includes(' attribute ')) return `${name} attribute`
  return name
}

/**
 * Every problem starts at or before a mark on its line that names it; every mark is claimed.
 * Each claimed mark gets the label of what it drops.
 */
function checkMarks(marks, problems, id) {
  const claimed = new Set()
  const elements = new Set()
  for (const problem of problems) {
    const name = named(problem.message)
    // A selector's message names nothing, so it takes the next mark whatever that holds.
    const anyMark = problem.message.startsWith('This CSS selector')
    const mark = marks.find(
      (candidate) =>
        !claimed.has(candidate) &&
        // An attribute's problems are reported where it starts, and its value can run on.
        (candidate.line > problem.line ||
          (candidate.line === problem.line && candidate.column >= problem.column)) &&
        (anyMark ||
          (name !== undefined &&
            (candidate.text.includes(name) || decoded(candidate.text).includes(name)))),
    )
    if (!mark) fail(`${id}: ${problem.line}:${problem.column} "${problem.message}" has no mark`)
    claimed.add(mark)
    mark.label = dropLabel(problem.message)
    if (problem.message.startsWith('<')) elements.add(name)
  }
  for (const mark of marks) {
    const endTag = mark.text.match(/^<\/([a-z0-9]+)>$/)?.[1]
    if (!claimed.has(mark) && !elements.has(endTag)) {
      fail(`${id}: the mark "${mark.text}" at ${mark.line}:${mark.column} drops nothing`)
    }
  }
}

function writeFrame(id, html) {
  outputs.set(join(FRAMES, `${id}.html`), frameDocument(stillMarquees(html)))
}

const pages = {}

// The frame the live editor writes each page into, as Explorer writes into a blank one.
writeFrame('blank', '')

// Pigeon's own start page, as Explorer serves it from this computer.
{
  const source = readFileSync(
    join(PIGEON, 'apps/web/src/apps/explorer/local-pages/home.html'),
    'utf8',
  )
  const result = sanitize(source, urls)
  if (result.removed.length > 0) fail(`home: the sanitizer drops ${JSON.stringify(result.removed)}`)
  if (validate(source).length > 0) fail('home: not valid PigeonHTML')
  writeFrame('home', result.html)
  pages.home = {
    address: 'pigeon://home',
    title: result.title,
    bytes: result.bytes,
    status: 'On this computer',
  }
}

// A page written the way a page is written now, and what's left of it. Its source is a snippet
// too, below.
const mika = readMarks(readFileSync(join(CONTENT, 'mika.html'), 'utf8'))
checkMarks(mika.marks, validate(mika.source), 'mika')
{
  const result = sanitize(mika.source, urls)
  writeFrame('mika', result.html)
  pages.mika = {
    address: 'pigeon://mika',
    title: result.title,
    bytes: result.bytes,
    status: 'Done',
  }
  // The same source unsanitized, for a browser of today, less its script: the frame's sandbox would
  // block it, and say so in the console.
  writeFrame('mika-today', mika.source.replace(/^\s*<script\b.*<\/script>\n/m, ''))
  pages['mika-today'] = {
    address: 'pigeon://mika',
    title: `${result.title} as written`,
    bytes: result.bytes,
    status: 'Not sanitized',
  }
}

/** What happens to an element: kept, its tags dropped and its text kept, or dropped whole. */
function fate(name) {
  const { html } = sanitize(`<p><${name}>text</${name}></p>`, urls)
  if (html.includes(`<${name}`)) return 'kept'
  return html.includes('text') ? 'unwrapped' : 'dropped'
}

/**
 * Elements by what they're for. Kept and dropped must name every element in Pigeon's tables
 * exactly once; the ones off both lists, a sample, are each checked to lose their tags only.
 */
const GROUPS = {
  kept: [
    ['Document', 'html head title style body'],
    ['Blocks', 'div p center blockquote address pre hr br wbr nobr fieldset legend'],
    ['Headings', 'h1 h2 h3 h4 h5 h6'],
    ['Type of the era', 'font basefont big small tt u s strike blink marquee'],
    ['Text', 'b i em strong cite code dfn kbd samp var abbr acronym q sub sup span del ins bdo'],
    ['Links and images', 'a img map area'],
    ['Lists', 'ul ol li dl dt dd dir menu'],
    ['Tables', 'table caption colgroup col thead tbody tfoot tr th td'],
  ],
  unwrapped: [
    ['Sections', 'header footer main nav article aside section figure figcaption'],
    ['Inline', 'mark time meter progress output'],
    ['Widgets', 'details summary dialog'],
    ['Forms', 'form button label'],
  ],
  dropped: [
    ['Scripts', 'script noscript template'],
    ['Other documents', 'iframe frame frameset noframes object embed applet param portal'],
    ['Media', 'audio video source track picture canvas'],
    ['Form controls', 'input select option optgroup textarea datalist keygen isindex'],
    ['Metadata', 'base link meta'],
    ['Raw text', 'xmp listing plaintext noembed'],
    ['Foreign', 'svg math'],
  ],
}
const elements = Object.fromEntries(
  Object.entries(GROUPS).map(([group, rows]) => [
    group,
    rows.map(([label, names]) => ({ label, names: names.split(' ') })),
  ]),
)
const listed = (group) => elements[group].flatMap((row) => row.names).sort()
const same = (a, b) => a.length === b.length && a.every((name, index) => name === b[index])
const KEPT = [...Object.keys(ELEMENT_TABLE), 'html', 'head', 'body', 'title', 'style'].sort()
if (!same(listed('kept'), KEPT)) fail(`kept groups ${listed('kept')} aren't Pigeon's ${KEPT}`)
const DROPPED = [...DROPPED_WITH_CONTENT].sort()
if (!same(listed('dropped'), DROPPED)) fail(`dropped groups aren't Pigeon's ${DROPPED}`)
for (const name of listed('unwrapped')) {
  if (fate(name) !== 'unwrapped') fail(`<${name}> is ${fate(name)}, not unwrapped`)
}

// Sources that look harmless, or nearly, and a stylesheet a page might bring: laid out over lines
// as a person would write them, with what Pigeon drops marked as in an example page.
const SNIPPETS = {
  'tab-in-scheme': '<a href="⟦java&#x09;script:steal()⟧">\n  Free smileys\n</a>',
  'data-page': '<a href="⟦data:text/html,&lt;script&gt;steal()&lt;/script&gt;⟧">\n  My page\n</a>',
  'data-image': '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="\n  alt="">',
  'fixed-layer':
    '<div style="⟦position: fixed;⟧\n  top: 0; left: 0;\n  width: 100%; height: 100%">',
  'high-layer': '<div style="position: absolute;\n  ⟦z-index: 2147483647⟧">',
  'big-cursor': '<p style="⟦cursor: url(huge.png), auto⟧">',
  'named-image': '<img src="pigeon.png"\n  ⟦name="cookie"⟧ alt="">',
  'comment-gap': '<p style="⟦width: 100/**/px⟧">',
  'escaped-name': '<p style="⟦\\70 osition: fixed⟧">',
  'style-import': '<style>\n  ⟦@import url(theme.css);⟧\n  p { color: red }\n</style>',
  stylesheet: [
    '<style>',
    '  ⟦@import url(theme.css);⟧',
    '  ⟦@font-face { font-family: Comic; src: url(comic.ttf) }⟧',
    '  body {',
    '    background: #10183a url(pigeon.png);',
    '    color: #f0f0f0;',
    '    font: 13px Verdana;',
    '  }',
    '  a:hover { color: #ffcc33; text-decoration: underline }',
    '  .nav li { display: inline; list-style-type: square }',
    '  .card {',
    '    float: left;',
    '    width: 200px;',
    '    padding: 12px;',
    '    border: 2px outset #c0c0c0;',
    '    ⟦border-radius: 16px;⟧',
    '    ⟦box-shadow: 0 8px 24px #000;⟧',
    '    ⟦display: flex;⟧',
    '    ⟦gap: 12px;⟧',
    '    ⟦width: calc(100% - 2em);⟧',
    '  }',
    '  .card img { position: absolute; z-index: 10 }',
    '  .card:hover {',
    '    cursor: pointer;',
    '    ⟦transform: rotate(3deg);⟧',
    '    ⟦transition: transform 0.2s;⟧',
    '    ⟦opacity: 0.5;⟧',
    '  }',
    '  .newsletter { ⟦position: fixed;⟧ bottom: 0; ⟦z-index: 9999;⟧ }',
    '  .title { ⟦color: var(--brand);⟧ ⟦width: 100vw;⟧ }',
    '  ⟦p:not(.intro) { color: red }⟧',
    '  ⟦@media (min-width: 600px) { .card { float: none } }⟧',
    '  @media print { .newsletter { display: none } }',
    '</style>',
  ].join('\n'),
}
const snippets = {
  mika: {
    source: mika.source,
    marks: mika.marks.filter((mark) => mark.label !== undefined),
    removed: sanitize(mika.source, urls).removed,
  },
}
Object.assign(
  snippets,
  Object.fromEntries(
    Object.entries(SNIPPETS).map(([id, marked]) => {
      const { source, marks } = readMarks(marked)
      checkMarks(marks, validate(source), id)
      const { removed } = sanitize(source, urls)
      if (removed.length !== marks.length)
        fail(`${id}: drops ${removed.length}, marks ${marks.length}`)
      return [id, { source, marks, removed }]
    }),
  ),
)

// Tags left open make the parser rebuild them inside every later element: well under the budget,
// but more than Pigeon will build.
{
  const source = `<div>${Array.from({ length: 250 }, (_, i) => `<b id=${i}>`).join('')}</div>${'<div>x</div>'.repeat(7000)}`
  const { removed } = sanitize(source, urls)
  if (removed[0]?.name !== '#document') fail('open-tags: the page is built')
  if (source.length > PAGE_BUDGET_BYTES) fail('open-tags: over the budget, so never parsed')
  snippets['open-tags'] = {
    source: '<div>\n  <b id=0><b id=1> … <b id=249>\n</div>\n<div>x</div> × 7,000',
    marks: [],
    removed,
  }
}

for (const [name, file] of Object.entries(IMAGES)) {
  outputs.set(join(FRAMES, name), readFileSync(join(PIGEON, file)))
}

/** What the bundle is and the licences of what's in it: Pigeon's, parse5's and entities'. */
function licences() {
  const parse5 = realpathSync(join(PACKAGE, '../node_modules/parse5'))
  const texts = [
    ['@pigeon/pigeonhtml', PIGEON],
    ['parse5', parse5],
    ['entities', join(dirname(parse5), 'entities')],
  ].map(([name, dir]) => `${name}\n\n${readFileSync(join(dir, 'LICENSE'), 'utf8').trim()}`)
  const text = [
    `@pigeon/pigeonhtml from Pigeon ${COMMIT}, bundled with its parser by scripts/pigeonhtml-examples.mjs in tomszir.com.`,
    ...texts,
  ].join('\n\n')
  if (text.includes('*/')) fail('a licence would close the comment')
  return text
}

// The sanitizer and its parser as one module, for the live editor, with types for its exports.
{
  const { outputFiles } = await build({
    entryPoints: [join(PACKAGE, 'index.ts')],
    absWorkingDir: PIGEON,
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'es2022',
    legalComments: 'inline',
    write: false,
    // A legal comment, so it survives the site's own minifying bundle of the editor's script.
    banner: { js: `/*! ${licences()} */` },
  })
  outputs.set(join(VENDOR, 'pigeonhtml.js'), outputFiles[0].text)
  outputs.set(
    join(VENDOR, 'pigeonhtml.d.ts'),
    `// The exports of pigeonhtml.js, from Pigeon's packages/pigeonhtml/src/types.ts and index.ts.\n\n${readFileSync(
      join(PACKAGE, 'types.ts'),
      'utf8',
    ).replace(/^\/\/.*\n\n/, '')}
export declare const PIGEONHTML_VERSION: string
export declare const PAGE_BUDGET_BYTES: number
export declare function sanitize(source: string, urls: PageUrls): Sanitized
export declare function validate(source: string): readonly Problem[]
`,
  )
}

const examples = {
  pigeon: { commit: COMMIT, version: PIGEONHTML_VERSION, budget: PAGE_BUDGET_BYTES },
  pages,
  elements,
  snippets,
  fonts: { sans: SANS, mono: MONO },
}
outputs.set(join(CONTENT, 'examples.json'), `${JSON.stringify(examples, null, 2)}\n`)
// What the live editor needs to write a frame, apart from the rest so its script carries only this.
const frame = {
  document: frameDocument('{page}'),
  images: Object.fromEntries(Object.keys(IMAGES).map((name) => [name, `${FRAMES_URL}/${name}`])),
}
outputs.set(join(CONTENT, 'frame.json'), `${JSON.stringify(frame, null, 2)}\n`)

/** A file's text without the Pigeon commit it names, so a newer Pigeon that changes nothing passes. */
const withoutCommit = (text) =>
  text.replace(/Pigeon [0-9a-f]{7,}/g, 'Pigeon').replace(/"commit": "[0-9a-f]+"/, '"commit": ""')

if (process.argv.includes('--check')) {
  const recorded = JSON.parse(readFileSync(join(CONTENT, 'examples.json'), 'utf8')).pigeon.commit
  const stale = [...outputs].filter(([path, contents]) => {
    if (!existsSync(path)) return true
    const current = readFileSync(path)
    return Buffer.isBuffer(contents)
      ? !current.equals(contents)
      : withoutCommit(current.toString('utf8')) !== withoutCommit(contents)
  })
  if (stale.length > 0) {
    fail(
      `out of date with Pigeon ${COMMIT} (made from ${recorded}): ${stale.map(([path]) => relative(WORKSPACE, path)).join(', ')}. Run it without --check.`,
    )
  }
  console.log(`pigeonhtml-examples: up to date with Pigeon ${COMMIT} (made from ${recorded})`)
} else {
  for (const [path, contents] of outputs) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, contents)
  }
  console.log(
    `pigeonhtml-examples: ${Object.keys(pages).length} pages, ${Object.keys(snippets).length} snippets and the sanitizer from Pigeon ${COMMIT}`,
  )
}
