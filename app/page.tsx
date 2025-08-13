"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, Link2, CheckCircle2, Sparkles, FileText, Shield, Search, Share2 } from 'lucide-react'
import { DeckUploader } from "@/components/deck-uploader"
import { TestList } from "@/components/test-list"
import { loadConfig, saveSubmission, defaultConfig } from "@/lib/state"
import type { Deck } from "@/lib/types"

export default function SubmissionPage() {
  const [config, setConfig] = useState(defaultConfig)
  const [deck, setDeck] = useState<Deck | null>(null)
  const [yourName, setYourName] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [tab, setTab] = useState<"upload" | "link">("upload")
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Initialize config from localStorage after hydration
    setConfig(loadConfig())
    setIsHydrated(true)
    
    const onStorage = (e: StorageEvent) => {
      if (e.key === "sv_config") setConfig(loadConfig())
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const canSubmit = useMemo(() => {
    if (!deck) return false
    return deck.tests?.every((t) => t.status === "pass")
  }, [deck])

  function handleSubmitted(finalDeck: Deck) {
    if (!yourName.trim()) {
      alert("Please enter your name before submitting.")
      return
    }
    const saved = saveSubmission({ ...finalDeck, submitterName: yourName.trim(), submittedAt: new Date().toISOString() })
    setSubmitted(true)
    setDeck(null)
    setYourName("")
  }

  function startOver() {
    setSubmitted(false)
    setDeck(null)
  }

  if (submitted) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-xl px-6 py-24">
          <div className="text-center space-y-4">
            <CheckCircle2 className="mx-auto h-10 w-10 text-neutral-700" />
            <h1 className="text-3xl font-semibold tracking-tight">Slides submitted</h1>
            <p className="text-sm text-neutral-600">
              Your presentation was saved for review. You can submit another one.
            </p>
            <Button onClick={startOver} size="sm" variant="outline">
              Submit another presentation
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      {/* Substack-inspired Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="mx-auto max-w-4xl px-4">
          <div className="relative flex items-center justify-between h-14">
            {/* Left Section - Simple Avatar */}
            <div className="flex items-center">
              <img 
                src="/images/admin-avatar.png" 
                alt="Avatar" 
                className="h-8 w-8 rounded-full" 
              />
            </div>
            
            {/* Center Section - Clean Brand */}
            <div className="absolute left-1/2 -translate-x-1/2">
              <div className="text-2xl font-medium text-gray-900 tracking-tight">
                deckverifier.com/balajis
              </div>
            </div>
            
            {/* Right Section - Minimal Actions */}
            <div className="flex items-center space-x-4">
              <button 
                aria-label="Search" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Search className="h-5 w-5" />
              </button>
              <button 
                aria-label="Share" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
                onClick={async () => {
                  const shareUrl = process.env.NEXT_PUBLIC_SHARE_URL || window.location.href;
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    // You can add a toast notification here later
                  } catch (err) {
                    console.error('Failed to copy link:', err);
                  }
                }}
              >
                <Share2 className="h-5 w-5" />
              </button>
              <a 
                href="/admin/login" 
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Admin Sign in
              </a>
            </div>
          </div>
          {/* Substack-style Navigation */}
          <nav className="flex items-center justify-center space-x-8 py-3 text-sm">
            <button
              className={`pb-2 transition-colors ${
                tab === "upload" 
                  ? "text-gray-900 font-medium border-b-2 border-gray-900" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setTab("upload")}
            >
              Submit file
            </button>
            <button
              className={`pb-2 transition-colors ${
                tab === "link" 
                  ? "text-gray-900 font-medium border-b-2 border-gray-900" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setTab("link")}
            >
              Submit URL
            </button>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Hero */}
        <div className="mb-10 space-y-2 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Submit your slides</h2>
          <p className="text-sm text-neutral-600">Fast, minimal validation before you share.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upload Section */}
          <Card>
            <CardHeader className="pb-4 text-center">
              <CardTitle className="text-base font-medium">Upload</CardTitle>
              <CardDescription className="text-xs">Provide your details and add a file</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="your-name" className="text-xs">Your name</Label>
                <Input id="your-name" placeholder="e.g. Ada Lovelace" value={yourName} onChange={(e) => setYourName(e.target.value)} />
              </div>

              <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-9">
                  <TabsTrigger value="upload" className="gap-2 text-xs">
                    <Upload className="h-3.5 w-3.5" /> Upload
                  </TabsTrigger>
                  <TabsTrigger value="link" className="gap-2 text-xs">
                    <Link2 className="h-3.5 w-3.5" /> URL
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="mt-4">
                  <DeckUploader mode="file" config={config} onReady={(d) => setDeck(d)} />
                </TabsContent>

                <TabsContent value="link" className="mt-4">
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-neutral-600">
                    Coming soon
                  </div>
                </TabsContent>
              </Tabs>

              <Alert>
                <AlertDescription className="text-xs">
                  Export slides to PDF for the most accurate results.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card>
            <CardHeader className="pb-4 text-center">
              <CardTitle className="text-base font-medium">Results</CardTitle>
              <CardDescription className="text-xs">Real-time feedback</CardDescription>
            </CardHeader>
            <CardContent>
              {!deck ? (
                <div className="text-center py-10">
                  <FileText className="mx-auto mb-3 h-8 w-8 text-neutral-300" />
                  <p className="text-sm text-neutral-600">Upload a file to see results</p>
                </div>
              ) : (
                <TestList key={deck.id} initialDeck={deck} config={config} onDeckUpdate={setDeck} onAllDone={() => {}} />
              )}

              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <p className="text-xs text-neutral-600">All tests must pass to submit</p>
                <Button disabled={!deck || !canSubmit} onClick={() => deck && handleSubmitted(deck)} size="sm">
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Submit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
