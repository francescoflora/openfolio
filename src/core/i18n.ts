import type { ElementType } from './schema/screenplay'
import type { Language, SceneStatus } from './types'
import { DEFAULT_LANGUAGE } from './types'

export { DEFAULT_LANGUAGE }
export type { Language }

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'it', label: 'Italiano' },
  { id: 'en', label: 'English' },
]

const ELEMENT_LABELS: Record<Language, Record<ElementType, string>> = {
  it: {
    scene_heading: 'Intestazione scena',
    action: 'Azione',
    character: 'Personaggio',
    parenthetical: 'Parentetica',
    dialogue: 'Dialogo',
    transition: 'Transizione',
    shot: 'Inquadratura',
  },
  en: {
    scene_heading: 'Scene Heading',
    action: 'Action',
    character: 'Character',
    parenthetical: 'Parenthetical',
    dialogue: 'Dialogue',
    transition: 'Transition',
    shot: 'Shot',
  },
}

const STATUS_LABELS: Record<Language, Record<SceneStatus, string>> = {
  it: { idea: 'Idea', outline: 'Scaletta', draft: 'Bozza', revised: 'Revisionato', final: 'Finale' },
  en: { idea: 'Idea', outline: 'Outline', draft: 'Draft', revised: 'Revised', final: 'Final' },
}

/** Accepts any stored value and falls back to Italian. */
export function normalizeLanguage(value: unknown): Language {
  return value === 'en' ? 'en' : DEFAULT_LANGUAGE
}

export function elementLabels(lang?: Language): Record<ElementType, string> {
  return ELEMENT_LABELS[lang ?? DEFAULT_LANGUAGE]
}

export function statusLabels(lang?: Language): Record<SceneStatus, string> {
  return STATUS_LABELS[lang ?? DEFAULT_LANGUAGE]
}

export function elementLabel(lang: Language | undefined, el: string): string {
  return (elementLabels(lang) as Record<string, string>)[el] ?? el
}

