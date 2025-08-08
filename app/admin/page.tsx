"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Info, Download, LogOut, Users, SettingsIcon, FileText, TrendingUp, AlertTriangle } from 'lucide-react'
import { AdminChecksForm } from "@/components/admin-checks-form"
import { loadConfig, saveConfig, loadSubmissions } from "@/lib/state"
import { mergePdfs } from "@/lib/merge-pdf"
import type { Deck } from "@/lib/types"

export default function AdminPage() {
  const [config, setConfig] = useState(loadConfig())
  const [subs, setSubs] = useState(loadSubmissions())
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch("/api/admin/check")
      .then(res => {
        if (!res.ok) {
          router.push("/admin/login")
        } else {
          setLoading(false)
        }
      })
      .catch(() => {
        router.push("/admin/login")
      })

    const onStorage = (e: StorageEvent) => {
      if (e.key === "sv_config") setConfig(loadConfig())
      if (e.key === "sv_submissions") setSubs(loadSubmissions())
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [router])

  const passingDecks = useMemo(() => subs.filter((s) => s.tests?.every((t) => t.status === "pass")), [subs])
  const hasVideoOrAudio = useMemo(() => passingDecks.some((d) => d.analysis?.hasVideo || d.analysis?.hasAudio), [passingDecks])
  const hasNonPdf = useMemo(() => passingDecks.some((d) => d.format !== "pdf"), [passingDecks])

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" })
    router.push("/")
  }

  async function handleDownloadMasterPdf() {
    const pdfDecks = passingDecks.filter((d) => d.format === "pdf" && !d.analysis?.hasVideo && !d.analysis?.hasAudio && d.fileData)
    if (pdfDecks.length === 0) {
      alert("No eligible PDF decks to merge.")
      return
    }
    const merged = await mergePdfs(
      pdfDecks.map((d) => ({ name: d.name, data: d.fileData as ArrayBuffer }))
    )
    const blob = new Blob([merged], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "master-deck.pdf"
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <main className="min-h-screen gradient-bg">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </main>
    )
  }

  const completionRate = config.expectedDecks ? Math.round((passingDecks.length / config.expectedDecks) * 100) : 0

  return (
    <main className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="border-b border-gray-200/50 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-500">
                <SettingsIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Manage submissions and validation rules</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                View submission page
              </a>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                  <p className="text-3xl font-bold text-gray-900">{subs.length}</p>
                </div>
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-3xl font-bold text-green-600">{passingDecks.length}</p>
                </div>
                <Users className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-3xl font-bold text-yellow-600">{completionRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Remaining</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {Math.max((config.expectedDecks ?? 0) - passingDecks.length, 0)}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Configuration */}
          <Card className="glass-card shadow-xl lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <SettingsIcon className="h-5 w-5" />
                Validation Configuration
              </CardTitle>
              <CardDescription>
                Configure validation rules, accepted formats, and AI checks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminChecksForm
                config={config}
                onChange={(next) => {
                  setConfig(next)
                  saveConfig(next)
                }}
              />
            </CardContent>
          </Card>

          {/* Submissions & Master Deck */}
          <div className="space-y-6">
            {/* Submissions Overview */}
            <Card className="glass-card shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Recent Submissions
                </CardTitle>
                <CardDescription>Latest speaker submissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {subs.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No submissions yet</p>
                  ) : (
                    subs.slice(0, 10).map((s) => {
                      const failing = (s.tests ?? []).filter((t) => t.status === "fail")
                      const isApproved = failing.length === 0
                      
                      return (
                        <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white/50">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                            <p className="text-xs text-gray-500">
                              {s.submitterName} • {s.format.toUpperCase()}
                            </p>
                          </div>
                          <Badge variant={isApproved ? "default" : "secondary"} className={isApproved ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                            {isApproved ? "Approved" : `${failing.length} issues`}
                          </Badge>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Master Deck Generation */}
            <Card className="glass-card shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Master Deck
                </CardTitle>
                <CardDescription>Generate combined presentation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasVideoOrAudio || hasNonPdf ? (
                  <Alert className="border-amber-200 bg-amber-50">
                    <Info className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">Mixed formats detected</AlertTitle>
                    <AlertDescription className="text-amber-700">
                      Some decks contain video/audio or non-PDF formats. Manual assembly may be required.
                    </AlertDescription>
                  </Alert>
                ) : null}
                
                <Button 
                  onClick={handleDownloadMasterPdf} 
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                  disabled={passingDecks.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF Master ({passingDecks.filter(d => d.format === "pdf" && !d.analysis?.hasVideo && !d.analysis?.hasAudio).length} decks)
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
