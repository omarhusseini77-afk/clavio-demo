import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Each app gets a distinct dark background; V accent stays brand blue throughout
const APPS = [
  { suffix: '',    bg: '#0A0E1A', v: '#5B82BD' }, // Submit — brand navy
  { suffix: '-gp', bg: '#0B3D2E', v: '#5B82BD' }, // Partner — deep emerald
  { suffix: '-lp', bg: '#2D1B69', v: '#5B82BD' }, // Investor — deep violet
]

function makeSVG(size, bg, vColor) {
  const fontSize = Math.round(size * 0.245)
  const textWidth = Math.round(size * 0.82)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="${bg}"/>
  <text x="50%" y="53%" font-family="-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif" font-weight="800" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle" textLength="${textWidth}" lengthAdjust="spacingAndGlyphs">
    <tspan fill="white">CLA</tspan><tspan fill="${vColor}">V</tspan><tspan fill="white">IO</tspan>
  </text>
</svg>`
}

let sharp
try {
  const candidates = ['sharp', new URL('../node_modules/sharp/lib/index.js', import.meta.url).pathname]
  for (const c of candidates) {
    try { sharp = (await import(c)).default; break } catch {}
  }
} catch {}

for (const app of APPS) {
  for (const size of [192, 512]) {
    const svg = Buffer.from(makeSVG(size, app.bg, app.v))
    const outPath = path.join(__dirname, `../public/icon${app.suffix}-${size}.png`)
    if (sharp) {
      await sharp(svg).resize(size, size).png().toFile(outPath)
      console.log(`✓ icon${app.suffix}-${size}.png`)
    } else {
      const svgPath = outPath.replace('.png', '.svg')
      writeFileSync(svgPath, svg.toString())
      console.log(`✓ icon${app.suffix}-${size}.svg (sharp unavailable)`)
    }
  }
}
