"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, XCircle, Loader2, RotateCcw, Info, Sparkles } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { Deck, TestResult, Config } from "@/lib/types"
import { runDeterministicChecks } from "@/lib/tests-deterministic"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type Props = {
  initialDeck: Deck
  config: Config
  onDeckUpdate?: (deck: Deck) => void
  onAllDone?: () => void
}

export function TestList({ initialDeck, config, onDeckUpdate, onAllDone }: Props) {
  const [deck, setDeck] = useState<Deck>(initialDeck)
  const [running, setRunning] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [currentStep, setCurrentStep] = useState<string>("") 
  const [progress, setProgress] = useState(0)

  function updateDeck(next: Deck) {
    setDeck(next)
    onDeckUpdate?.(next)
  }

  const hasAiChecks = (config.aiChecks?.length ?? 0) > 0

  async function runAll() {
    setRunning(true)
    setProgress(0)
    setCurrentStep("🔍 Running deterministic checks...")
    
    const detResults = runDeterministicChecks(deck, config)
    let nextDeck = { ...deck, tests: detResults }
    updateDeck(nextDeck)
    
    const totalSteps = (config.aiChecks?.length ?? 0) + 1
    setProgress(Math.round((1 / totalSteps) * 100))

    if (hasAiChecks) {
      setCurrentStep("🤖 Running AI-powered checks...")
      
      const aiResults: TestResult[] = []
      const aiChecks = config.aiChecks ?? []
      
      for (let i = 0; i < aiChecks.length; i++) {
        const ac = aiChecks[i]
        setCurrentStep(`🤖 Checking: ${ac.label}...`)
        
        const result = await (async (): Promise<TestResult> => {
          const body = {
            ruleId: ac.id,
            ruleLabel: ac.label,
            prompt: ac.prompt,
            deckSummary: {
              id: deck.id,
              format: deck.format,
              pageCount: deck.analysis?.pageCount ?? null,
              hasVideo: !!deck.analysis?.hasVideo,
              hasAudio: !!deck.analysis?.hasAudio,
              aspect: deck.analysis?.aspectSummary ?? null,
              imagesApprox: deck.analysis?.imagesApprox ?? null,
              textOpsApprox: deck.analysis?.textOpsApprox ?? null,
              bulletsApprox: deck.analysis?.bulletsApprox ?? null,
              sourceType: deck.sourceType,
            },
          }
          try {
            const res = await fetch("/api/ai-check", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            })
            const json = await res.json()
            if (res.ok && json && typeof json.pass === "boolean") {
              const t: TestResult = {
                id: `ai:${ac.id}`,
                label: ac.label,
                type: "ai",
                status: json.pass ? "pass" : "fail",
                details: json.reasons ?? [],
              }
              return t
            } else {
              const t: TestResult = {
                id: `ai:${ac.id}`,
                label: ac.label,
                type: "ai",
                status: "pass",
                details: [json?.message || "AI check unavailable; defaulted to pass."],
              }
              return t
            }
          } catch (e: any) {
            const t: TestResult = {
              id: `ai:${ac.id}`,
              label: ac.label,
              type: "ai",
              status: "pass",
              details: [e?.message || "AI check failed; defaulted to pass."],
            }
            return t
          }
        })()
        
        aiResults.push(result)
        setProgress(Math.round(((i + 2) / totalSteps) * 100))
        
        // Update deck with partial results for real-time feedback
        nextDeck = { ...nextDeck, tests: [...detResults, ...aiResults] }
        updateDeck(nextDeck)
      }
    }

    setCurrentStep("✅ All checks completed!")
    setProgress(100)
    setTimeout(() => {
      setRunning(false)
      setCurrentStep("")
      setProgress(0)
      onAllDone?.()
    }, 1000)
  }

  useEffect(() => {
    runAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDeck.id])

  const tests = deck.tests ?? []
  const anyRunning = running

  function aiHintFor(id: string) {
    if (!id.startsWith("ai:")) return ""
    const key = id.split(":")[1]
    if (key.includes("title")) return "Uses metadata only (page count, text ops, bullets). Prefers pass when uncertain; we don't read slide content."
    if (key.includes("bullets")) return "Checks bullet density vs slides and presence of images. Prefers pass unless bullets are extremely dense."
    if (key.includes("images")) return "Looks for approximate image count from PDF objects. Small decks can pass without images."
    return "AI check uses metadata only and prefers pass when uncertain."
  }

  const passedTests = tests.filter(t => t.status === "pass").length
  const totalTests = tests.length

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Enhanced progress indicator */}
        {running && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">{currentStep}</span>
                  <span className="text-xs text-blue-700">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Test summary */}
        {totalTests > 0 && !running && (
          <div className="text-center text-xs text-neutral-700">{passedTests} of {totalTests} tests passed</div>
        )}

        <div className="space-y-3">
          {tests.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-neutral-400 mx-auto mb-2" />
                  <p className="text-xs text-neutral-600">Preparing validation tests...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            tests.map((t) => {
              const isAi = t.id.startsWith("ai:")
              const showAll = !!expanded[t.id]
              const details = t.details ?? []
              const shown = showAll ? details : details.slice(0, 2)

              return (
                <Card key={t.id} className={`transition-all ${t.status === "pass" ? "border-green-200" : t.status === "fail" ? "border-red-200" : "border-neutral-200"}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            {isAi && <Sparkles className="h-4 w-4 text-neutral-600" />}<span className="text-sm font-medium">{t.label}</span>
                            {isAi && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-neutral-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs text-xs">
                                  {aiHintFor(t.id)}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                        
                        {shown.length > 0 && (
                          <ul className="space-y-1 text-xs text-neutral-700">
                            {shown.map((d, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-neutral-400 mt-0.5">•</span>
                                <span>{d}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        
                        {details.length > 2 && (
                          <button
                            type="button"
                            className="mt-1 text-[11px] text-neutral-600 hover:text-neutral-900 underline underline-offset-2"
                            onClick={() => setExpanded((m) => ({ ...m, [t.id]: !m[t.id] }))}
                          >
                            {showAll ? "Show less" : `Show ${details.length - 2} more`}
                          </button>
                        )}
                      </div>
                      
                      <div className="shrink-0">
                        {t.status === "pass" ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Pass
                          </Badge>
                        ) : t.status === "fail" ? (
                          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                            <XCircle className="h-3 w-3 mr-1" />
                            Fail
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-neutral-100 text-neutral-700">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Running
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        <div className="flex justify-center">
          <Button variant="outline" onClick={runAll} disabled={anyRunning} className="gap-2 h-9 px-3 text-xs">
            <RotateCcw className="h-4 w-4" /> Re-run
          </Button>
        </div>
      </div>
    </TooltipProvider>
  )
}
