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
    <main className="min-h-screen bg-gray-50">
      {/* Close button */}
      <button
        onClick={handleClose}
        className="fixed top-6 right-6 z-10 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="text-center">
            {/* Avatar */}
            <div className="mx-auto mb-8 h-20 w-20 overflow-hidden rounded-full bg-gray-200">
              <img
                src="/placeholder.svg?height=80&width=80&text=Admin"
                alt="Admin"
                className="h-full w-full object-cover"
              />
            </div>

            {/* Title */}
            <h1 className="mb-2 text-2xl font-semibold text-gray-900">
              slidevalidator.com
            </h1>

            {/* Subtitle */}
            <p className="mb-2 text-gray-600">
              Admin access for conference organizers.
            </p>

            {/* Badge line */}
            <div className="mb-8 flex items-center justify-center gap-2 text-sm text-gray-500">
              <span>By Admin</span>
              <span className="text-yellow-500">⚡</span>
              <span>Secure dashboard access</span>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="mb-6">
              <div className="flex overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password..."
                  className="flex-1 border-0 bg-transparent px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0"
                  required
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="rounded-none border-0 bg-yellow-600 px-6 py-3 text-white hover:bg-yellow-700 focus:ring-0 disabled:opacity-50"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </Button>
              </div>
            </form>

            {/* Error Message */}
            {error && (
              <div className="mb-6">
                <Alert variant="destructive" className="border-red-200 bg-red-50 text-left">
                  <AlertDescription className="text-red-800 text-sm">{error}</AlertDescription>
                </Alert>
              </div>
            )}

            {/* Legal text */}
            <div className="mb-6 text-xs text-gray-500">
              <p>
                By signing in, you agree to the platform's{" "}
                <a href="#" className="underline hover:text-gray-700">
                  Terms of Service
                </a>{" "}
                and acknowledge its{" "}
                <a href="#" className="underline hover:text-gray-700">
                  Privacy Policy
                </a>
                .
              </p>
            </div>

            {/* Bottom link */}
            <div>
              <a
                href="/"
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to submissions
              </a>
            </div>

            {/* Development note */}
            <div className="mt-8 rounded-lg bg-gray-100 p-4 text-xs text-gray-600">
              <p className="font-medium mb-1">Development Mode</p>
              <p>Default password: <code className="bg-white px-2 py-1 rounded font-mono">admin123</code></p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
