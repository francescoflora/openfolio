import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUTPUT_DIR = path.resolve('screenshoot')

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

const screenplayProject = {
  id: 'proj_sp_01',
  version: 1,
  title: 'The Last Horizon',
  mode: 'screenplay',
  author: 'Francesco Flora',
  snapshots: {},
  settings: {
    fontFamily: 'Courier Prime',
    fontSizePt: 12,
    author: 'Francesco Flora',
    language: 'it',
    spellcheck: true,
    justify: false,
    indent: false,
    zoom: 100,
    elementFonts: {},
    autoParentheses: true,
  },
  binder: [
    {
      id: 'folder_act1',
      title: 'ATTO I - L\'ANOMALIA',
      kind: 'folder',
      metadata: {},
      children: [
        {
          id: 'sc_01',
          title: '1. EXT. DEEP SPACE - NIGHT',
          kind: 'scene',
          metadata: {
            status: 'final',
            synopsis: 'Una nave da ricognizione isolata intercetta un segnale tachionico coerente proveniente da una nebulosa inesplorata.',
            note: 'Verificare la palette cromatica dei motori per la post-produzione VFX.',
            label: 'VFX Lead',
            wordCount: 145,
            charCount: 820
          }
        },
        {
          id: 'sc_02',
          title: '2. INT. BRIDGE - CONTINUOUS',
          kind: 'scene',
          metadata: {
            status: 'revised',
            synopsis: 'Il Comandante Hayes e l\'Ufficiale Chen analizzano le oscillazioni gravitazionali della nebulosa.',
            note: 'Mantenere il ritmo serrato tra le battute di dialogo di Hayes e Chen.',
            label: 'Scena Chiave',
            wordCount: 185,
            charCount: 990
          }
        },
        {
          id: 'sc_03',
          title: '3. INT. OBSERVATION DECK - LATER',
          kind: 'scene',
          metadata: {
            status: 'draft',
            synopsis: 'Hayes osserva il nucleo luminoso mentre scattano gli allarmi di prossimità.',
            label: 'Bozza',
            wordCount: 120,
            charCount: 650
          }
        }
      ]
    },
    {
      id: 'folder_act2',
      title: 'ATTO II - NELLA NEBULOSA',
      kind: 'folder',
      metadata: {},
      children: [
        {
          id: 'sc_04',
          title: '4. INT. CORRIDOIO PRINCIPALE',
          kind: 'scene',
          metadata: {
            status: 'draft',
            synopsis: 'Malfunzionamento dei sistemi ausiliari e blackout parziale.',
            wordCount: 95,
            charCount: 540
          }
        },
        {
          id: 'sc_05',
          title: '5. INT. LABORATORIO SCIENTIFICO',
          kind: 'scene',
          metadata: {
            status: 'idea',
            synopsis: 'Chen scopre che la sequenza del segnale ha una struttura binaria vivente.',
            wordCount: 160,
            charCount: 890
          }
        }
      ]
    }
  ]
}

const screenplayDocBridge = {
  type: 'doc',
  content: [
    {
      type: 'scene_heading',
      content: [{ type: 'text', text: 'INT. PONTE DI COMANDO - CONTINUO' }]
    },
    {
      type: 'action',
      content: [
        {
          type: 'text',
          text: 'La luce d\'emergenza ambrata tinge di riflessi caldi la console centrale. Fuori dalla vetrata panoramica, la NEBULOSA K-70 pulsa come un cuore cosmico in tempesta.'
        }
      ]
    },
    {
      type: 'action',
      content: [
        {
          type: 'text',
          text: 'Il Comandante HAYES (45 anni, sguardo fermo, lineamenti scavati dalla fatica) fissa il display olografico dei sensori. Dietro di lui, l\'Ufficiale CHEN (32) digita febbrilmente sulle coordinate di rotta.'
        }
      ]
    },
    {
      type: 'character',
      content: [{ type: 'text', text: 'CHEN' }]
    },
    {
      type: 'dialogue',
      content: [
        {
          type: 'text',
          text: 'Non è un\'eco statica, Comandante. I pattern tachionici si stanno riorganizzando in tempo reale.'
        }
      ]
    },
    {
      type: 'character',
      content: [{ type: 'text', text: 'HAYES' }]
    },
    {
      type: 'parenthetical',
      content: [{ type: 'text', text: '(senza voltarsi)' }]
    },
    {
      type: 'dialogue',
      content: [
        {
          type: 'text',
          text: 'Riorganizzando in che cosa? Un segnale di soccorso o una richiesta d\'accesso ai nostri computer di bordo?'
        }
      ]
    },
    {
      type: 'character',
      content: [{ type: 'text', text: 'CHEN' }]
    },
    {
      type: 'dialogue',
      content: [
        {
          type: 'text',
          text: 'Qualunque cosa sia, se non invertiamo i vettori sub-luce entro quaranta secondi, il gradiente gravitazionale non ci lascerà scelta.'
        }
      ]
    },
    {
      type: 'action',
      content: [
        {
          type: 'text',
          text: 'Hayes avanza di un passo. Poggia le mani sui comandi manuali di pressurizzazione. Un brivido di vibrazione attraversa le paratie metalliche della nave.'
        }
      ]
    },
    {
      type: 'character',
      content: [{ type: 'text', text: 'HAYES' }]
    },
    {
      type: 'dialogue',
      content: [
        {
          type: 'text',
          text: 'Blocca i propulsori secondari. Andiamo a vedere cosa si nasconde là dentro.'
        }
      ]
    },
    {
      type: 'transition',
      content: [{ type: 'text', text: 'DISSOLVENZA IN NERO:' }]
    }
  ]
}

