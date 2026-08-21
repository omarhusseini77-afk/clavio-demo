import type { jsPDF } from 'jspdf'

// Shared page furniture for every PDF this product produces: the wordmark, the
// demonstration notice, and the footer.
//
// Extracted from scripts/generate-demo-pdfs.mjs so the seed documents and the
// investor's own export cannot drift apart — in particular so a change to the
// notice wording, or its removal, cannot happen on one path and not the other.
//
// The notice is not decoration. These files get downloaded and will end up
// detached from the demo, so a reader who finds one on a desktop months from
// now has to be able to tell at a glance that the figures are not real. It
// appears in the body AND on every page for that reason.

export const NOTICE = 'Demonstration document - sample data, not a real financial report.'
export const NOTICE_SUB = 'Figures are synthetic and generated for product demonstration purposes only.'

export const NAVY: [number, number, number] = [15, 23, 42]
export const ACCENT: [number, number, number] = [22, 82, 160]
export const MUTED: [number, number, number] = [110, 120, 135]
export const TEXT: [number, number, number] = [45, 55, 72]
export const MARGIN = 56

/** Wordmark and rule. Returns the y coordinate to continue from. */
export function drawHeader(doc: jsPDF): number {
  const W = doc.internal.pageSize.getWidth()
  const M = MARGIN
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22)
  doc.setTextColor(...NAVY); doc.text('CLA', M, 70)
  const claW = doc.getTextWidth('CLA')
  doc.setTextColor(...ACCENT); doc.text('V', M + claW, 70)
  const vW = doc.getTextWidth('V')
  doc.setTextColor(...NAVY); doc.text('IO', M + claW + vW, 70)
  doc.setDrawColor(225, 230, 238); doc.setLineWidth(1)
  doc.line(M, 86, W - M, 86)
  return 86
}

/** Title and subtitle block. Returns the y coordinate to continue from. */
export function drawTitle(doc: jsPDF, title: string, subtitle: string): number {
  const W = doc.internal.pageSize.getWidth()
  const M = MARGIN
  doc.setFont('helvetica', 'bold'); doc.setFontSize(19); doc.setTextColor(...NAVY)
  const lines = doc.splitTextToSize(title, W - M * 2) as string[]
  doc.text(lines, M, 128)
  const y = 128 + (lines.length - 1) * 22
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...MUTED)
  doc.text(subtitle, M, y + 24)
  return y + 24
}

/** The in-body notice panel. Returns the y coordinate to continue from. */
export function drawNotice(doc: jsPDF, y: number): number {
  const W = doc.internal.pageSize.getWidth()
  const M = MARGIN
  doc.setFillColor(255, 247, 230); doc.setDrawColor(240, 200, 120)
  doc.roundedRect(M, y, W - M * 2, 40, 5, 5, 'FD')
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(150, 90, 10)
  doc.text(NOTICE, M + 14, y + 18)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  doc.text(NOTICE_SUB, M + 14, y + 32)
  return y + 40
}

/**
 * Footer on EVERY page. Call last, after all content, or pages added by a table
 * that overflowed will not carry the notice.
 */
export function drawFooters(doc: jsPDF, fundName: string): void {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = MARGIN
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setDrawColor(225, 230, 238); doc.setLineWidth(1)
    doc.line(M, H - 58, W - M, H - 58)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(150, 90, 10)
    doc.text(NOTICE, M, H - 42)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUTED)
    doc.text(`CLAVIO  ·  ${fundName}  ·  page ${p} of ${pages}`, M, H - 28)
  }
}
