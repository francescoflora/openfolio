# 📖 OpenFolio

> **The minimal, focused, open-source writing environment for screenwriters and authors.**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-amber.svg)](LICENSE)
[![Tauri 2](https://img.shields.io/badge/Desktop-Tauri%202.x-24c8db.svg)](https://tauri.app/)
[![React 19](https://img.shields.io/badge/Frontend-React%2019-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)](https://www.typescriptlang.org/)

---

## ✨ What is OpenFolio?

**OpenFolio** is an open-source desktop application crafted for writers working on complex narratives — whether feature films, TV pilots, novels, or short stories.

It combines the strict typographic discipline of the industry-standard Hollywood screenplay format with the structural flexibility needed for long-form prose and non-fiction, stripping away clutter to keep your words front and center.

---

## 🚀 Key Features

### 🎬 Screenplay Mode
- **Industry-Standard Formatting**: Scene Headings (`INT./EXT.`), Characters, Dialogue, Transitions, Shots, and Parentheticals conforming to traditional film conventions.
- **Smart Auto-Parentheticals**: Seamless inline guidance without interrupting writing momentum, transitioning naturally straight into dialogue.
- **Keyboard-First Workflow**: Optimized `Tab` and `Enter` navigation designed to keep your hands on the keyboard.

### 📚 Novel Mode
- **Editorial Layout**: Support for chapters, numbered sections, first-line indentations, and justified text.
- **Real-Time Word & Manuscript Metrics**: Live counts for words, characters (with and without spaces), and standard editorial pages (1,800 characters per page).

### 🗂️ Structure & Organization (The Binder)
- **Hierarchical Binder**: Freely structure acts, chapters, sections, and scenes with drag-and-drop reordering.
- **Corkboard**: Visualize scenes as synopsis index cards with custom color codes and workflow statuses (*Draft*, *In Review*, *Final*).
- **Outline View**: High-level tabular overview with per-chapter and per-scene statistics.

### 🎨 Design & Typography
- **Per-Element Typography**: Customize typefaces for every text type (Courier Prime, EB Garamond, Inter, Lora, etc.) with independent project-level and application defaults.
- **Dark & Light Modes**: Clean, high-contrast interface designed for comfortable extended writing sessions.

### 📤 Interoperability & File Formats
- **Open Native Format**: Save directly to transparent `.openfolio` project files.
- **Import**:
  - Final Draft (`.fdx`)
  - Fountain (`.fountain`)
  - Plain text (`.txt`)
- **High-Fidelity Export**:
  - **PDF**: Fast native rendering with cover page, page numbers, and custom margins.
  - **Word (`.docx`)**: Clean export with structured styles for editorial review and markups.
  - **Final Draft (`.fdx`)** and **Fountain (`.fountain`)**
  - **EPUB**, **Markdown (`.md`)**, and **Plain Text (`.txt`)**

---

## 🛠️ Tech Stack

- **Desktop Core**: [Tauri 2](https://tauri.app/) (Rust) — minimal resource consumption, enhanced security, and instant launch times.
- **User Interface**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), and [Tailwind CSS](https://tailwindcss.com/).
- **Rich Text Editor**: [ProseMirror](https://prosemirror.net/) with specialized schemas and input rules for screenplay and narrative writing.
- **Document Processing**: Native Rust engines for PDF rendering, FDX parsing, and Fountain conversion.

---

## 💻 Installation & Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) (>= 18)
- [Rust toolchain](https://rustup.rs/)

```bash
# Clone the repository
git clone https://github.com/francescoflora/openfolio.git
cd openfolio

# Install dependencies
npm install

# Run in development mode (browser / Vite)
npm run dev

# Run desktop application in development mode (Tauri)
npm run tauri dev

# Build production desktop application
npm run tauri build
```

---

## 📄 License

Distributed under the **GPL-3.0-or-later** license. See [LICENSE](LICENSE) for more details.