const novelProject = {
  id: 'proj_nv_01',
  version: 1,
  title: 'L\'Archivio dei Sussurri',
  mode: 'novel',
  author: 'Francesco Flora',
  snapshots: {},
  settings: {
    fontFamily: 'EB Garamond',
    fontSizePt: 13,
    author: 'Francesco Flora',
    language: 'it',
    spellcheck: true,
    justify: true,
    indent: true,
    zoom: 100,
    elementFonts: {
      paragraph: 'EB Garamond',
      heading: 'EB Garamond'
    },
    wordGoal: 80000
  },
  binder: [
    {
      id: 'folder_nv_p1',
      title: 'PARTE PRIMA: LE OMBRE DI PIETRA',
      kind: 'folder',
      metadata: {},
      children: [
        {
          id: 'ch_01',
          title: 'Capitolo 1: La Porta dei Manoscritti',
          kind: 'scene',
          metadata: {
            status: 'final',
            synopsis: 'Evelyn scopre un antico tomo privo di impronta ecclesiastica nella sezione sotterranea della biblioteca.',
            label: 'Incipit',
            wordCount: 1420,
            charCount: 8940
          }
        },
        {
          id: 'ch_02',
          title: 'Capitolo 2: La Luce sulla Pergamena',
          kind: 'scene',
          metadata: {
            status: 'revised',
            synopsis: 'Alla luce della lampada a olio, i caratteri miniati in oro rivelano un secondo strato crittografato.',
            wordCount: 1850,
            charCount: 11200
          }
        },
        {
          id: 'ch_03',
          title: 'Capitolo 3: Il Silenzio del Chiostro',
          kind: 'scene',
          metadata: {
            status: 'draft',
            synopsis: 'L\'incontro notturno con Padre Anselmo e il primo avvertimento sulle confraternite dell\'Inchiostro.',
            wordCount: 980,
            charCount: 5800
          }
        }
      ]
    },
    {
      id: 'folder_nv_p2',
      title: 'PARTE SECONDA: IL LABIRINTO D\'INCHIOSTRO',
      kind: 'folder',
      metadata: {},
      children: [
        {
          id: 'ch_04',
          title: 'Capitolo 4: La Chiave di Ferro',
          kind: 'scene',
          metadata: {
            status: 'idea',
            synopsis: 'La ricerca del passaggio segreto dietro la meridiana nel giardino interno.',
            wordCount: 1200,
            charCount: 6860
          }
        }
      ]
    }
  ]
}

