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

    // 2) Google Slides export
    if (tryExportToPdf) {
      const exp = googleSlidesExportUrl(url)
      if (exp) {
        const file = await fetchAsPdf(exp)
        if (file) {
          return new Response(
            JSON.stringify({ ok: true, method: "pdf-export", ...file }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
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

      // 4) Fallback: HTML heuristics for slides
      const analysis = analyzeHtmlForSlides(html, url)
      return new Response(
        JSON.stringify({ ok: true, method: "html", analysis }),
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
