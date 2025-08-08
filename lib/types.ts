export type SourceType = "file" | "url"
export type DeckFormat = "pdf" | "pptx" | "keynote" | "google-slides" | "canva" | "figma" | "url" | "unknown"

export type TestStatus = "pending" | "running" | "pass" | "fail"
export type TestType = "deterministic" | "ai"

export type TestResult = {
  id: string
  label: string
  type: TestType
  status: TestStatus
  details?: string[]
}

export type DeckAnalysis = {
  // Optional fields: URLs may not have all metrics
  pageCount?: number
  pageSizesPt?: { width: number; height: number }[]
  aspectSummary?: {
    commonRatio: string | null
    ratios: number[]
  }
  fontsApprox?: string[]
  hasVideo?: boolean
  hasAudio?: boolean
  textOpsApprox?: number
  imagesApprox?: number
  bulletsApprox?: number

  // Source of analysis (pdf or html heuristic)
  analysisMethod?: "pdf" | "html"
}

export type Deck = {
  id: string
  name: string
  sourceType: SourceType
  format: DeckFormat
  fileInfo?: { fileName: string; sizeBytes: number; mime: string }
  fileData?: ArrayBuffer
  url?: string
  analysis?: DeckAnalysis
  tests?: TestResult[]
  submitterName?: string
  createdAt?: string
  submittedAt?: string
}

export type AiCheck = {
  id: string
  label: string
  prompt: string
}

export type Config = {
  // Acceptance
  acceptedFormats: DeckFormat[]

  // URL policies
  urlAutoExportToPdf: boolean
  urlLenientWhenUnknown: boolean

  // Deterministic settings
  enforceSize: boolean
  maxSizeMB: number

  enforceSlideCount: boolean
  minSlides: number
  maxSlides: number

  enforceAspect: boolean
  require16by9: boolean

  enforceVideoConstraint: boolean
  allowVideo: boolean

  enforceAudioConstraint: boolean
  allowAudio: boolean

  // Admin
  expectedDecks?: number

  // AI rules
  aiChecks?: AiCheck[]
}
