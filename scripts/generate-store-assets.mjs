import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUTPUT_DIR = path.resolve('screenshoot')

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

const logoSvg = fs.readFileSync(path.resolve('src/assets/logo.svg'), 'utf-8')
const splashBase64 = fs.readFileSync(path.resolve('public/splash.jpg')).toString('base64')
const splashDataUrl = `data:image/jpeg;base64,${splashBase64}`

/**
 * 1:1 Transparent Box Art (Icon)
 * Exactly like the SVG and the desktop installer icon: 100% transparent background.
 */
function getTransparentBoxArtHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100%;
      height: 100%;
      background: transparent;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon-box {
      width: 92%;
      height: 92%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon-box svg {
      width: 100%;
      height: 100%;
      display: block;
    }
  </style>
</head>
<body>
  <div class="icon-box">
    ${logoSvg}
  </div>
</body>
</html>`
}

/**
 * 2:3 Poster Art
 * Visual continuity with SplashScreen:
 * - Title: "OpenFolio" where "Folio" is solid text-amber-500 (#f59e0b) with NO gradients or special effects.
 * - Author: "Francesco" in normal light font, "Flora" in bold white.
 */
function getPosterArtHtml({ lang = 'en' } = {}) {
  const isIt = lang === 'it'

  const badgeText = isIt ? 'Studio di Scrittura Narrativa' : 'Professional Writing Studio'
  const headline = isIt
    ? 'L\'ambiente di scrittura minimale e focalizzato per <span class="amber-text">sceneggiatori</span> e <span class="amber-text">romanzieri</span>.'
    : 'The minimal, focused environment for <span class="amber-text">screenwriters</span> & <span class="amber-text">authors</span>.'
  const subtitle = isIt
    ? 'Formattazione standard Hollywood, modalità romanzo, lavagna sinottica ed esportazione universale.'
    : 'Seamless Hollywood screenplay formatting, novel structure, synopsis corkboard, and universal export.'
  const pills = isIt
    ? ['Sceneggiatura', 'Romanzo', 'Il Binder', 'Corkboard', 'PDF · Word · FDX · EPUB']
    : ['Screenplay', 'Novel Mode', 'The Binder', 'Corkboard', 'PDF · Word · FDX · EPUB']
  const poweredByLabel = isIt ? 'Sviluppato da' : 'Powered by'

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000000;
      font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
      color: #ffffff;
      -webkit-font-smoothing: antialiased;
    }
    .poster {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 84px 64px 64px 64px;
    }
    /* Sfondo originale splash.jpg */
    .bg-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: 70% center;
      transform: scale(1.05);
      z-index: 1;
      opacity: 0.95;
    }
    /* Vignettatura scura in stile SplashScreen */
    .vignette-overlay {
      position: absolute;
      inset: 0;
      z-index: 2;
      background: 
        radial-gradient(circle at 10% 20%, rgba(0, 0, 0, 0.94) 0%, rgba(0, 0, 0, 0.72) 42%, rgba(0, 0, 0, 0.1) 85%),
        linear-gradient(to top, rgba(0, 0, 0, 0.96) 0%, rgba(0, 0, 0, 0.75) 28%, rgba(0, 0, 0, 0) 55%),
        linear-gradient(to bottom, rgba(0, 0, 0, 0.92) 0%, rgba(0, 0, 0, 0.5) 25%, rgba(0, 0, 0, 0) 50%);
      pointer-events: none;
    }
    .content-top {
      position: relative;
      z-index: 3;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 18px;
    }
    .brand-row {
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .brand-logo {
      width: 96px;
      height: 96px;
      filter: drop-shadow(0 12px 24px rgba(0,0,0,0.65));
    }
    /* Titolo identico alla splash screen: font-brand text-white e Folio solido in text-amber-500 */
    .brand-name {
      font-size: 80px;
      font-weight: 700;
      line-height: 1;
      letter-spacing: -0.02em;
      color: #ffffff;
    }
    .brand-name .folio-part {
      color: #f59e0b; /* text-amber-500 senza gradienti o filtri */
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 16px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(12px);
      border-radius: 9999px;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #f8fafc;
    }
    .badge-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #f59e0b;
      box-shadow: 0 0 10px #f59e0b;
    }
    .content-bottom {
      position: relative;
      z-index: 3;
      display: flex;
      flex-direction: column;
      gap: 22px;
    }
    .headline {
      font-size: 42px;
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: -0.02em;
      max-width: 580px;
      color: #f8fafc;
      text-shadow: 0 4px 20px rgba(0, 0, 0, 0.95);
    }
    .headline .amber-text {
      color: #f59e0b;
    }
    .subtitle {
      font-family: 'Inter', sans-serif;
      font-size: 19px;
      line-height: 1.5;
      color: #cbd5e1;
      max-width: 540px;
      font-weight: 400;
      text-shadow: 0 3px 14px rgba(0, 0, 0, 0.9);
    }
    .features-pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 4px;
    }
    .pill {
      font-family: 'Inter', sans-serif;
      font-size: 13.5px;
      font-weight: 600;
      color: #e2e8f0;
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(16px);
      padding: 7px 16px;
      border-radius: 8px;
      letter-spacing: 0.04em;
    }
    .footer-bar {
      margin-top: 10px;
      padding-top: 18px;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 14.5px;
      color: #94a3b8;
      font-weight: 500;
    }
    .footer-bar .gpl {
      color: #94a3b8;
    }
    .footer-bar .gpl strong {
      color: #f1f5f9;
      font-weight: 600;
    }
    /* Stile autore identico alla SplashScreen: font-normal text-slate-300 + font-bold text-white */
    .author-credit {
      font-family: 'Outfit', sans-serif;
      letter-spacing: 0.03em;
      font-size: 15px;
    }
    .author-credit .prefix {
      color: #94a3b8;
      font-weight: 400;
    }
    .author-credit .first-name {
      font-weight: 400;
      color: #cbd5e1; /* text-slate-300 */
    }
    .author-credit .last-name {
      font-weight: 700;
      color: #ffffff; /* font-bold text-white */
    }
  </style>
</head>
<body>
  <div class="poster">
    <img src="${splashDataUrl}" class="bg-image" alt="" />
    <div class="vignette-overlay"></div>

    <div class="content-top">
      <div class="brand-row">
        <div class="brand-logo">
          ${logoSvg}
        </div>
        <div class="brand-name">
          Open<span class="folio-part">Folio</span>
        </div>
      </div>
      <div class="badge">
        <span class="badge-dot"></span>
        ${badgeText}
      </div>
    </div>

    <div class="content-bottom">
      <div class="headline">
        ${headline}
      </div>
      <div class="subtitle">
        ${subtitle}
      </div>

      <div class="features-pill-row">
        ${pills.map(p => `<div class="pill">${p}</div>`).join('\n        ')}
      </div>

      <div class="footer-bar">
        <div class="gpl">Open Source &bull; <strong>GPL-3.0</strong></div>
        <div class="author-credit">
          <span class="prefix">${poweredByLabel} &bull; </span>
          <span class="first-name">Francesco </span>
          <span class="last-name">Flora</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
}

async function generate() {
  console.log('Launching Chrome for Store assets generation...')
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  })

  // 1. Transparent 1:1 Box Art 1080x1080
  console.log('Rendering Transparent 1:1 Box Art 1080x1080...')
  const pageBox1080 = await browser.newPage()
  await pageBox1080.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 })
  await pageBox1080.setContent(getTransparentBoxArtHtml(), { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 500))
  const box1080Path = path.join(OUTPUT_DIR, 'store_box_art_1080x1080.png')
  await pageBox1080.screenshot({ path: box1080Path, omitBackground: true })
  console.log('Saved:', box1080Path)
  await pageBox1080.close()

  // 1b. Transparent 1:1 Box Art 2160x2160
  console.log('Rendering Transparent 1:1 Box Art 2160x2160...')
  const pageBox2160 = await browser.newPage()
  await pageBox2160.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 2 })
  await pageBox2160.setContent(getTransparentBoxArtHtml(), { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 500))
  const box2160Path = path.join(OUTPUT_DIR, 'store_box_art_2160x2160.png')
  await pageBox2160.screenshot({ path: box2160Path, omitBackground: true })
  console.log('Saved:', box2160Path)
  await pageBox2160.close()

  // 2. Poster Art (English) - 720x1080 & 1440x2160
  console.log('Rendering English 2:3 Poster Art 720x1080...')
  const pagePosterEn720 = await browser.newPage()
  await pagePosterEn720.setViewport({ width: 720, height: 1080, deviceScaleFactor: 1 })
  await pagePosterEn720.setContent(getPosterArtHtml({ lang: 'en' }), { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 500))
  const posterEn720Path = path.join(OUTPUT_DIR, 'store_poster_art_720x1080.png')
  await pagePosterEn720.screenshot({ path: posterEn720Path, omitBackground: false })
  console.log('Saved:', posterEn720Path)
  await pagePosterEn720.close()

  console.log('Rendering English 2:3 Poster Art 1440x2160...')
  const pagePosterEn1440 = await browser.newPage()
  await pagePosterEn1440.setViewport({ width: 720, height: 1080, deviceScaleFactor: 2 })
  await pagePosterEn1440.setContent(getPosterArtHtml({ lang: 'en' }), { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 500))
  const posterEn1440Path = path.join(OUTPUT_DIR, 'store_poster_art_1440x2160.png')
  await pagePosterEn1440.screenshot({ path: posterEn1440Path, omitBackground: false })
  console.log('Saved:', posterEn1440Path)
  await pagePosterEn1440.close()

  // 3. Poster Art (Italian) - 720x1080 & 1440x2160
  console.log('Rendering Italian 2:3 Poster Art 720x1080...')
  const pagePosterIt720 = await browser.newPage()
  await pagePosterIt720.setViewport({ width: 720, height: 1080, deviceScaleFactor: 1 })
  await pagePosterIt720.setContent(getPosterArtHtml({ lang: 'it' }), { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 500))
  const posterIt720Path = path.join(OUTPUT_DIR, 'store_poster_art_it_720x1080.png')
  await pagePosterIt720.screenshot({ path: posterIt720Path, omitBackground: false })
  console.log('Saved:', posterIt720Path)
  await pagePosterIt720.close()

  console.log('Rendering Italian 2:3 Poster Art 1440x2160...')
  const pagePosterIt1440 = await browser.newPage()
  await pagePosterIt1440.setViewport({ width: 720, height: 1080, deviceScaleFactor: 2 })
  await pagePosterIt1440.setContent(getPosterArtHtml({ lang: 'it' }), { waitUntil: 'networkidle0' })
  await new Promise(r => setTimeout(r, 500))
  const posterIt1440Path = path.join(OUTPUT_DIR, 'store_poster_art_it_1440x2160.png')
  await pagePosterIt1440.screenshot({ path: posterIt1440Path, omitBackground: false })
  console.log('Saved:', posterIt1440Path)
  await pagePosterIt1440.close()

  await browser.close()
  console.log('All Store assets regenerated and replaced successfully!')
}

generate().catch(err => {
  console.error('Error generating assets:', err)
  process.exit(1)
})
