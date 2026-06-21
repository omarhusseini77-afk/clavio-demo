// Generates PNG icons from SVG for PWA manifest
// Run automatically via postinstall

import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const APPS = [
  { suffix: '',      letter: 'C', bg: '#0A0E1A', fg: '#5B82BD' }, // submit / default
  { suffix: '-gp',   letter: 'G', bg: '#0D1B2A', fg: '#5B82BD' }, // partner
  { suffix: '-lp',   letter: 'I', bg: '#112240', fg: '#7BA4D4' }, // investor
]

function makeSVG(size, letter, bg, fg) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="${bg}"/>
  <text x="50%" y="53%" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-weight="700" font-size="${Math.round(size * 0.48)}" fill="${fg}" text-anchor="middle" dominant-baseline="middle">${letter}</text>
</svg>`
}

let sharp
try {
  const candidates = [
    'sharp',
    new URL('../node_modules/sharp/lib/index.js', import.meta.url).pathname
  ]
  for (const c of candidates) {
    try { sharp = (await import(c)).default; break } catch {}
  }
} catch {}

if (sharp) {
  for (const app of APPS) {
    for (const size of [192, 512]) {
      const svg = Buffer.from(makeSVG(size, app.letter, app.bg, app.fg))
      const outPath = path.join(__dirname, `../public/icon${app.suffix}-${size}.png`)
      await sharp(svg).resize(size, size).png().toFile(outPath)
      console.log(`✓ icon${app.suffix}-${size}.png`)
    }
  }
} else {
  for (const app of APPS) {
    for (const size of [192, 512]) {
      const outPath = path.join(__dirname, `../public/icon${app.suffix}-${size}.svg`)
      writeFileSync(outPath, makeSVG(size, app.letter, app.bg, app.fg))
      console.log(`✓ icon${app.suffix}-${size}.svg (sharp not available)`)
    }
  }
}
