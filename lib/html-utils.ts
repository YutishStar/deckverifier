import type { DeckAnalysis } from "./types"

export function analyzeHtmlForSlides(html: string, url: string): DeckAnalysis {
  const lower = html.toLowerCase()

  // Approx images by img tags and background images
  const imgTagCount = (lower.match(/<img\b/g) || []).length
  const bgImageCount = (lower.match(/background-image\s*:/g) || []).length
  const imagesApprox = imgTagCount + bgImageCount

  // Bullets: <li>
  let bulletsApprox = (lower.match(/<li\b/g) || []).length
  if (bulletsApprox > 500) bulletsApprox = 500

  // Text density: <p> + headings
  const textOpsApprox = (lower.match(/<p\b/g) || []).length + (lower.match(/<h[1-6]\b/g) || []).length

  // Slide count heuristics
  let pageCount: number | undefined
  const slideMarkers = (lower.match(/class=["'][^"']*(slide|page)[^"']*["']/g) || []).length
  if (slideMarkers >= 1) pageCount = slideMarkers

  // Aspect ratio heuristic if present
  let aspectRatioName: string | null = null
  const arMatch = lower.match(/aspect-ratio\s*:\s*([0-9\.]+)\s*\/\s*([0-9\.]+)/)
  if (arMatch) {
    const w = parseFloat(arMatch[1])
    const h = parseFloat(arMatch[2])
    if (isFinite(w) && isFinite(h) && h > 0) {
      const r = w / h
      const close = Math.abs(r - 16 / 9) < 0.08 ? "16:9" : Math.abs(r - 4 / 3) < 0.08 ? "4:3" : null
      aspectRatioName = close ?? null
    }
  }

  return {
    pageCount,
    imagesApprox,
    bulletsApprox,
    textOpsApprox,
    hasVideo: /<video\b|youtube\.com|vimeo\.com/.test(lower) || undefined,
    hasAudio: /<audio\b/.test(lower) || undefined,
    analysisMethod: "html",
    aspectSummary: aspectRatioName ? { commonRatio: aspectRatioName, ratios: [] } : undefined,
  }
}