const novelDocChapter1 = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'CAPITOLO 1: LA PORTA DEI MANOSCRITTI' }]
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'L\'odore di carta invecchiata, resina e cera d\'api era l\'unica costante tra le mura della grande biblioteca monastica. Fuori, la pioggia di novembre batteva incessante contro le vetrate ad arco, scandendo il ritmo di un silenzio antico secoli.'
        }
      ]
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Evelyn sollevò la pesante rilegatura in cuoio con mani guardinghe, attenta a non forzare le cuciture in canapa. Il frontespizio non recava alcun nome d\'autore, né la consueta formula di dedica all\'Ordine; eppure le miniature tracciate in foglia d\'oro brillavano di una purezza quasi viva, miracolosamente sottratta all\'umidità della cripta sotterranea.'
        }
      ]
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: '«Certi segreti non chiedono di essere svelati, signorina Vance,» mormorò una voce roca alle sue spalle, spezzando di colpo la quiete della sala di lettura. «Chiedono soltanto di non essere violati prima del tempo stabilito.»'
        }
      ]
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Lei non si voltò subito. Chiuse lentamente gli occhi, sfiorando il margine inciso del foglio, dove sottili glifi neri componevano una trama che non apparteneva a nessuna lingua conosciuta d\'Europa.'
        }
      ]
    }
  ]
}

