import { analyzePdf } from "@/lib/pdf-utils"
import { analyzeHtmlForSlides } from "@/lib/html-utils"

// Helpers
function googleSlidesExportUrl(input: string): string | null {
  try {
    const u = new URL(input)
    if (!u.hostname.includes("docs.google.com")) return null
    const m = u.pathname.match(/\/presentation\/d\/([^/]+)/)
    if (m?.[1]) {
      return `https://docs.google.com/presentation/d/${m[1]}/export/pdf`
    }
    return null
  } catch {
    return null
  }
}

function figmaExportUrl(input: string): string | null {
  try {
    const u = new URL(input)
    if (!u.hostname.includes("figma.com")) return null
    // Figma file URLs: https://www.figma.com/file/[file-id]/[file-name]
    const m = u.pathname.match(/\/file\/([^/]+)/)
    if (m?.[1]) {
      // Note: Figma requires API token for PDF export, this is a placeholder
      return `https://api.figma.com/v1/files/${m[1]}/export?format=pdf`
    }
    return null
  } catch {
    return null
  }
}

function canvaExportUrl(input: string): string | null {
  try {
    const u = new URL(input)
    if (!u.hostname.includes("canva.com")) return null
    // Canva design URLs: https://www.canva.com/design/[design-id]/[design-name]
    const m = u.pathname.match(/\/design\/([^/]+)/)
    if (m?.[1]) {
      // Note: Canva requires authentication for PDF export, this is a placeholder
      return `https://www.canva.com/api/v1/designs/${m[1]}/export/pdf`
    }
    return null
  } catch {
    return null
  }
}

function detectPlatform(url: string): string {
  const u = url.toLowerCase()
  if (u.includes("docs.google.com")) return "google-slides"
  if (u.includes("figma.com")) return "figma"
  if (u.includes("canva.com")) return "canva"
  if (u.includes("slides.com")) return "slides-com"
  if (u.includes("prezi.com")) return "prezi"
  return "unknown"
}

function getPlatformSpecificHints(platform: string, html: string): any {
  const hints: any = { platform }
  
  switch (platform) {
    case "google-slides":
      // Look for slide count indicators in Google Slides
      const slideMatch = html.match(/(\d+)\s*slides?/i)
      if (slideMatch) hints.estimatedSlides = parseInt(slideMatch[1])
      hints.exportAvailable = true
      hints.requiresAuth = false
      break
      
    case "figma":
      // Look for frame count or page indicators
      const frameMatch = html.match(/(\d+)\s*frames?/i)
      if (frameMatch) hints.estimatedFrames = parseInt(frameMatch[1])
      hints.exportAvailable = true
      hints.requiresAuth = true
      hints.authNote = "Figma export requires API token"
      break
      
    case "canva":
      // Look for page indicators
      const pageMatch = html.match(/(\d+)\s*pages?/i)
      if (pageMatch) hints.estimatedPages = parseInt(pageMatch[1])
      hints.exportAvailable = true
      hints.requiresAuth = true
      hints.authNote = "Canva export requires authentication"
      break
      
    default:
      hints.exportAvailable = false
      hints.requiresAuth = false
  }
  
  return hints
}

function isLikelyPdfUrl(url: string) {
  const u = url.toLowerCase()
  return u.endsWith(".pdf") || u.includes("/export/pdf") || u.includes("format=pdf")
}

function filenameFromUrl(url: string) {
  try {
    const u = new URL(url)
    const base = u.pathname.split("/").filter(Boolean).pop() || "download"
    return base.endsWith(".pdf") ? base : base + ".pdf"
  } catch {
    return "download.pdf"
  }
}

function arrayBufferToBase64(buf: ArrayBuffer) {
  // Use Node Buffer on the server
  // @ts-ignore
  const buff = Buffer.from(buf as any)
  return buff.toString("base64")
}

async function fetchAsPdf(url: string) {
  const res = await fetch(url, { redirect: "follow" })
  if (!res.ok) return null
  const ct = (res.headers.get("content-type") || "").toLowerCase()
  if (!ct.includes("pdf")) return null
  const ab = await res.arrayBuffer()
  const size = Number(res.headers.get("content-length") || ab.byteLength)
  const analysis = await analyzePdf(ab)
  return {
    fileName: filenameFromUrl(url),
    fileSize: size,
    pdfBase64: arrayBufferToBase64(ab),
    analysis,
  }
}

