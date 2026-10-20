import { describe, expect, it } from 'vitest'
import { buildDocxDocument } from './exporters'
import type { Project } from '@/core/types'
import type { SceneDoc } from '@/core/json'

const baseProject: Project = {
  id: 'test-proj',
  version: 1,
  title: 'La Mia Opera',
  mode: 'screenplay',
  author: 'Autore Principale',
  binder: [
    {
      id: 'sc1',
      title: 'Scena 1',
      kind: 'scene',
      metadata: {},
    },
  ],
  snapshots: {},
  settings: {
    fontFamily: 'Courier Prime',
    fontSizePt: 12,
    author: 'Autore Principale',
    titlePage: {
      title: 'La Mia Opera',
      author: 'Autore Principale',
      contact: 'test@example.com',
    },
  },
  createdAt: '',
  modifiedAt: '',
}

const scenes: Record<string, SceneDoc> = {
  sc1: {
    type: 'doc',
    content: [
      {
        type: 'scene_heading',
        content: [{ type: 'text', text: 'INT. UFFICIO - GIORNO' }],
      },
      {
        type: 'action',
        content: [{ type: 'text', text: 'Un testo descrittivo.' }],
      },
    ],
  },
}

describe('buildDocxDocument', () => {
  it('creates two sections when title page is present: frontespizio without footer, body with footer', async () => {
    const docx = await import('docx')
    const jszip = await import('jszip')
    const JSZip = (jszip as any).default || jszip

    const doc = await buildDocxDocument(baseProject, scenes)
    const buf = await docx.Packer.toBuffer(doc)
    const zip = await JSZip.loadAsync(buf)

    const docXml = await zip.file('word/document.xml')?.async('text')
    expect(docXml).toBeDefined()

    // Title page section + body section = 2 sectPr elements in document.xml
    const sectPrMatches = docXml!.match(/<w:sectPr/g)
    expect(sectPrMatches).toHaveLength(2)

    // The footer file exists and contains the Word PAGE field
    const footerXml = await zip.file('word/footer1.xml')?.async('text')
    expect(footerXml).toBeDefined()
    expect(footerXml).toContain('PAGE')
  })

  it('creates one section with footer when title page is disabled', async () => {
    const docx = await import('docx')
    const jszip = await import('jszip')
    const JSZip = (jszip as any).default || jszip

    const noTitleProject: Project = {
      ...baseProject,
      title: 'Untitled',
      author: '',
      settings: {
        ...baseProject.settings,
        author: '',
        titlePage: { disabled: true } as any,
      },
    }

    const doc = await buildDocxDocument(noTitleProject, scenes)
    const buf = await docx.Packer.toBuffer(doc)
    const zip = await JSZip.loadAsync(buf)

    const docXml = await zip.file('word/document.xml')?.async('text')
    expect(docXml).toBeDefined()

    // Only 1 section (the body)
    const sectPrMatches = docXml!.match(/<w:sectPr/g)
    expect(sectPrMatches).toHaveLength(1)

    // The footer still contains the page number field
    const footerXml = await zip.file('word/footer1.xml')?.async('text')
    expect(footerXml).toBeDefined()
    expect(footerXml).toContain('PAGE')
  })

  it('isolates novel part headings on their own single page with page break before chapter', async () => {
    const docx = await import('docx')
    const jszip = await import('jszip')
    const JSZip = (jszip as any).default || jszip

    const novelProject: Project = {
      ...baseProject,
      mode: 'novel',
      binder: [
        {
          id: 'part1',
          title: 'Parte prima',
          kind: 'folder',
          metadata: {},
          children: [
            {
              id: 'sc1',
              title: 'Capitolo 1',
              kind: 'scene',
              metadata: {},
            },
          ],
        },
      ],
    }

    const doc = await buildDocxDocument(novelProject, scenes)
    const buf = await docx.Packer.toBuffer(doc)
    const zip = await JSZip.loadAsync(buf)

    const docXml = await zip.file('word/document.xml')?.async('text')
    expect(docXml).toBeDefined()
    expect(docXml).toContain('PARTE PRIMA')

    // Title page + Part heading section (unnumbered) + Chapter scene section (numbered from 1) = 3 sectPr
    const sectPrMatches = docXml!.match(/<w:sectPr/g)
    expect(sectPrMatches).toHaveLength(3)
    // Page numbering starts at 1 on the chapter scene
    expect(docXml).toContain('w:start="1"')
  })

  it('omits footer in DOCX export when pageNumbers is false', async () => {
    const docx = await import('docx')
    const jszip = await import('jszip')
    const JSZip = (jszip as any).default || jszip

    const noPageNumProject: Project = {
      ...baseProject,
      settings: {
        ...baseProject.settings,
        pageNumbers: false,
      },
    }

    const doc = await buildDocxDocument(noPageNumProject, scenes)
    const buf = await docx.Packer.toBuffer(doc)
    const zip = await JSZip.loadAsync(buf)

    // The footer file should NOT exist when pageNumbers is false
    const footerXml = await zip.file('word/footer1.xml')?.async('text')
    expect(footerXml).toBeUndefined()
  })

  it('packs to docx blob without errors', async () => {
    const docx = await import('docx')
    const doc = await buildDocxDocument(baseProject, scenes)
    const blob = await docx.Packer.toBlob(doc)
    expect(blob.size).toBeGreaterThan(1000)
  })
})
