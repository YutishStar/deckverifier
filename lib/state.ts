import type { Config, Deck } from "./types"

export const defaultConfig: Config = {
  acceptedFormats: ["pdf", "pptx", "keynote"],

  // URL behavior (disabled for now)
  urlAutoExportToPdf: false,
  urlLenientWhenUnknown: false,

  // Deterministic
  enforceSize: true,
  maxSizeMB: 100,

  enforceSlideCount: true,
  minSlides: 1,
  maxSlides: 100,

  enforceAspect: true,
  require16by9: true,

  enforceVideoConstraint: true,
  allowVideo: false,

  enforceAudioConstraint: true,
  allowAudio: false,

  expectedDecks: 30,

  // Three AI checks
  aiChecks: [
    {
      id: "ai-title",
      label: "Has a proper title slide",
      prompt: [
        "Decide if the deck likely has a proper title slide (typically slide 1).",
        "Use ONLY metadata: {pageCount, aspectSummary.commonRatio, imagesApprox, textOpsApprox, bulletsApprox, hasVideo, hasAudio, sourceType, format}.",
        "When uncertain, prefer pass=true with a short caution.",
        "Return JSON {\"pass\": boolean, \"reasons\": string[]} with short reasons."
      ].join(" ")
    },
    {
      id: "ai-not-all-bullets",
      label: "Not dominated by complex bullet points",
      prompt: [
        "Decide if the deck is NOT dominated by complex bullet points.",
        "Use ONLY metadata: {pageCount, bulletsApprox, imagesApprox, textOpsApprox}.",
        "Lenient thresholds: imagesApprox ≥ 1 => pass=true; else if bulletsApprox/max(pageCount,1) > 5 => fail; otherwise pass.",
        "Return JSON {\"pass\": boolean, \"reasons\": string[]} with short reasons."
      ].join(" ")
    },
    {
      id: "ai-has-images",
      label: "Contains images/diagrams",
      prompt: [
        "Decide if the deck contains images/diagrams on at least some slides.",
        "Use ONLY metadata: {pageCount, imagesApprox, textOpsApprox}.",
        "Lenient thresholds: imagesApprox ≥ 1 => pass; if imagesApprox = 0 but pageCount ≤ 5 => pass; else fail.",
        "Return JSON {\"pass\": boolean, \"reasons\": string[]} with short reasons."
      ].join(" ")
    }
  ],
}

export function loadConfig(): Config {
  if (typeof window === "undefined") return defaultConfig
  try {
    const s = localStorage.getItem("sv_config")
    if (!s) return defaultConfig
    const parsed = JSON.parse(s)
    return { ...defaultConfig, ...parsed }
  } catch {
    return defaultConfig
  }
}

export function saveConfig(cfg: Config) {
  if (typeof window === "undefined") return
  localStorage.setItem("sv_config", JSON.stringify(cfg))
}

export function loadSubmissions(): Deck[] {
  if (typeof window === "undefined") return []
  try {
    const s = localStorage.getItem("sv_submissions")
    if (!s) return []
    return JSON.parse(s) as Deck[]
  } catch {
    return []
  }
}

export function saveSubmissions(arr: Deck[]) {
  if (typeof window === "undefined") return
  localStorage.setItem("sv_submissions", JSON.stringify(arr))
}

export function saveSubmission(deck: Deck): Deck {
  const list = loadSubmissions()
  const idx = list.findIndex((d) => d.id === deck.id)
  if (idx >= 0) list[idx] = deck
  else list.unshift(deck)
  saveSubmissions(list)
  return deck
}
