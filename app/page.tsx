"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, Link2, CheckCircle2, Settings, Sparkles, FileText, Shield } from 'lucide-react'
import { DeckUploader } from "@/components/deck-uploader"
import { TestList } from "@/components/test-list"
import { loadConfig, saveSubmission } from "@/lib/state"
import type { Deck } from "@/lib/types"

export default function SubmissionPage() {
  const [config, setConfig] = useState(loadConfig())
  const [deck, setDeck] = useState<Deck | null>(null)
  const [yourName, setYourName] = useState("")
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
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
      <main className="min-h-screen gradient-bg">
        <div className="mx-auto max-w-2xl px-6 py-24">
          <div className="text-center">
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-lg">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">
              Slides submitted successfully
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
              Your presentation has been submitted and is now under review by the conference organizers.
            </p>
            <Button onClick={startOver} size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-white px-8">
              Submit another presentation
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="border-b border-gray-200/50 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-500">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Slide Validator</h1>
                <p className="text-sm text-gray-500">Conference submission portal</p>
              </div>
            </div>
            <a
              href="/admin/login"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings className="h-4 w-4" />
              Admin
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold tracking-tight text-gray-900 mb-6">
            Submit your
            <br />
            <span className="bg-gradient-to-r from-yellow-500 to-yellow-600 bg-clip-text text-transparent">
              conference slides
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Upload your presentation and let our AI-powered validator ensure it meets all conference requirements.
          </p>
          
          {/* Feature highlights */}
          <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-yellow-500" />
              Format validation
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              AI-powered checks
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-yellow-500" />
              Instant feedback
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 max-w-6xl mx-auto">
          {/* Upload Section */}
          <Card className="glass-card shadow-xl">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-semibold text-gray-900">Upload your presentation</CardTitle>
              <CardDescription className="text-gray-600">
                Start by providing your details and uploading your slides
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="your-name" className="text-sm font-medium text-gray-700">Your name</Label>
                <Input 
                  id="your-name" 
                  placeholder="e.g. Ada Lovelace" 
                  value={yourName} 
                  onChange={(e) => setYourName(e.target.value)}
                  className="h-12 text-base"
                />
              </div>

              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-12">
                  <TabsTrigger value="upload" className="gap-2 text-sm">
                    <Upload className="h-4 w-4" />
                    Upload file
                  </TabsTrigger>
                  <TabsTrigger value="link" className="gap-2 text-sm" disabled>
                    <Link2 className="h-4 w-4" />
                    Paste URL
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="upload" className="mt-6">
                  <DeckUploader
                    mode="file"
                    config={config}
                    onReady={(d) => setDeck(d)}
                  />
                </TabsContent>
                
                <TabsContent value="link" className="mt-6">
                  <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                    <div className="font-medium text-gray-900 mb-2">Coming soon</div>
                    <p className="text-sm text-gray-600">
                      URL validation is being upgraded. Please export to PDF and upload the file.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <Alert className="border-yellow-200 bg-yellow-50">
                <Sparkles className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Pro tip:</strong> Export your slides to PDF format for the most accurate validation results.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card className="glass-card shadow-xl">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-semibold text-gray-900">Validation results</CardTitle>
              <CardDescription className="text-gray-600">
                Real-time feedback on your presentation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!deck ? (
                <div className="text-center py-12">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">
                    Upload your slides to see validation results
                  </p>
                </div>
              ) : (
                <TestList
                  key={deck.id}
                  initialDeck={deck}
                  config={config}
                  onDeckUpdate={setDeck}
                  onAllDone={() => {}}
                />
              )}

              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    All tests must pass to enable submission
                  </p>
                  <Button 
                    disabled={!deck || !canSubmit} 
                    onClick={() => deck && handleSubmitted(deck)}
                    size="lg"
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-8"
                  >
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Submit presentation
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
