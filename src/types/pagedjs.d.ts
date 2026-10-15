declare module 'pagedjs' {
  export class Previewer {
    preview(content: HTMLElement | string, stylesheets?: unknown[], renderTo?: HTMLElement): Promise<unknown>
  }
  export class Polisher {
    constructor()
  }
}
