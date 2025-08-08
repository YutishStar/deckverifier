import type { Config, Deck, TestResult } from "./types"

function fmtMB(bytes?: number) {
  if (!bytes && bytes !== 0) return null
  return Math.round((bytes / (1024 * 1024)) * 10) / 10
}

export function runDeterministicChecks(deck: Deck, config: Config): TestResult[] {
  const results: TestResult[] = []

  // 1) Accepted format
  results.push({
    id: "det:format",
    label: `Format is accepted (${deck.format.toUpperCase()})`,
    type: "deterministic",
    status: config.acceptedFormats.includes(deck.format) ? "pass" : "fail",
    details: config.acceptedFormats.includes(deck.format)
      ? []
      : [`Accepted: ${config.acceptedFormats.map((f) => f.toUpperCase()).join(", ")}`],
  })

  const isUrl = deck.sourceType === "url"

  // 2) Size limit
  if (config.enforceSize) {
    if (!isUrl && deck.fileInfo?.sizeBytes != null) {
      const mb = fmtMB(deck.fileInfo.sizeBytes)!
      results.push({
        id: "det:size",
        label: `File size under ${config.maxSizeMB} MB`,
        type: "deterministic",
        status: mb <= config.maxSizeMB ? "pass" : "fail",
        details: [`Detected: ${mb} MB`],
      })
    } else if (isUrl && deck.fileInfo?.sizeBytes != null) {
      // URL that we exported to PDF gets size
      const mb = fmtMB(deck.fileInfo.sizeBytes)!
      results.push({
        id: "det:size",
        label: `File size under ${config.maxSizeMB} MB`,
        type: "deterministic",
        status: mb <= config.maxSizeMB ? "pass" : "fail",
        details: [`Detected: ${mb} MB`],
      })
    } else {
      results.push({
        id: "det:size",
        label: `File size under ${config.maxSizeMB} MB`,
        type: "deterministic",
        status: isUrl && config.urlLenientWhenUnknown ? "pass" : "fail",
        details: [isUrl ? "Size unknown for URL." + (config.urlLenientWhenUnknown ? " Passing by policy." : " Upload a file for full checks.") : "Size unavailable."],
      })
    }
  }

  // 3) Slide count
  if (config.enforceSlideCount) {
    if (deck.analysis?.pageCount != null) {
      const pc = deck.analysis.pageCount
      const within = pc >= config.minSlides && pc <= config.maxSlides
      results.push({
        id: "det:slides",
        label: `Slide count between ${config.minSlides}-${config.maxSlides}`,
        type: "deterministic",
        status: within ? "pass" : "fail",
        details: [`Detected: ${pc}`],
      })
    } else {
      results.push({
        id: "det:slides",
        label: `Slide count between ${config.minSlides}-${config.maxSlides}`,
        type: "deterministic",
        status: isUrl && config.urlLenientWhenUnknown ? "pass" : "fail",
        details: [isUrl ? "Slide count unknown for URL." + (config.urlLenientWhenUnknown ? " Passing by policy." : " Provide a PDF for full checks.") : "Slide count unavailable."],
      })
    }
  }

  // 4) Aspect
  if (config.enforceAspect) {
    const ratio = deck.analysis?.aspectSummary?.commonRatio ?? null
    const ok = config.require16by9 ? ratio === "16:9" : true
    results.push({
      id: "det:aspect",
      label: config.require16by9 ? "Slides are 16:9" : "Aspect requirement",
      type: "deterministic",
      status: ratio ? (ok ? "pass" : "fail") : isUrl && config.urlLenientWhenUnknown ? "pass" : "fail",
      details: [`Detected: ${ratio ?? "unknown"}${!ratio && isUrl && config.urlLenientWhenUnknown ? " (passing by policy)" : ""}`],
    })
  }

  // 5) Video
  if (config.enforceVideoConstraint) {
    const hasVideo = !!deck.analysis?.hasVideo
    results.push({
      id: "det:video",
      label: config.allowVideo ? "Video allowed" : "No embedded video",
      type: "deterministic",
      status: config.allowVideo ? "pass" : hasVideo ? "fail" : "pass",
      details: [`Detected: ${hasVideo ? "video present" : "no video"}`],
    })
  }

  // 6) Audio
  if (config.enforceAudioConstraint) {
    const hasAudio = !!deck.analysis?.hasAudio
    results.push({
      id: "det:audio",
      label: config.allowAudio ? "Audio allowed" : "No embedded audio",
      type: "deterministic",
      status: config.allowAudio ? "pass" : hasAudio ? "fail" : "pass",
      details: [`Detected: ${hasAudio ? "audio present" : "no audio"}`],
    })
  }

  return results
}
