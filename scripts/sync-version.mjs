import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const checkOnly = process.argv.includes('--check')
const rootDir = process.cwd()
const pkgPath = resolve(rootDir, 'package.json')
const cargoPath = resolve(rootDir, 'src-tauri/Cargo.toml')
const lockPath = resolve(rootDir, 'src-tauri/Cargo.lock')

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
const targetVersion = pkg.version

if (!targetVersion) {
  console.error('[sync-version] Errore: versione non trovata in package.json!')
  process.exit(1)
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function syncLock(lock) {
  const pattern = new RegExp(
    `(\\[\\[package\\]\\]\\r?\\nname = "${escapeRegExp(pkg.name)}"\\r?\\nversion = ")[^"]*(")`,
  )
  if (!pattern.test(lock)) {
    console.error(`[sync-version] Errore: blocco "${pkg.name}" non trovato in src-tauri/Cargo.lock!`)
    process.exit(1)
  }
  return lock.replace(pattern, `$1${targetVersion}$2`)
}

const files = [
  { path: cargoPath, sync: (text) => text.replace(/^version = "[^"]*"/m, `version = "${targetVersion}"`) },
  { path: lockPath, sync: syncLock },
]

let outOfSync = false

for (const file of files) {
  const current = readFileSync(file.path, 'utf-8')
  const next = file.sync(current)
  const relativePath = file.path.slice(rootDir.length + 1).replace(/\\/g, '/')

  if (current === next) {
    console.log(`[sync-version] ${relativePath} e gia allineato a v${targetVersion}`)
    continue
  }

  outOfSync = true
  if (checkOnly) {
    console.error(`[sync-version] ${relativePath} non allineato a v${targetVersion}`)
  } else {
    writeFileSync(file.path, next, 'utf-8')
    console.log(`[sync-version] Sincronizzato ${relativePath} -> v${targetVersion}`)
  }
}

if (checkOnly && outOfSync) process.exit(1)
