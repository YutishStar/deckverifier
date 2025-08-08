import type { DeckFormat } from "./types"

export function detectFormat(input: { fileName?: string; mime?: string; url?: string }): DeckFormat {
  const nameOrUrl = (input.fileName || input.url || "").toLowerCase()
  const mime = (input.mime || "").toLowerCase()

  // URL domain hints
  if (nameOrUrl.includes("docs.google.com/presentation")) return "google-slides"
  if (nameOrUrl.includes("canva.com")) return "canva"
  if (nameOrUrl.includes("figma.com")) return "figma"
  if (nameOrUrl.includes("pitch.com")) return "url"

  // Direct/export file hints
  if (nameOrUrl.endsWith(".pdf") || mime === "application/pdf" || nameOrUrl.includes("export/pdf") || nameOrUrl.includes("format=pdf"))
    return "pdf"
  if (nameOrUrl.endsWith(".pptx") || mime.includes("powerpoint")) return "pptx"
  if (nameOrUrl.endsWith(".key")) return "keynote"
  if (nameOrUrl.startsWith("http")) return "url"

  return "unknown"
}