const UI_STRINGS = {
  it: {
    // Splash
    splashSteps: [
      'Inizializzazione motore di scrittura...',
      'Caricamento librerie e font tipografici...',
      'Preparazione ambiente di lavoro...',
      'Pronto.',
    ],
    splashSubtitle: 'Sceneggiature & Romanzi · Studio Professionale',
    splashSkip: 'Premi per saltare',
    splashClickTitle: 'Fai clic per avviare subito',
    // StartScreen & Templates
    startSubtitle: 'Crea un nuovo progetto o riprendi da un file salvato.',
    templateScreenplayName: 'Sceneggiatura',
    templateScreenplayDesc: 'Sceneggiatura standard per cinema, serie TV e cortometraggi.',
    templateNovelName: 'Romanzo',
    templateNovelDesc: 'Manoscritto in prosa organizzato per capitoli e scene con tracciamento parole.',
    openProjectBtn: 'Apri progetto…',
    openProjectTitle: 'Apri un file di progetto (.openfolio)',
    importFountainTitle: 'Importa da Fountain (.fountain)',
    importFdxTitle: 'Importa da Final Draft (.fdx)',
    importTxtBtn: 'Testo (.txt)…',
    importTxtTitle: 'Importa da file di testo (.txt)',
    recentsHeader: 'Recenti',
    removeRecentTitle: 'Rimuovi dai recenti',
    // Welcome
    welcomeScreenplay: 'Progetto sceneggiatura',
    welcomeNovel: 'Progetto romanzo',
    welcomeHint: 'scegli una scena dal Binder o creane una nuova.',
    newSceneBtn: 'Nuova scena',
    // TopBar
    newBtn: 'Nuovo',
    openBtn: 'Apri',
    moreOpenOptions: 'Altre opzioni di apertura',
    importHeader: 'Importa',
    importFountainMenu: 'Importa da Fountain (.fountain)…',
    importFdxMenu: 'Importa da Final Draft (.fdx)…',
    importTxtMenu: 'Importa da Testo (.txt)…',
    closeProjectMenu: 'Chiudi progetto',
    saveBtn: 'Salva',
    saveProjectTitle: 'Salva il file di progetto (Ctrl+S)',
    moreSaveOptions: 'Altre opzioni di salvataggio',
    saveAsMenu: 'Salva con nome…',
    exportHeader: 'Esporta',
    unsavedChanges: 'Modifiche non salvate',
    savedChanges: 'Modifiche salvate',
    titlePageBtn: 'Frontespizio',
    themeBtn: 'Tema',
    aboutBtn: 'Informazioni su OpenFolio',
    toastSaved: 'Salvataggio completato',
    toastSaveError: 'Salvataggio non riuscito',
    // LanguageMenu
    langAndSpellcheck: 'Lingua e controllo ortografico',
    languageLabel: 'Lingua',
    spellcheckLabel: 'Controllo ortografico',
    // UpdateMenu & AboutModal & TitlePageModal
    checkUpdates: 'Controlla aggiornamenti',
    updatesTitle: 'Aggiornamenti',
    noUpdates: (v: string) => `Versione ${v} — nessun aggiornamento disponibile.`,
    simulatedCheck: 'Controllo simulato.',
    versionLabel: (v: string) => `Versione ${v}`,
    authorLabel: 'Autore',
    licenseLabel: 'Licenza',
    githubRepo: 'Repository GitHub',
    comingSoon: 'Disponibile a breve',
    linkInactive: 'Collegamento non ancora attivo',
    closeBtn: 'Chiudi',
    titleLabel: 'Titolo',
    contactLabel: 'Contatto',
    contactPlaceholder: 'Contatti, agente, note di copertina…',
    // Binder & Search
    addSectionTitle: 'Aggiungi sezione/parte',
    addSceneTitle: 'Aggiungi scena',
    addChapterTitle: 'Aggiungi capitolo',
    deleteTitle: 'Elimina',
    searchPlaceholder: 'Cerca nel progetto…',
    noResults: 'Nessun risultato.',
    // Editor toolbar
    elementSelectTitle: 'Tipo di elemento della riga corrente',
    chapterBtn: 'Capitolo',
    chapterBtnTitle: 'Intestazione Capitolo (H1) - Centrato, maiuscolo e con quota editoriale',
    paragraphBtn: 'Paragrafo',
    paragraphBtnTitle: 'Paragrafo di testo normale (con rientro prima riga)',
    novelHeadingPlaceholder: 'CAPITOLO I (o titolo capitolo)…',
    novelParagraphPlaceholder: 'Scrivi qui…',
    undoTitle: 'Annulla (Ctrl+Z)',
    redoTitle: 'Ripeti (Ctrl+Y)',
    justifyTitle: (on: boolean) => `Allineamento giustificato: ${on ? 'ATTIVO (ON)' : 'DISATTIVO (OFF)'}`,
    indentTitle: (on: boolean) => `Rientro prima riga paragrafi: ${on ? 'ATTIVO (ON)' : 'DISATTIVO (OFF)'}`,
    fontModalBtnTitle: 'Personalizza font per ogni tipologia di riga (Tt)',
    revisionTitle: (on: boolean) =>
      `Modalità Revisione: ${on ? 'ATTIVA (ON)' : 'DISATTIVA (OFF)'} - Il testo digitato viene evidenziato`,
    markRevisionTitle: 'Marca la selezione come revisionata',
    clearRevisionsTitle: 'Accetta tutte le revisioni (rimuove la marcatura)',
    closeNotesTitle: 'Chiudi pannello note',
    openNotesTitle: 'Apri pannello note',
    // FontModal
    fontModalTitle: 'Tipografia per Elemento',
    fontModalSubtitle: 'Scegli il font per ciascuna riga. La scelta rimane predefinita per il progetto e per lo strumento.',
    defaultFontOption: 'Predefinito',
    resetBtn: 'Ripristina',
    autoParenLabel: 'Inserisci automaticamente le parentesi tonde ()',
    autoParenActive: 'Attive (consigliato)',
    autoParenInactive: 'Disattivate',
    resetSettingsBtn: 'Reset impostazioni',
    resetSettingsTitle: 'Torna ai valori predefiniti del software OpenFolio per il progetto e per lo strumento',
    resetSettingsNotice: 'Valori predefiniti ripristinati!',
    doneBtn: 'Fine',
    // Inspector
    projectHeader: 'Progetto',
    titlePageTitleLabel: 'Frontespizio — titolo',
    titlePageContactLabel: 'Frontespizio — contatto',
    wordGoalLabel: 'Obiettivo parole',
    labelField: 'Etichetta',
    synopsisLabel: 'Sinossi',
    synopsisPlaceholder: 'Riassunto della scena…',
    notesLabel: 'Note',
    notesPlaceholder: 'Note di scrittura…',
    createBtn: 'Crea',
    restoreTitle: 'Ripristina',
    noSnapshots: 'Nessuno snapshot.',
    // Corkboard, Outline & StatusBar
    wordsUnit: 'parole',
    charsUnit: 'battute',
    pagesUnit: 'cartelle',
    pagesTitle: 'Cartelle editoriali standard da 1.800 battute (spazi inclusi)',
    chapterSingular: 'capitolo',
    chapterPlural: 'capitoli',
    sceneSingular: 'scena',
    scenePlural: 'scene',
    outlineItemCol: 'Elemento',
    outlineStatusCol: 'Stato',
    outlineWordsCol: 'Parole',
    outlineSynopsisCol: 'Sinossi',
    zoomOutTitle: 'Riduci zoom (-10%)',
    zoomInTitle: 'Aumenta zoom (+10%)',
    zoomResetTitle: 'Reimposta zoom al 100%',
    zoomPageTitle: (z: number) => `Zoom pagina: ${z}%`,
    modeScreenplay: 'Sceneggiatura',
    modeNovel: 'Romanzo',
    // Export labels
    exportTxt: 'Testo semplice (.txt)',
    exportPrint: 'Stampa',
  },
  en: {
    // Splash
    splashSteps: [
      'Initializing writing engine...',
      'Loading libraries and typographic fonts...',
      'Preparing workspace...',
      'Ready.',
    ],
    splashSubtitle: 'Screenplays & Novels · Professional Studio',
    splashSkip: 'Click to skip',
    splashClickTitle: 'Click to start immediately',
    // StartScreen & Templates
    startSubtitle: 'Create a new project or resume from a saved file.',
    templateScreenplayName: 'Screenplay',
    templateScreenplayDesc: 'Standard screenplay format for film, TV series, and short films.',
    templateNovelName: 'Novel',
    templateNovelDesc: 'Prose manuscript organized by chapters and scenes with word tracking.',
    openProjectBtn: 'Open project…',
    openProjectTitle: 'Open a project file (.openfolio)',
    importFountainTitle: 'Import from Fountain (.fountain)',
    importFdxTitle: 'Import from Final Draft (.fdx)',
    importTxtBtn: 'Text (.txt)…',
    importTxtTitle: 'Import from text file (.txt)',
    recentsHeader: 'Recent',
    removeRecentTitle: 'Remove from recent',
    // Welcome
    welcomeScreenplay: 'Screenplay project',
    welcomeNovel: 'Novel project',
    welcomeHint: 'select a scene from the Binder or create a new one.',
    newSceneBtn: 'New scene',
    // TopBar
    newBtn: 'New',
    openBtn: 'Open',
    moreOpenOptions: 'More open options',
    importHeader: 'Import',
    importFountainMenu: 'Import from Fountain (.fountain)…',
    importFdxMenu: 'Import from Final Draft (.fdx)…',
    importTxtMenu: 'Import from Text (.txt)…',
    closeProjectMenu: 'Close project',
    saveBtn: 'Save',
    saveProjectTitle: 'Save project file (Ctrl+S)',
    moreSaveOptions: 'More save options',
    saveAsMenu: 'Save as…',
    exportHeader: 'Export',
    unsavedChanges: 'Unsaved changes',
    savedChanges: 'All changes saved',
    titlePageBtn: 'Title Page',
    themeBtn: 'Theme',
    aboutBtn: 'About OpenFolio',
    toastSaved: 'Project saved',
    toastSaveError: 'Save failed',
    // LanguageMenu
    langAndSpellcheck: 'Language & spellcheck',
    languageLabel: 'Language',
    spellcheckLabel: 'Spellcheck',
    // UpdateMenu & AboutModal & TitlePageModal
    checkUpdates: 'Check for updates',
    updatesTitle: 'Updates',
    noUpdates: (v: string) => `Version ${v} — no updates available.`,
    simulatedCheck: 'Simulated check.',
    versionLabel: (v: string) => `Version ${v}`,
    authorLabel: 'Author',
    licenseLabel: 'License',
    githubRepo: 'GitHub Repository',
    comingSoon: 'Coming soon',
    linkInactive: 'Link not active yet',
    closeBtn: 'Close',
    titleLabel: 'Title',
    contactLabel: 'Contact',
    contactPlaceholder: 'Contact info, agent, cover notes…',
    // Binder & Search
    addSectionTitle: 'Add section/part',
    addSceneTitle: 'Add scene',
    addChapterTitle: 'Add chapter',
    deleteTitle: 'Delete',
    searchPlaceholder: 'Search in project…',
    noResults: 'No results.',
    // Editor toolbar
    elementSelectTitle: 'Current line element type',
    chapterBtn: 'Chapter',
    chapterBtnTitle: 'Chapter Heading (H1) - Centered, uppercase with editorial spacing',
    paragraphBtn: 'Paragraph',
    paragraphBtnTitle: 'Standard text paragraph (with first-line indent)',
    novelHeadingPlaceholder: 'CHAPTER I (or chapter title)…',
    novelParagraphPlaceholder: 'Write here…',
    undoTitle: 'Undo (Ctrl+Z)',
    redoTitle: 'Redo (Ctrl+Y)',
    justifyTitle: (on: boolean) => `Justified alignment: ${on ? 'ON' : 'OFF'}`,
    indentTitle: (on: boolean) => `First-line paragraph indent: ${on ? 'ON' : 'OFF'}`,
    fontModalBtnTitle: 'Customize font per element type (Tt)',
    revisionTitle: (on: boolean) =>
      `Revision Mode: ${on ? 'ON' : 'OFF'} - Newly typed text is highlighted`,
    markRevisionTitle: 'Mark selection as revised',
    clearRevisionsTitle: 'Accept all revisions (clear marks)',
    closeNotesTitle: 'Close notes panel',
    openNotesTitle: 'Open notes panel',
    // FontModal
    fontModalTitle: 'Element Typography',
    fontModalSubtitle: 'Choose the font for each element. Saved as default for both project and app.',
    defaultFontOption: 'Default',
    resetBtn: 'Reset',
    autoParenLabel: 'Automatically insert parentheses ()',
    autoParenActive: 'Enabled (recommended)',
    autoParenInactive: 'Disabled',
    resetSettingsBtn: 'Reset settings',
    resetSettingsTitle: 'Restore OpenFolio software defaults for project and app',
    resetSettingsNotice: 'Defaults restored!',
    doneBtn: 'Done',
    // Inspector
    projectHeader: 'Project',
    titlePageTitleLabel: 'Title page — title',
    titlePageContactLabel: 'Title page — contact',
    wordGoalLabel: 'Word goal',
    labelField: 'Label',
    synopsisLabel: 'Synopsis',
    synopsisPlaceholder: 'Scene summary…',
    notesLabel: 'Notes',
    notesPlaceholder: 'Writing notes…',
    createBtn: 'Create',
    restoreTitle: 'Restore',
    noSnapshots: 'No snapshots.',
    // Corkboard, Outline & StatusBar
    wordsUnit: 'words',
    charsUnit: 'chars',
    pagesUnit: 'pages',
    pagesTitle: 'Standard editorial pages (1,800 characters including spaces)',
    chapterSingular: 'chapter',
    chapterPlural: 'chapters',
    sceneSingular: 'scene',
    scenePlural: 'scenes',
    outlineItemCol: 'Item',
    outlineStatusCol: 'Status',
    outlineWordsCol: 'Words',
    outlineSynopsisCol: 'Synopsis',
    zoomOutTitle: 'Zoom out (-10%)',
    zoomInTitle: 'Zoom in (+10%)',
    zoomResetTitle: 'Reset zoom to 100%',
    zoomPageTitle: (z: number) => `Page zoom: ${z}%`,
    modeScreenplay: 'Screenplay',
    modeNovel: 'Novel',
    // Export labels
    exportTxt: 'Plain text (.txt)',
    exportPrint: 'Print',
  },
} as const

export function uiText(lang?: Language) {
  return UI_STRINGS[normalizeLanguage(lang)]
}
