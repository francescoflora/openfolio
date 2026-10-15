# 📖 OpenFolio

> **L'ambiente di scrittura open source, minimale e focalizzato per sceneggiatori e narratori.**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-amber.svg)](LICENSE)
[![Tauri 2](https://img.shields.io/badge/Desktop-Tauri%202.x-24c8db.svg)](https://tauri.app/)
[![React 19](https://img.shields.io/badge/Frontend-React%2019-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)](https://www.typescriptlang.org/)

---

## ✨ Cos'è OpenFolio?

**OpenFolio** è un software desktop open source progettato per chi scrive storie complesse — che si tratti di un lungometraggio cinematografico, una serie TV, un romanzo o un racconto.

Unisce la disciplina tipografica del formato sceneggiatura standard di Hollywood alla flessibilità strutturale necessaria per la stesura di romanzi e saggi, eliminando le distrazioni e mettendo sempre al centro il testo.

---

## 🚀 Caratteristiche principali

### 🎬 Modalità Sceneggiatura (Screenplay)
- **Formattazione standard industriale**: Intestazioni scena (`INT./EXT.`), Personaggi, Battute, Transizioni, Inserti e Parentetiche conformi alle convenzioni cinematografiche.
- **Parentetiche automatiche intelligenti**: inserimento guidato senza interruzioni di flusso e transizione fluida alla battuta.
- **Navigazione rapida**: tabulazione e tasto invio ottimizzati per scrivere senza staccare le mani dalla tastiera.

### 📚 Modalità Romanzo (Novel)
- **Impaginazione editoriale**: supporto per capitoli, sezioni numerate, rientri prima riga e testo giustificato.
- **Calcolo cartelle editoriali**: conteggio in tempo reale di parole, battute con e senza spazi, e cartelle editoriali standard (1.800 battute).

### 🗂️ Struttura & Organizzazione (The Binder)
- **Raccoglitore gerarchico**: organizza liberamente atti, capitoli, sezioni e scene con drag-and-drop.
- **Corkboard (Bacheca)**: visualizza le scene come schede di sinossi con codici colore e stati di avanzamento (Bozza, In revisione, Finale).
- **Outline (Scaletta)**: visione panoramica a elenco con statistiche dettagliate per capitolo e scena.

### 🎨 Design & Tipografia
- **Tipografia per elemento**: personalizza i caratteri per ciascuna tipologia di testo (Courier Prime, EB Garamond, Inter, Lora, ecc.) mantenendo impostazioni indipendenti per progetto e software.
- **Tema Scuro & Chiaro**: interfaccia satinata ad alto contrasto per sessioni di scrittura notturne prolungate.

### 📤 Interoperabilità e Formati di File
- **Nuovo formato nativo**: salvataggio in formato aperto `.openfolio` (con retrocompatibilità per i file `.scriptforge`).
- **Importazione**:
  - Final Draft (`.fdx`)
  - Fountain (`.fountain`)
  - File di testo semplice (`.txt`)
- **Esportazione ad alta fedeltà**:
  - **PDF**: rendering nativo ultra-veloce con copertina, numerazione pagine e sezioni centrate.
  - **Word (`.docx`)**: esportazione pulita con stili coerenti per revisione ed editing editoriale.
  - **Final Draft (`.fdx`)** e **Fountain (`.fountain`)**
  - **EPUB**, **Markdown (`.md`)** e **Testo (`.txt`)**

---

## 🛠️ Stack Tecnologico

- **Core Desktop**: [Tauri 2](https://tauri.app/) (Rust) — consumo di risorse minimo, sicurezza e avvio istantaneo.
- **Interfaccia Utente**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/) e [Tailwind CSS](https://tailwindcss.com/).
- **Editor Rich Text**: [ProseMirror](https://prosemirror.net/) con schema ed estensioni dedicate per sceneggiatura e narrativa.
- **Generazione Documenti**: Parser nativi Rust per PDF (`printpdf`), FDX (`quick-xml`) e Fountain.

---

## 💻 Installazione & Sviluppo Locale

Prerequisiti: [Node.js](https://nodejs.org/) (>= 18) e toolchain [Rust](https://rustup.rs/).

```bash
# Clona il repository
git clone https://github.com/francescoflora/openfolio.git
cd openfolio

# Installa le dipendenze
npm install

# Avvia in modalità sviluppo con hot-reload
npm run dev

# Avvia l'app desktop completa con Tauri
npm run tauri dev

# Compila l'eseguibile di produzione
npm run tauri build
```

---

## 📄 Licenza

Distribuito sotto licenza **GPL-3.0-or-later**. Consulta il file `LICENSE` per ulteriori dettagli.