function discoverPdfLinksFromHtml(html: string, baseUrl: string): string[] {
  const urls = new Set<string>()
  const absolute = (href: string) => {
    try {
      return new URL(href, baseUrl).toString()
    } catch {
      return null
    }
  }

  // Simple patterns: href="...pdf", href='...export/pdf', etc.
  const hrefRe = /href\s*=\s*["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = hrefRe.exec(html))) {
    const href = m[1]
    if (!href) continue
    const full = absolute(href)
    if (!full) continue
    if (isLikelyPdfUrl(full) || full.toLowerCase().endsWith(".pdf")) urls.add(full)
  }

  // Common data attributes or JSON blobs may also contain links; scan for .pdf tokens
  const tokenRe = /(https?:\/\/[^\s"'<>]+\.pdf)/gi
  while ((m = tokenRe.exec(html))) {
    const token = m[1]
    if (token) urls.add(token)
  }

  // Google export hints in embedded code
  const gexportRe = /(https?:\/\/docs\.google\.com\/presentation\/d\/[^"'\\]+\/export\/pdf[^"'\\]*)/gi
  while ((m = gexportRe.exec(html))) {
    const url = m[1]
    if (url) urls.add(url)
  }

  return Array.from(urls).slice(0, 5)
}

export async function POST(req: Request) {
  try {
    const { url, tryExportToPdf } = await req.json()
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ ok: false, message: "Missing URL." }), { status: 400 })
    }

    // 1) Direct PDF or explicit export
    if (isLikelyPdfUrl(url)) {
      const file = await fetchAsPdf(url)
      if (file) {
        return new Response(
          JSON.stringify({ ok: true, method: "pdf-direct", ...file }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      }
    }

    // 2) Platform-specific export attempts
    if (tryExportToPdf) {
      const platform = detectPlatform(url)
      let exportUrl: string | null = null
      let exportMethod = "pdf-export"
      
      switch (platform) {
        case "google-slides":
          exportUrl = googleSlidesExportUrl(url)
          exportMethod = "google-slides-export"
          break
        case "figma":
          exportUrl = figmaExportUrl(url)
          exportMethod = "figma-export"
          break
        case "canva":
          exportUrl = canvaExportUrl(url)
          exportMethod = "canva-export"
          break
      }
      
      if (exportUrl) {
        try {
          const file = await fetchAsPdf(exportUrl)
          if (file) {
            return new Response(
              JSON.stringify({ ok: true, method: exportMethod, platform, ...file }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            )
          }
        } catch (error) {
          // If export fails, continue to HTML analysis
          console.warn(`Failed to export from ${platform}:`, error)
        }
      }
    }

    // 3) Fetch HTML and attempt to discover a PDF link within the page
    const htmlRes = await fetch(url, { redirect: "follow" })
    if (htmlRes.ok) {
      const html = await htmlRes.text()
      // Attempt to discover downloadable PDF links
      const pdfLinks = discoverPdfLinksFromHtml(html, url)
      for (const link of pdfLinks) {
        const file = await fetchAsPdf(link)
        if (file) {
          return new Response(
            JSON.stringify({ ok: true, method: "pdf-from-html", discoveredFrom: url, discoveredLink: link, ...file }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        }
      }

      // 4) Fallback: HTML heuristics for slides with platform detection
      const platform = detectPlatform(url)
      const analysis = analyzeHtmlForSlides(html, url)
      
      // Enhanced analysis with platform-specific hints
      const enhancedAnalysis = {
        ...analysis,
        platform,
        platformSpecific: getPlatformSpecificHints(platform, html)
      }
      
      return new Response(
        JSON.stringify({ ok: true, method: "html", analysis: enhancedAnalysis }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ ok: false, message: `Failed to fetch URL: ${htmlRes.status} ${htmlRes.statusText}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, message: e?.message || "Unexpected error resolving URL." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
