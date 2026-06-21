// Run with: node scripts/generate-icons.js
const fs = require('fs')
const path = require('path')

// We create a simple SVG and use sharp/canvas if available,
// otherwise write placeholder PNGs via Buffer (minimal valid PNG)
// For a real app use an image editor. These are functional placeholders.

function minimalPNG(size) {
  // A valid minimal PNG - navy background with "C" text encoded as base64
  // We'll use an inline SVG approach via a data URI trick
  // Actually let's just create the SVGs and let the browser handle it
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#0A0E1A"/>
  <text x="50%" y="54%" font-family="system-ui,sans-serif" font-weight="700" font-size="${size * 0.45}" fill="#5B82BD" text-anchor="middle" dominant-baseline="middle">C</text>
</svg>`
  return svg
}

fs.writeFileSync(path.join(__dirname, '../public/icon-192.svg'), minimalPNG(192))
fs.writeFileSync(path.join(__dirname, '../public/icon-512.svg'), minimalPNG(512))
console.log('SVG icons created. For production PNG icons, convert with an image editor.')
