// Generates PNG icons from SVG for PWA manifest
// Run automatically via postinstall

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function makeSVG(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="#0A0E1A"/>
  <text x="50%" y="53%" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-weight="700" font-size="${Math.round(size * 0.48)}" fill="#5B82BD" text-anchor="middle" dominant-baseline="middle">C</text>
</svg>`
}

let sharp
try {
  // Try the Next.js bundled sharp first
  const candidates = [
    'sharp',
    new URL('../node_modules/sharp/lib/index.js', import.meta.url).pathname
  ]
  for (const c of candidates) {
    try { sharp = (await import(c)).default; break } catch {}
  }
} catch {}

if (sharp) {
  for (const size of [192, 512]) {
    const svg = Buffer.from(makeSVG(size))
    const outPath = path.join(__dirname, `../public/icon-${size}.png`)
    await sharp(svg).resize(size, size).png().toFile(outPath)
    console.log(`✓ icon-${size}.png`)
  }
} else {
  // Fallback: write SVG files (still functional in most browsers)
  for (const size of [192, 512]) {
    const outPath = path.join(__dirname, `../public/icon-${size}.svg`)
    writeFileSync(outPath, makeSVG(size))
    console.log(`✓ icon-${size}.svg (PNG conversion skipped — sharp not available)`)
  }
  console.log('Note: For full iOS PWA support, replace with PNG files.')
}
