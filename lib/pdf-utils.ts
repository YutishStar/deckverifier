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
  const subtypeImageCount = (pdfAscii.match(/\/Subtype\s*\/Image\b/g) || []).length
  const doImCount = (pdfAscii.match(/\/Im[0-9]+\s+Do\b/g) || []).length
  const imagesApprox = Math.max(subtypeImageCount, doImCount)
  return { imagesApprox }
}

function countTextAndBulletsApprox(pdfAscii: string, pageCount: number) {
  const textOpsApprox = (pdfAscii.match(/[\s\(]BT[\s]/g) || []).length
  let bulletsApprox = (pdfAscii.match(/[•\u2022]/g) || []).length
  const clamp = Math.max(8 * pageCount, 50)
  if (bulletsApprox > clamp) bulletsApprox = Math.round(clamp)
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
