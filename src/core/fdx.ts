import type { JSONContent, SceneDoc } from './json'
import { textOf } from './stats'

const EL_TO_FDX: Record<string, string> = {
  scene_heading: 'Scene Heading',
  action: 'Action',
  character: 'Character',
  parenthetical: 'Parenthetical',
  dialogue: 'Dialogue',
  transition: 'Transition',
  shot: 'Shot',
}

const FDX_TO_EL: Record<string, string> = Object.fromEntries(
  Object.entries(EL_TO_FDX).map(([k, v]) => [v, k]),
)

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function unescapeXml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export function serializeFdx(scenes: SceneDoc[]): string {
  const paragraphs: string[] = []
  for (const doc of scenes) {
    for (const node of doc.content) {
      const type = EL_TO_FDX[node.type ?? ''] ?? 'Action'
      const text = textOf(node, ' ')
      paragraphs.push(`      <Paragraph Type="${type}">\n        <Text>${escapeXml(text)}</Text>\n      </Paragraph>`)
    }
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<FinalDraft DocumentType="Script" Template="No" Version="1">
  <Content>
${paragraphs.join('\n')}
  </Content>
</FinalDraft>
`
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

const TEXT_RE = /<Text[^>]*>([\s\S]*?)<\/Text>/g

function paragraphText(inner: string): string {
  let out = ''
  let m: RegExpExecArray | null
  TEXT_RE.lastIndex = 0
  while ((m = TEXT_RE.exec(inner))) out += unescapeXml(m[1]!)
  if (!out && inner.trim()) out = unescapeXml(inner.replace(/<[^>]+>/g, ''))
  return out
}

export function parseFdx(xml: string): SceneDoc[] {
  const withoutTitle = xml.replace(/<TitlePage[\s\S]*?<\/TitlePage>/i, '')
  const paraRe = /<Paragraph\s+([^>]*?)>([\s\S]*?)<\/Paragraph>/g
  const nodes: { type: string; text: string }[] = []

  let m: RegExpExecArray | null
  while ((m = paraRe.exec(withoutTitle))) {
    const attrs = m[1]!
    const typeMatch = /Type="([^"]+)"/i.exec(attrs)
    const el = (typeMatch && FDX_TO_EL[typeMatch[1]!]) || 'action'
    nodes.push({ type: el, text: paragraphText(m[2]!) })
  }

  if (!nodes.length) return [{ type: 'doc', content: [{ type: 'action' }] }]

  const scenes: SceneDoc[] = []
  let current: JSONContent[] = []
  const flush = () => {
    if (current.length) scenes.push({ type: 'doc', content: current })
    current = []
  }
  for (const n of nodes) {
    if (n.type === 'scene_heading' && current.length) flush()
    current.push(n.text ? { type: n.type, content: [{ type: 'text', text: n.text }] } : { type: n.type })
  }
  flush()
  return scenes
}
