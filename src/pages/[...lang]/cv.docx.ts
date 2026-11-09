import type { APIRoute } from 'astro'
import {
  AlignmentType,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  Tab,
  TabStopType,
  TextRun,
} from 'docx'
import { langOf, langPaths, t } from '../../i18n'
import { type Fact, getCv } from '../../lib/cv'
import { site } from '../../site'

export const getStaticPaths = langPaths

// Word measures in twentieths of a point (twips) and text in half-points.
const CM = 567
const FONT = 'Times New Roman'
/** A4 less 2 cm margins each side: where right-aligned years sit. */
const TEXT_WIDTH = 17 * CM

const heading = (text: string) => new Paragraph({ heading: HeadingLevel.HEADING_2, text })

const facts = (items: Fact[]) =>
  items.map(
    (fact) =>
      new Paragraph({
        children: [new TextRun({ text: `${fact.label}: `, bold: true }), new TextRun(fact.value)],
      }),
  )

/** A title on the left and its years at the right margin, on one line, without a table. */
const titled = (title: string, years: string) =>
  new Paragraph({
    spacing: { before: 160 },
    keepNext: true,
    tabStops: [{ type: TabStopType.RIGHT, position: TEXT_WIDTH }],
    children: [
      new TextRun({ text: title, bold: true }),
      new TextRun({ children: [new Tab(), years] }),
    ],
  })

const bullet = (text: string) =>
  new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun(text)] })

/** The CV as a Word file: the same content as the page, laid out for applicant tracking systems. */
export const GET: APIRoute = async ({ url }) => {
  const lang = langOf(url.pathname)
  const { cv, availability: labels } = t(lang)
  const content = await getCv(lang)

  const doc = new Document({
    creator: content.name,
    title: `${content.name}: ${site.pages.cv[lang].title}`,
    styles: {
      default: {
        document: { run: { font: FONT, size: 22 }, paragraph: { spacing: { after: 60 } } },
        heading1: { run: { font: FONT, size: 32, bold: true, color: '000000' } },
        heading2: {
          run: { font: FONT, size: 24, bold: true, color: '000000', allCaps: true },
          paragraph: {
            spacing: { before: 240, after: 80 },
            border: { bottom: { style: 'single', size: 6, color: '000000', space: 1 } },
            keepNext: true,
          },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: 'bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 240 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 21 * CM, height: 29.7 * CM },
            margin: { top: 2 * CM, right: 2 * CM, bottom: 2 * CM, left: 2 * CM },
          },
        },
        children: [
          new Paragraph({ heading: HeadingLevel.HEADING_1, text: content.name }),
          new Paragraph(content.headline),
          new Paragraph({
            children: content.contact.flatMap((link, index) => [
              ...(index > 0 ? [new TextRun('    ')] : []),
              new ExternalHyperlink({
                link: link.href,
                children: [new TextRun({ text: link.label, style: 'Hyperlink' })],
              }),
            ]),
          }),
          new Paragraph({ spacing: { before: 120 }, children: [new TextRun(content.summary)] }),

          ...(content.availability ? [heading(labels.label), ...facts(content.availability)] : []),

          heading(cv.skills),
          ...facts(content.skills),

          heading(cv.experience),
          ...content.jobs.flatMap((job) => [
            titled(job.company, job.years),
            new Paragraph({ keepNext: true, children: [new TextRun(job.role)] }),
            new Paragraph({ children: [new TextRun({ text: job.intro, italics: true })] }),
            ...job.highlights.map(bullet),
            ...job.clients.flatMap((client) => [
              new Paragraph({
                spacing: { before: 100 },
                keepNext: true,
                children: [new TextRun({ text: `${client.name} (${client.when})`, bold: true })],
              }),
              ...client.highlights.map(bullet),
            ]),
          ]),

          heading(cv.building),
          ...content.building.flatMap((product) => [
            new Paragraph({
              spacing: { before: 120 },
              keepNext: true,
              children: [
                new ExternalHyperlink({
                  link: new URL(product.href, site.url).href,
                  children: [new TextRun({ text: product.name, bold: true, style: 'Hyperlink' })],
                }),
                new TextRun(`, ${product.role}`),
              ],
            }),
            new Paragraph(product.description),
          ]),

          heading(cv.languages),
          ...facts(content.languages),

          heading(cv.education),
          ...content.education.flatMap((study) => [
            titled(study.school, study.years),
            new Paragraph(`${study.field}. ${study.note}`),
          ]),
        ],
      },
    ],
  })

  return new Response(new Uint8Array(await Packer.toBuffer(doc)), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
  })
}
