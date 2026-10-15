export const REVISION_COLORS: Record<string, string> = {
  amber: '#b45309',
  blue: '#1d4ed8',
  green: '#15803d',
  red: '#b91c1c',
}

export const revisionMarkSpec = {
  attrs: { color: { default: 'amber' } },
  inclusive: false,
  parseDOM: [
    {
      tag: 'span.revision',
      getAttrs: (el: HTMLElement) => ({ color: el.dataset.color || 'amber' }),
    },
  ],
  toDOM: (node: { attrs: Record<string, string> }) =>
    [
      'span',
      {
        class: 'revision',
        'data-color': node.attrs.color,
        style: `color:${REVISION_COLORS[node.attrs.color] ?? REVISION_COLORS.amber}`,
      },
      0,
    ] as const,
}
