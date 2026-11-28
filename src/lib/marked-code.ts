/** A part of a source to strike through: where it starts, by line and column from 1, and its text. */
export interface Mark {
  line: number
  column: number
  text: string
}

/** A note written under a line of code, starting at a column, the way a compiler points at it. */
export interface Note {
  line: number
  column: number
  text: string
}

interface Hast {
  type: string
  tagName?: string
  value?: string
  properties?: Record<string, unknown>
  children?: Hast[]
}

/** Each mark as offsets into the source: where it starts and where it ends. */
export function markRanges(source: string, marks: Mark[]): [number, number][] {
  const lineStarts = [0]
  for (const [offset, char] of [...source].entries()) if (char === '\n') lineStarts.push(offset + 1)
  return marks.map(({ line, column, text }) => {
    const start = (lineStarts[line - 1] ?? 0) + column - 1
    return [start, start + text.length]
  })
}

/** The text a hast node holds. */
const textOf = (node: Hast): string => node.value ?? (node.children ?? []).map(textOf).join('')

/**
 * A Shiki transformer that strikes through the given ranges of the source, splitting tokens where a
 * range starts or ends so only the marked characters are struck, and writes each note on a line of
 * its own under the line it points at. Each line carries its indent (`--indent`), so a line that
 * wraps can carry on under its own start rather than at the left edge.
 */
export function markedCode(ranges: [number, number][], notes: Note[] = []) {
  const cuts = new Set(ranges.flat())
  const isMarked = (offset: number) =>
    ranges.some(([start, end]) => offset >= start && offset < end)
  return {
    name: 'marked-code',
    tokens(tokens: { content: string; offset: number }[][]) {
      return tokens.map((line) =>
        line.flatMap((token) => {
          const parts = []
          let from = 0
          for (let at = 1; at < token.content.length; at++) {
            if (!cuts.has(token.offset + at)) continue
            parts.push({
              ...token,
              content: token.content.slice(from, at),
              offset: token.offset + from,
            })
            from = at
          }
          parts.push({ ...token, content: token.content.slice(from), offset: token.offset + from })
          return parts
        }),
      )
    },
    span(hast: Hast, _line: number, _col: number, _element: Hast, token: { offset: number }) {
      if (isMarked(token.offset)) hast.tagName = 'del'
    },
    code(code: Hast) {
      const children = code.children ?? []
      const lines = children.filter((child) => child.tagName === 'span')
      for (const note of [...notes].sort((a, b) => b.line - a.line)) {
        const after = lines[note.line - 1]
        if (!after) continue
        children.splice(
          children.indexOf(after) + 1,
          0,
          { type: 'text', value: '\n' },
          {
            type: 'element',
            tagName: 'span',
            properties: { class: 'note' },
            children: [{ type: 'text', value: `${' '.repeat(note.column - 1)}${note.text}` }],
          },
        )
      }
      for (const line of children.filter((child) => child.tagName === 'span')) {
        const indent = textOf(line).match(/^ */)?.[0].length ?? 0
        line.properties = { ...line.properties, style: `--indent: ${indent}ch` }
      }
    },
  }
}
