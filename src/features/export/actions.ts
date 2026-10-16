import { useProject } from '@/store/useProject'
import { saveExport } from '@/core/fileio'
import { compileMarkdown, compileText, compileUnits } from '@/core/compile'
import { hasCustomTitle, slug } from '@/core/stats'
import type { BinderNode, Project } from '@/core/types'
import type { JSONContent, SceneDoc } from '@/core/json'
import { nativeExportFdx, nativeExportFountain, nativeExportPdf } from '@/core/native'
import { uiText } from '@/core/i18n'

export type ExportFormat = 'fountain' | 'fdx' | 'txt' | 'md' | 'docx' | 'epub' | 'pdf'

export const EXPORT_LABEL: Record<ExportFormat, string> = {
  fountain: 'Fountain (.fountain)',
  fdx: 'Final Draft (.fdx)',
  txt: 'Testo semplice (.txt)',
  md: 'Markdown (.md)',
  docx: 'Word (.docx)',
  epub: 'EPUB (.epub)',
  pdf: 'PDF (.pdf)',
}

export const ALL_FORMATS: ExportFormat[] = ['fdx', 'fountain', 'pdf', 'docx', 'txt', 'md', 'epub']

export const FORMATS_BY_MODE = {
  screenplay: ALL_FORMATS,
  novel: ALL_FORMATS,
} as Record<string, ExportFormat[]>

function orderedDocs(): SceneDoc[] {
  const { project, scenes } = useProject.getState()
  if (!project) return []
  const docs: SceneDoc[] = []
  const walk = (nodes: BinderNode[]) => {
    for (const n of nodes) {
      if (n.kind === 'scene' && scenes[n.id]) docs.push(scenes[n.id]!)
      else if (n.children) walk(n.children)
    }
  }
  walk(project.binder)
  return docs
}

function compileExportDocs(project: Project, scenes: Record<string, SceneDoc>): SceneDoc[] {
  const units = compileUnits(project, scenes)
  const docs: SceneDoc[] = []
  let pendingHeadings: JSONContent[] = []
  const isNovel = project.mode === 'novel'

  for (const u of units) {
    if (u.kind === 'heading') {
      const elType = isNovel ? 'heading' : 'section_heading'
      pendingHeadings.push({
        type: elType,
        attrs: isNovel ? { level: Math.min(u.level + 1, 3) } : undefined,
        content: [{ type: 'text', text: u.text }],
      })
    } else {
      if (pendingHeadings.length > 0) {
        docs.push({
          ...u.doc,
          content: [...pendingHeadings, ...u.doc.content],
        })
        pendingHeadings = []
      } else {
        docs.push(u.doc)
      }
    }
  }

  if (pendingHeadings.length > 0) {
    docs.push({
      type: 'doc',
      content: pendingHeadings,
    })
  }

  return docs
}

export async function runExport(format: ExportFormat): Promise<boolean> {
  const { project, scenes, language } = useProject.getState()
  if (!project) return false
  const t = uiText(language)
  const formatLabel = format === 'txt' ? (language === 'it' ? 'Testo' : 'Text') : EXPORT_LABEL[format]
  const base = slug(project.title)

  useProject.getState().startOperation('export', t.exportingProgress(formatLabel), t.exportingProgressHint)

  try {
    await new Promise((r) => setTimeout(r, 200))
    let saved = false

    switch (format) {
      case 'fountain': {
        const text = await nativeExportFountain(orderedDocs())
        saved = await saveExport(`${base}.fountain`, text, 'text/plain', [{ name: 'Fountain', extensions: ['fountain'] }])
        break
      }
      case 'fdx': {
        const xml = await nativeExportFdx(orderedDocs())
        saved = await saveExport(`${base}.fdx`, xml, 'application/xml', [
          { name: 'Final Draft', extensions: ['fdx'] },
        ])
        break
      }
      case 'txt':
        saved = await saveExport(`${base}.txt`, compileText(project, scenes), 'text/plain', [{ name: 'Testo', extensions: ['txt'] }])
        break
      case 'md':
        saved = await saveExport(`${base}.md`, compileMarkdown(project, scenes), 'text/markdown', [{ name: 'Markdown', extensions: ['md'] }])
        break
      case 'docx': {
        const { exportDocx } = await import('./exporters')
        saved = await exportDocx(project, scenes)
        break
      }
      case 'epub': {
        const { exportEpub } = await import('./exporters')
        saved = await exportEpub(project, scenes)
        break
      }
      case 'pdf': {
        const fontFamily =
          project.settings.elementFonts?.paragraph ||
          project.settings.fontFamily ||
          (project.mode === 'screenplay' ? 'Courier Prime' : 'EB Garamond')

        const hasTitlePage = Boolean(
          project.settings.titlePage?.title ||
          project.settings.titlePage?.author ||
          project.settings.titlePage?.contact ||
          project.settings.author ||
          project.author ||
          hasCustomTitle(project.title),
        )

        const pdfBytes = await nativeExportPdf({
          title: project.settings.titlePage?.title?.trim() || project.title.trim(),
          mode: project.mode,
          author: project.settings.titlePage?.author?.trim() || project.settings.author?.trim() || project.author?.trim(),
          contact: project.settings.titlePage?.contact?.trim(),
          language: project.settings.language,
          font_family: fontFamily,
          font_size_pt: project.settings.fontSizePt,
          justify: project.settings.justify,
          indent: project.settings.indent,
          has_title_page: hasTitlePage,
          page_size: 'letter',
          scenes: compileExportDocs(project, scenes),
        })
        if (pdfBytes) {
          saved = await saveExport(`${base}.pdf`, pdfBytes, 'application/pdf', [{ name: 'Documento PDF', extensions: ['pdf'] }])
        } else {
          const { printProject } = await import('./print')
          await printProject(project, scenes)
          saved = true
        }
        break
      }
    }

    if (saved) {
      useProject.getState().finishOperation('success', t.exportCompleted(formatLabel), t.exportCompletedHint)
      return true
    } else {
      useProject.getState().dismissOperation()
      return false
    }
  } catch (err) {
    console.error('Esportazione non riuscita', err)
    useProject.getState().finishOperation('error', t.exportFailed(formatLabel), t.exportFailedHint)
    return false
  }
}
