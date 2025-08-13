import { PDFDocument } from "pdf-lib"
import type { DeckAnalysis } from "./types"

function bytesToAscii(arr: ArrayBuffer): string {
  try {
    const td = new TextDecoder("latin1")
    return td.decode(new DataView(arr))
  } catch {
    const td = new TextDecoder("utf-8")
    return td.decode(new DataView(arr))
  }
}

function extractFontNamesApprox(pdfAscii: string): string[] {
  const re = /\/BaseFont\s*\/([A-Za-z0-9\-\+_,\.]+)/g
  const fonts = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = re.exec(pdfAscii))) {
    fonts.add(m[1])
  }
  const re2 = /\/FontName\s*\/([A-Za-z0-9\-\+_,\.]+)/g
  while ((m = re2.exec(pdfAscii))) {
    fonts.add(m[1])
  }
  return Array.from(fonts).slice(0, 25)
}

function detectMedia(pdfAscii: string): { hasVideo?: boolean; hasAudio?: boolean } {
  const hasVideo = /\/RichMedia|\/Movie/i.test(pdfAscii) || undefined
  const hasAudio = /\/Sound/i.test(pdfAscii) || undefined
  return { hasVideo, hasAudio }
}

function countImagesApprox(pdfAscii: string) {
  // Count unique image objects (more accurate than drawing operations)
  const imageObjects = new Set<string>()
  
  // Find image object definitions with size filters
  const imageRegex = /\/Subtype\s*\/Image.*?\/Width\s+(\d+).*?\/Height\s+(\d+)/g
  const imageMatches = Array.from(pdfAscii.matchAll(imageRegex))
  for (const match of imageMatches) {
    const width = parseInt(match[1])
    const height = parseInt(match[2])
    
    // Filter out tiny images (likely icons/bullets) and very thin lines
    if (width >= 32 && height >= 32 && width < 5000 && height < 5000) {
      // Create unique identifier based on dimensions and position in file
      const id = `${width}x${height}_${match.index}`
      imageObjects.add(id)
    }
  }
  
  // Fallback to simpler counting if no size info found
  let imagesApprox = imageObjects.size
  if (imagesApprox === 0) {
    const subtypeCount = (pdfAscii.match(/\/Subtype\s*\/Image\b/g) || []).length
    // Apply heuristic: assume 30% are meaningful content images
    imagesApprox = Math.max(0, Math.floor(subtypeCount * 0.3))
  }
  
  return { imagesApprox }
}

function countTextAndBulletsApprox(pdfAscii: string, pageCount: number) {
  const textOpsApprox = (pdfAscii.match(/[\s\(]BT[\s]/g) || []).length
  
  // More comprehensive bullet detection
  const bulletPatterns = [
    /[•\u2022]/g,           // Standard bullets
    /[\u2023\u25E6\u2043]/g, // Other bullet characters
    /^\s*[\-\*\+]\s/gm,    // Dash/asterisk bullets at line start
    /^\s*\d+[\.)\s]/gm,    // Numbered lists
    /^\s*[a-zA-Z][\.)\s]/gm // Lettered lists
  ]
  
  let bulletsApprox = 0
  for (const pattern of bulletPatterns) {
    const matches = pdfAscii.match(pattern) || []
    bulletsApprox += matches.length
  }
  
  // Apply reasonable limits based on page count
  const maxBulletsPerPage = 15 // Reasonable max bullets per slide
  const clamp = Math.max(maxBulletsPerPage * pageCount, 50)
  if (bulletsApprox > clamp) bulletsApprox = Math.round(clamp * 0.8)
  
  return { textOpsApprox, bulletsApprox }
}

function summarizeAspect(sizes: { width: number; height: number }[]) {
  if (!sizes || sizes.length === 0) return { commonRatio: null, ratios: [] }
  const ratios = sizes.map((s) => {
    const r = s.width / s.height
    return Number.isFinite(r) ? Number((r).toFixed(3)) : 0
  })
  const rounded = ratios.map((r) => Math.round(r * 100) / 100)
  const mode = (() => {
    const freq = new Map<number, number>()
    for (const r of rounded) freq.set(r, (freq.get(r) || 0) + 1)
    let best: [number, number] | null = null
    for (const [r, c] of freq) if (!best || c > best[1]) best = [r, c]
    return best?.[0] ?? null
  })()

  let commonRatio: string | null = null
  if (mode) {
    const pairs = [
      { name: "16:9", val: 16 / 9 },
      { name: "4:3", val: 4 / 3 },
      { name: "3:2", val: 3 / 2 },
      { name: "1:1", val: 1 },
    ]
    const closest = pairs.reduce(
      (acc, p) => {
        const d = Math.abs(mode - p.val)
        return d < acc.delta ? { name: p.name, delta: d } : acc
      },
      { name: "custom", delta: 1e9 }
    )
    commonRatio = closest.delta < 0.08 ? closest.name : `${mode}`
  }

  return { commonRatio, ratios }
}

export async function analyzePdf(arrayBuffer: ArrayBuffer): Promise<DeckAnalysis> {
  const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
  const pageCount = pdf.getPageCount()
  const pageSizesPt = pdf.getPages().map((p) => {
    const { width, height } = p.getSize()
    return { width, height }
  })

  const ascii = bytesToAscii(arrayBuffer)
  const fontsApprox = extractFontNamesApprox(ascii)
  const { hasVideo, hasAudio } = detectMedia(ascii)
  const { imagesApprox } = countImagesApprox(ascii)
  const { textOpsApprox, bulletsApprox } = countTextAndBulletsApprox(ascii, pageCount)
  const aspectSummary = summarizeAspect(pageSizesPt)

  return {
    pageCount,
    pageSizesPt,
    aspectSummary,
    fontsApprox,
    hasVideo,
    hasAudio,
    textOpsApprox,
    imagesApprox,
    bulletsApprox,
    analysisMethod: "pdf",
  }
}
