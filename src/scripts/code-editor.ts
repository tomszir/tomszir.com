// A code editor for a post: CodeMirror in the site's code colours, with problems shown where they
// are. It takes the place of a <textarea>, which keeps its value, so the page still has the source
// without it. A page that uses it bundles it into its own script; nothing else carries it.
// Tab indents, as in any code editor; Esc then Tab still moves focus on, which CodeMirror gives
// every editor.
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import {
  bracketMatching,
  HighlightStyle,
  indentNodeProp,
  indentOnInput,
  indentRange,
  indentUnit,
  LRLanguage,
  syntaxHighlighting,
} from '@codemirror/language'
import { type Diagnostic, linter, lintGutter } from '@codemirror/lint'
import { EditorState, RangeSetBuilder } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  drawSelection,
  EditorView,
  highlightActiveLine,
  keymap,
  lineNumbers,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view'
import { parser as cssParser } from '@lezer/css'
import { type Tag, tags } from '@lezer/highlight'
import { configureNesting, parser as htmlParser } from '@lezer/html'
import dark from '../styles/code/instrument-dark.json'
import light from '../styles/code/instrument-light.json'

/** Something wrong in the source, where it starts, from 1, as Pigeon's validator reports it. */
export interface Problem {
  line: number
  column: number
  message: string
}

interface Options {
  /** Called with the source after each change. */
  onChange?: (source: string) => void
  /** The problems in a source, shown underlined from where each starts, with its message. */
  check?: (source: string) => readonly Problem[]
}

type Theme = typeof light

/** A theme's colour and style for a TextMate scope, the way the site's highlighted code takes it. */
const scoped = (theme: Theme, scope: string) =>
  theme.tokenColors.find((token) => [token.scope ?? []].flat().includes(scope))?.settings

/**
 * HTML with CSS in its <style> elements and style attributes, indented by element: a line inside
 * an element goes one step in from the line it opened on, its end tag back out. Made from the
 * parsers, not @codemirror/lang-html, which would bring a JavaScript parser for <script> as well;
 * the indent rules are that package's, cut to these.
 */
const htmlWithCss = LRLanguage.define({
  name: 'html',
  // A line is indented again once it's an end tag, so typing one steps back out.
  languageData: { indentOnInput: /^\s*<\/\w+\W$/ },
  parser: htmlParser.configure({
    props: [
      indentNodeProp.add({
        Element(context) {
          const after = /^(\s*)(<\/)?/.exec(context.textAfter)
          if (context.node.to <= context.pos + (after?.[0].length ?? 0)) return context.continue()
          return context.lineIndent(context.node.from) + (after?.[2] ? 0 : context.unit)
        },
        'OpenTag CloseTag SelfClosingTag'(context) {
          return context.column(context.node.from) + context.unit
        },
        // At the end of a page whose last element isn't closed yet, as while it's being typed.
        Document(context) {
          if (context.pos + (/\s*/.exec(context.textAfter)?.[0].length ?? 0) < context.node.to) {
            return context.continue()
          }
          let open = null
          for (let node = context.node; ; ) {
            const last = node.lastChild
            if (last?.name !== 'Element' || last.to !== node.to) break
            open = node = last
          }
          const end = open?.lastChild?.name
          if (open && end !== 'CloseTag' && end !== 'SelfClosingTag') {
            return context.lineIndent(open.from) + context.unit
          }
          return null
        },
      }),
    ],
    wrap: configureNesting(
      [{ tag: 'style', parser: cssParser }],
      [{ name: 'style', parser: cssParser.configure({ top: 'Styles' }) }],
    ),
  }),
})

/** Indents every line by the page's structure, the way Enter indents a new one. */
export function format(view: EditorView): boolean {
  view.dispatch({ changes: indentRange(view.state, 0, view.state.doc.length) })
  return true
}