async function run() {
  console.log('Launching browser...')
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--window-size=1920,1080',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--hide-scrollbars'
    ],
    defaultViewport: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    }
  })

  const page = await browser.newPage()
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' })

  // Wait for splash screen to complete
  console.log('Waiting for splash screen transition...')
  await page.waitForFunction(() => !document.querySelector('[role="dialog"][aria-label="OpenFolio"]'), { timeout: 6000 })
  await new Promise(r => setTimeout(r, 600))

  // 1. SCREENPLAY EDITOR (Screenshot 1)
  console.log('Setting up Screenshot 1: Screenplay Editor...')
  await page.evaluate((proj, doc) => {
    const s = window.useProject.getState()
    s.setLanguage('it')
    s.setTheme('light')
    s.setView('editor')
    window.useProject.setState({
      project: {
        ...proj,
        snapshots: {
          'sc_02': [
            {
              id: 'snap_01',
              at: new Date(Date.now() - 3600000).toISOString(),
              label: 'Revisione dialoghi Hayes',
              words: 185,
              doc: doc
            }
          ]
        }
      },
      scenes: {
        'sc_02': doc,
        'sc_01': { type: 'doc', content: [{ type: 'scene_heading', content: [{ type: 'text', text: '1. EXT. DEEP SPACE - NIGHT' }] }] },
        'sc_03': { type: 'doc', content: [{ type: 'scene_heading', content: [{ type: 'text', text: '3. INT. OBSERVATION DECK - LATER' }] }] },
        'sc_04': { type: 'doc', content: [{ type: 'scene_heading', content: [{ type: 'text', text: '4. INT. CORRIDOIO PRINCIPALE' }] }] },
        'sc_05': { type: 'doc', content: [{ type: 'scene_heading', content: [{ type: 'text', text: '5. INT. LABORATORIO SCIENTIFICO' }] }] },
      },
      selectedId: 'sc_02',
      binderOpen: true,
      inspectorOpen: true,
      view: 'editor',
      zoom: 100,
      dirty: false,
    })
  }, screenplayProject, screenplayDocBridge)

  await new Promise(r => setTimeout(r, 800))
  const p1 = path.join(OUTPUT_DIR, '01_screenplay_editor.png')
  await page.screenshot({ path: p1 })
  console.log('Saved:', p1)

  // 2. NOVEL MODE (Screenshot 2)
  console.log('Setting up Screenshot 2: Novel Mode...')
  await page.evaluate((proj, doc) => {
    window.useProject.setState({
      project: proj,
      scenes: {
        'ch_01': doc,
        'ch_02': { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'CAPITOLO 2' }] }] },
        'ch_03': { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'CAPITOLO 3' }] }] },
        'ch_04': { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'CAPITOLO 4' }] }] },
      },
      selectedId: 'ch_01',
      binderOpen: true,
      inspectorOpen: false,
      view: 'editor',
      theme: 'light',
      zoom: 110,
      dirty: false,
    })
  }, novelProject, novelDocChapter1)

  await new Promise(r => setTimeout(r, 800))
  const p2 = path.join(OUTPUT_DIR, '02_novel_mode.png')
  await page.screenshot({ path: p2 })
  console.log('Saved:', p2)

  // 3. BINDER & OUTLINE (Screenshot 3)
  console.log('Setting up Screenshot 3: Outline View & Structure...')
  await page.evaluate((proj, doc) => {
    window.useProject.setState({
      project: proj,
      scenes: {
        'sc_02': doc,
        'sc_01': { type: 'doc', content: [{ type: 'scene_heading', content: [{ type: 'text', text: '1. EXT. DEEP SPACE - NIGHT' }] }] },
        'sc_03': { type: 'doc', content: [{ type: 'scene_heading', content: [{ type: 'text', text: '3. INT. OBSERVATION DECK - LATER' }] }] },
        'sc_04': { type: 'doc', content: [{ type: 'scene_heading', content: [{ type: 'text', text: '4. INT. CORRIDOIO PRINCIPALE' }] }] },
        'sc_05': { type: 'doc', content: [{ type: 'scene_heading', content: [{ type: 'text', text: '5. INT. LABORATORIO SCIENTIFICO' }] }] },
      },
      selectedId: 'sc_02',
      binderOpen: true,
      inspectorOpen: false,
      view: 'outline',
      theme: 'light',
      zoom: 100,
      dirty: false,
    })
  }, screenplayProject, screenplayDocBridge)

  await new Promise(r => setTimeout(r, 800))
  const p3 = path.join(OUTPUT_DIR, '03_binder_structure.png')
  await page.screenshot({ path: p3 })
  console.log('Saved:', p3)

  // 4. CORKBOARD (Screenshot 4)
  console.log('Setting up Screenshot 4: Corkboard...')
  await page.evaluate(() => {
    window.useProject.setState({
      view: 'corkboard',
      binderOpen: true,
      inspectorOpen: false,
      theme: 'light',
    })
  })

  await new Promise(r => setTimeout(r, 800))
  const p4 = path.join(OUTPUT_DIR, '04_corkboard_synopsis.png')
  await page.screenshot({ path: p4 })
  console.log('Saved:', p4)

  // 5. EXPORT OPTIONS (Screenshot 5)
  console.log('Setting up Screenshot 5: Export Options...')
  await page.evaluate((proj, doc) => {
    window.useProject.setState({
      project: proj,
      scenes: { 'sc_02': doc },
      selectedId: 'sc_02',
      view: 'editor',
      binderOpen: true,
      inspectorOpen: false,
      theme: 'light',
    })
  }, screenplayProject, screenplayDocBridge)

  // Click Save dropdown arrow to open Export options
  await new Promise(r => setTimeout(r, 400))
  const chevronButtons = await page.$$('header button')
  let saveMenuBtn = null
  for (const btn of chevronButtons) {
    const title = await btn.evaluate(el => el.getAttribute('title') || '')
    if (title.toLowerCase().includes('opzioni di salvataggio') || title.toLowerCase().includes('save')) {
      saveMenuBtn = btn
      await btn.click()
      break
    }
  }

  // Hover over the Esporta item to reveal the export formats flyout
  await new Promise(r => setTimeout(r, 400))
  const menuButtons = await page.$$('header div.absolute button, div.absolute button')
  for (const btn of menuButtons) {
    const text = await btn.evaluate(el => el.textContent || '')
    if (text.includes('Esporta') || text.includes('Export')) {
      await btn.hover()
      break
    }
  }

  await new Promise(r => setTimeout(r, 600))
  const p5 = path.join(OUTPUT_DIR, '05_export_modal.png')
  await page.screenshot({ path: p5 })
  console.log('Saved:', p5)

  // Close the open menu by clicking the button again
  if (saveMenuBtn) {
    await saveMenuBtn.click()
    await new Promise(r => setTimeout(r, 400))
  }

  // 6. DARK MODE (Screenshot 6)
  console.log('Setting up Screenshot 6: Dark Mode...')
  await page.evaluate((proj, doc) => {
    const s = window.useProject.getState()
    s.setTheme('dark')
    window.useProject.setState({
      project: {
        ...proj,
        snapshots: {
          'sc_02': [
            {
              id: 'snap_01',
              at: new Date(Date.now() - 3600000).toISOString(),
              label: 'Bozza sequenza Hayes e Chen',
              words: 185,
              doc: doc
            }
          ]
        }
      },
      scenes: { 'sc_02': doc },
      selectedId: 'sc_02',
      view: 'editor',
      binderOpen: true,
      inspectorOpen: true,
      zoom: 100,
      dirty: false,
    })
  }, screenplayProject, screenplayDocBridge)

  await new Promise(r => setTimeout(r, 800))
  const p6 = path.join(OUTPUT_DIR, '06_dark_mode.png')
  await page.screenshot({ path: p6 })
  console.log('Saved:', p6)

  await browser.close()
  console.log('All screenshots captured successfully!')
}

run().catch(err => {
  console.error('Error capturing screenshots:', err)
  process.exit(1)
})
