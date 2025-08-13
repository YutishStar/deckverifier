import type { DeckFormat } from "./types"

export function detectFormat(input: { fileName?: string; mime?: string; url?: string }): DeckFormat {
  const nameOrUrl = (input.fileName || input.url || "").toLowerCase()
  const mime = (input.mime || "").toLowerCase()

  // URL domain hints - more comprehensive detection
  if (nameOrUrl.includes("docs.google.com/presentation")) return "google-slides"
  if (nameOrUrl.includes("canva.com/design")) return "canva"
  if (nameOrUrl.includes("figma.com/file")) return "figma"
  if (nameOrUrl.includes("figma.com/proto")) return "figma"
  if (nameOrUrl.includes("pitch.com")) return "url"
  if (nameOrUrl.includes("slides.com")) return "url"
  if (nameOrUrl.includes("prezi.com")) return "url"
  if (nameOrUrl.includes("beautiful.ai")) return "url"
  if (nameOrUrl.includes("gamma.app")) return "url"

  // Direct/export file hints
  if (nameOrUrl.endsWith(".pdf") || mime === "application/pdf" || nameOrUrl.includes("export/pdf") || nameOrUrl.includes("format=pdf"))
    return "pdf"
  if (nameOrUrl.endsWith(".pptx") || mime.includes("powerpoint") || mime.includes("presentationml")) return "pptx"
  if (nameOrUrl.endsWith(".ppt") || mime.includes("ms-powerpoint")) return "pptx"
  if (nameOrUrl.endsWith(".key") || mime.includes("keynote")) return "keynote"
  if (nameOrUrl.endsWith(".odp") || mime.includes("opendocument.presentation")) return "url"
  
  // Generic URL fallback
  if (nameOrUrl.startsWith("http")) return "url"

  return "unknown"
}

export function getPlatformName(format: DeckFormat): string {
  switch (format) {
    case "google-slides": return "Google Slides"
    case "canva": return "Canva"
    case "figma": return "Figma"
    case "pdf": return "PDF"
    case "pptx": return "PowerPoint"
    case "keynote": return "Keynote"
    case "url": return "Web Link"
    default: return "Unknown"
  }
}

export function getFormatIcon(format: DeckFormat): string {
  switch (format) {
    case "google-slides": return "📊"
    case "canva": return "🎨"
    case "figma": return "🎯"
    case "pdf": return "📄"
    case "pptx": return "📈"
    case "keynote": return "🎭"
    case "url": return "🔗"
    default: return "❓"
  }
}