/** Lezer's highlighting tags, each drawn like the TextMate scope the code blocks use for it. */
const SCOPES: [Tag[], string][] = [
  [[tags.tagName], 'entity.name.tag'],
  [[tags.attributeName], 'entity.other.attribute-name'],
  [[tags.attributeValue, tags.string], 'string'],
  [[tags.comment], 'comment'],
  [[tags.angleBracket, tags.punctuation, tags.separator, tags.bracket], 'punctuation'],
  [[tags.propertyName], 'support.type.property-name'],
  [[tags.keyword, tags.modifier, tags.definitionKeyword], 'keyword'],
  [[tags.number, tags.unit, tags.atom, tags.color], 'constant.numeric'],
  [[tags.className, tags.typeName], 'entity.name.type'],
]

const highlighting = HighlightStyle.define(
  SCOPES.map(([tag, scope]) => {
    const inLight = scoped(light, scope)
    const inDark = scoped(dark, scope)
    return {
      tag,
      color: `light-dark(${inLight?.foreground}, ${inDark?.foreground})`,
      fontStyle: inLight && 'fontStyle' in inLight ? inLight.fontStyle : undefined,
    }
  }),
)

/**
 * Each visible line marked with its indent (`--indent`), so a line that wraps carries on under its
 * own start, a step in, rather than at the left edge; the stylesheet does the rest.
 */
const hangingIndent = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = this.mark(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) this.decorations = this.mark(update.view)
    }

    mark(view: EditorView) {
      const marks = new RangeSetBuilder<Decoration>()
      for (const { from, to } of view.visibleRanges) {
        for (let at = from; at <= to; ) {
          const line = view.state.doc.lineAt(at)
          const indent = /^ */.exec(line.text)?.[0].length ?? 0
          marks.add(
            line.from,
            line.from,
            Decoration.line({ attributes: { style: `--indent: ${indent}ch` } }),
          )
          at = line.to + 1
        }
      }
      return marks.finish()
    }
  },
  { decorations: (plugin) => plugin.decorations },
)

/** A problem underlined from where it starts to the end of the word or tag it starts. */
function diagnostic(state: EditorState, { line, column, message }: Problem): Diagnostic {
  const at = state.doc.line(Math.min(line, state.doc.lines))
  const from = Math.min(at.from + column - 1, at.to)
  const word = at.text.slice(from - at.from).match(/^[^\s"';>]+>?/)?.[0].length ?? 1
  return { from, to: Math.min(from + word, at.to), severity: 'error', message }
}

/** Puts an editor where the textarea was, labelled as it was, and keeps the textarea's value. */
export function codeEditor(textarea: HTMLTextAreaElement, { onChange, check }: Options = {}) {
  const label = textarea.labels?.[0]?.textContent ?? 'Code'
  const view = new EditorView({
    state: EditorState.create({
      doc: textarea.value,
      extensions: [
        lineNumbers(),
        history(),
        drawSelection(),
        highlightActiveLine(),
        bracketMatching(),
        htmlWithCss,
        syntaxHighlighting(highlighting),
        indentUnit.of('  '),
        indentOnInput(),
        keymap.of([
          { key: 'Shift-Alt-f', run: format },
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        EditorView.lineWrapping,
        hangingIndent,
        EditorView.editorAttributes.of({ class: 'code-editor' }),
        EditorView.contentAttributes.of({ 'aria-label': label, spellcheck: 'false' }),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return
          textarea.value = update.state.doc.toString()
          onChange?.(textarea.value)
        }),
        ...(check
          ? [
              linter(
                (view) =>
                  check(view.state.doc.toString()).map((problem) =>
                    diagnostic(view.state, problem),
                  ),
                {
                  delay: 150,
                },
              ),
              lintGutter(),
            ]
          : []),
      ],
    }),
  })
  textarea.after(view.dom)
  textarea.hidden = true
  // The label still names the hidden textarea, so a click on it is sent on to the editor.
  textarea.labels?.[0]?.addEventListener('click', () => view.focus())
  return view
}
