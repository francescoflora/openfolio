import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const rootDir = process.cwd()
const pkgPath = resolve(rootDir, 'package.json')
const cargoPath = resolve(rootDir, 'src-tauri/Cargo.toml')

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
const targetVersion = pkg.version

if (!targetVersion) {
  console.error('[sync-version] Errore: versione non trovata in package.json!')
  process.exit(1)
}

// 1. Sincronizza Cargo.toml
let cargo = readFileSync(cargoPath, 'utf-8')
const updatedCargo = cargo.replace(/^version = "[^"]*"/m, `version = "${targetVersion}"`)

if (cargo !== updatedCargo) {
  writeFileSync(cargoPath, updatedCargo, 'utf-8')
  console.log(`[sync-version] Sincronizzato src-tauri/Cargo.toml -> v${targetVersion}`)
} else {
  console.log(`[sync-version] src-tauri/Cargo.toml e gia allineato a v${targetVersion}`)
}
