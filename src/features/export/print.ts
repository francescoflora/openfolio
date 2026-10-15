import type { Project } from '@/core/types'
import type { SceneDoc } from '@/core/json'
import { compileHtml } from '@/core/compile'

/**
 * Renders the compiled project through Paged.js in an offscreen iframe, then
 * opens the browser print dialog (Save as PDF). Falls back to printing the raw
 * compiled HTML if Paged.js fails.
 */
export async function printProject(project: Project, scenes: Record<string, SceneDoc>): Promise<void> {
  const html = compileHtml(project, scenes, true)
  const iframe = document.createElement('iframe')
  iframe.setAttribute('style', 'position:fixed;left:-10000px;top:0;width:816px;height:1056px;border:0')
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  if (!doc) {
    iframe.remove()
    return
  }
  doc.open()
  doc.write(html)
  doc.close()

  const content = doc.body.innerHTML
  try {
    const { Previewer } = await import('pagedjs')
    const previewer = new Previewer()
    await previewer.preview(content, [], doc.body)
  } catch (err) {
    console.warn('Paged.js non disponibile, stampa senza paginazione:', err)
  }

  try {
    await doc.fonts.ready
  } catch {
    /* ignore */
  }

  iframe.contentWindow?.focus()
  iframe.contentWindow?.print()
  setTimeout(() => iframe.remove(), 3000)
}
