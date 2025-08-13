"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, X } from 'lucide-react'

export default function AdminLoginPage() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        router.push("/admin")
      } else {
        const data = await res.json()
        setError(data.message || "Invalid password")
      }
    } catch (e) {
      setError("Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    router.push("/")
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Close button */}
      <button
        onClick={handleClose}
        className="fixed top-6 right-6 z-10 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Header matching main page style */}
          <div className="mb-10 space-y-2 text-center">
            {/* Logo */}
            <div className="mx-auto mb-6 h-16 w-16 overflow-hidden rounded-full bg-gray-100">
              <img
                src="/images/admin-logo.svg"
                alt="Admin"
                className="h-full w-full object-cover"
              />
            </div>
            
            <h2 className="text-2xl font-semibold tracking-tight">Admin Access</h2>
            <p className="text-sm text-neutral-600">Secure dashboard for conference organizers.</p>
          </div>

          {/* Login Card matching main page style */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="pb-4 pt-6 text-center">
              <h3 className="text-base font-medium">Sign In</h3>
              <p className="text-xs text-muted-foreground">Enter your admin credentials</p>
            </div>
            <div className="p-6 pt-0 space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="password" className="text-xs font-medium">Admin Password</label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password..."
                    required
                  />
                </div>
                
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </form>

              {/* Error Message */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* Back link */}
              <div className="text-center">
                <a
                  href="/"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to submissions
                </a>
              </div>

              {/* Development note */}
              <div className="rounded-lg bg-muted p-4 text-xs text-muted-foreground">
                <p className="font-medium mb-1">Development Mode</p>
                <p>Default password: <code className="bg-background px-2 py-1 rounded font-mono">admin123</code></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
