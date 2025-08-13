"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { detectFormat } from "@/lib/detect-format"
import { analyzePdf } from "@/lib/pdf-utils"
import type { Config, Deck } from "@/lib/types"
import { Loader2, Upload, FileText, CheckCircle2 } from 'lucide-react'
import { v4 as uuidv4 } from "uuid"

type Props = {
  mode: "file" | "url"
  config: Config
  onReady: (deck: Deck) => void
}

export function DeckUploader({ mode, config, onReady }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formatPreview, setFormatPreview] = useState<string | null>(null)

  const acceptedSet = useMemo(() => new Set(config.acceptedFormats), [config.acceptedFormats])

  const fileAccept = useMemo(() => {
    const exts: string[] = []
    if (acceptedSet.has("pdf")) exts.push(".pdf")
    if (acceptedSet.has("pptx")) exts.push(".pptx")
    if (acceptedSet.has("keynote")) exts.push(".key")
    return exts.join(",")
  }, [acceptedSet])

  function isFormatAccepted(fmt: string) {
    return acceptedSet.has(fmt as any)
  }

  async function handleStart() {
    setError(null)
    setLoading(true)
    
    try {
      if (!file) {
        setError("Please choose a file.")
        return
      }
      
      const format = detectFormat({ fileName: file.name, mime: file.type })
      setFormatPreview(format)
      
      if (!isFormatAccepted(format)) {
        setError(
          `This format (${format.toUpperCase()}) is not accepted. Accepted formats: ${config.acceptedFormats
            .map((f) => f.toUpperCase())
            .join(", ")}`
        )
        return
      }

      const id = uuidv4()
      let analysis: Deck["analysis"] | undefined = undefined
      let fileData: ArrayBuffer | undefined = undefined

      if (format === "pdf") {
        fileData = await file.arrayBuffer()
        analysis = await analyzePdf(fileData)
        analysis.analysisMethod = "pdf"
      }

      const deck: Deck = {
        id,
        name: file.name,
        sourceType: "file",
        format,
        fileInfo: { fileName: file.name, sizeBytes: file.size, mime: file.type },
        fileData,
        analysis,
        tests: [],
        createdAt: new Date().toISOString(),
      }
      onReady(deck)
    } catch (e: any) {
      console.error(e)
      setError(e?.message || "Failed to process file.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* File Upload Area */}
      <div className="relative">
        <input
          id="file-upload"
          type="file"
          accept={fileAccept || undefined}
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null
            setFile(f)
            setError(null)
            setFormatPreview(f ? detectFormat({ fileName: f.name, mime: f.type }) : null)
          }}
          className="sr-only"
        />
        <label
          htmlFor="file-upload"
          className={`relative block w-full rounded-lg border border-dashed p-6 text-center cursor-pointer transition-colors ${
            file ? "border-neutral-300 bg-neutral-50" : "border-neutral-200 hover:border-neutral-300"
          }`}
        >
          <div className="mx-auto flex flex-col items-center">
            {file ? (
              <>
                <FileText className="h-10 w-10 text-neutral-600 mb-3" />
                <span className="text-sm font-medium text-neutral-900">{file.name}</span>
                <span className="text-xs text-neutral-600 mt-1">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                </span>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-neutral-400 mb-3" />
                <span className="text-sm font-medium text-neutral-900">Choose a presentation file</span>
                <span className="text-xs text-neutral-600 mt-1">
                  or drag and drop it here
                </span>
              </>
            )}
          </div>
        </label>
      </div>

      {/* Format Detection */}
      {formatPreview && (
        <div className="flex items-center justify-between p-3 rounded-md border">
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-600">Detected format:</span>
            <Badge variant={isFormatAccepted(formatPreview) ? "default" : "destructive"} className="uppercase">
              {formatPreview}
            </Badge>
          </div>
          {isFormatAccepted(formatPreview) && (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
        </div>
      )}

      {/* Accepted Formats */}
      <div className="text-center">
        <p className="text-xs text-neutral-600 mb-2">Accepted formats:</p>
        <div className="flex flex-wrap justify-center gap-2">
          {config.acceptedFormats.map((format) => (
            <Badge key={format} variant="outline" className="uppercase">
              {format}
            </Badge>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-xs text-red-800">{error}</p>
        </div>
      )}

      {/* Start Button */}
      <Button onClick={handleStart} disabled={loading || !file} className="w-full h-10">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Start validation
          </>
        )}
      </Button>
    </div>
  )
}
