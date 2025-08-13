import { PDFDocument } from "pdf-lib"
import type { Deck } from "./types"

export async function mergePdfs(files: { name: string; data: ArrayBuffer }[]): Promise<Uint8Array> {
  const out = await PDFDocument.create()
  for (const f of files) {
    const src = await PDFDocument.load(f.data, { ignoreEncryption: true })
    const copied = await out.copyPages(src, src.getPageIndices())
    for (const p of copied) out.addPage(p)
  }
  return await out.save()
}

export interface MergeResult {
  success: boolean
  outputFormat: "pdf" | "keynote" | "mixed"
  data?: Uint8Array
  filename: string
  message: string
  warnings?: string[]
}

export async function mergeDecks(decks: Deck[]): Promise<MergeResult> {
  const warnings: string[] = []
  
  // Filter to only passing decks with data
  const validDecks = decks.filter(deck => 
    deck.tests?.every(t => t.status === "pass") && 
    (deck.fileData || deck.format === "pdf")
  )
  
  if (validDecks.length === 0) {
    return {
      success: false,
      outputFormat: "mixed",
      filename: "master-deck",
      message: "No valid decks to merge"
    }
  }
  
  // Analyze deck formats
  const formats = validDecks.map(d => d.format)
  const hasVideo = validDecks.some(d => d.analysis?.hasVideo)
  const hasAudio = validDecks.some(d => d.analysis?.hasAudio)
  const allPdf = formats.every(f => f === "pdf")
  const hasNonPdf = formats.some(f => f !== "pdf")
  
  // Add warnings for complex media
  if (hasVideo) warnings.push("Some decks contain video - manual review may be needed")
  if (hasAudio) warnings.push("Some decks contain audio - manual review may be needed")
  if (hasNonPdf) warnings.push("Mixed formats detected - PDF output may lose some features")
  
  // Simple case: all PDFs, no video/audio
  if (allPdf && !hasVideo && !hasAudio) {
    try {
      const pdfFiles = validDecks
        .filter(d => d.fileData)
        .map(d => ({ name: d.name, data: d.fileData! }))
      
      const mergedData = await mergePdfs(pdfFiles)
      
      return {
        success: true,
        outputFormat: "pdf",
        data: mergedData,
        filename: `master-deck-${validDecks.length}-presentations.pdf`,
        message: `Successfully merged ${validDecks.length} PDF presentations`,
        warnings
      }
    } catch (error) {
      return {
        success: false,
        outputFormat: "pdf",
        filename: "master-deck.pdf",
        message: `Failed to merge PDFs: ${error}`,
        warnings
      }
    }
  }
  
  // Complex case: mixed formats or media content
  if (hasVideo || hasAudio || hasNonPdf) {
    const instructions = [
      "Manual merging required due to:",
      ...(hasVideo ? ["- Video content present"] : []),
      ...(hasAudio ? ["- Audio content present"] : []),
      ...(hasNonPdf ? ["- Mixed presentation formats"] : []),
      "",
      "Recommended approach:",
      "1. Use Keynote for video/audio preservation",
      "2. Import each deck manually",
      "3. Maintain original formatting and media"
    ]
    
    return {
      success: false,
      outputFormat: hasVideo || hasAudio ? "keynote" : "mixed",
      filename: "master-deck-manual-merge-required",
      message: instructions.join("\n"),
      warnings
    }
  }
  
  // Fallback: attempt PDF merge of available data
  try {
    const pdfFiles = validDecks
      .filter(d => d.fileData)
      .map(d => ({ name: d.name, data: d.fileData! }))
    
    if (pdfFiles.length === 0) {
      return {
        success: false,
        outputFormat: "mixed",
        filename: "master-deck",
        message: "No file data available for merging"
      }
    }
    
    const mergedData = await mergePdfs(pdfFiles)
    
    return {
      success: true,
      outputFormat: "pdf",
      data: mergedData,
      filename: `master-deck-${pdfFiles.length}-presentations.pdf`,
      message: `Merged ${pdfFiles.length} presentations (${validDecks.length - pdfFiles.length} skipped due to missing data)`,
      warnings
    }
  } catch (error) {
    return {
      success: false,
      outputFormat: "mixed",
      filename: "master-deck",
      message: `Merge failed: ${error}`,
      warnings
    }
  }
}
