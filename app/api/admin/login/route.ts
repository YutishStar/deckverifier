import { NextRequest } from "next/server"
import { cookies } from "next/headers"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123"

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()

    if (password === ADMIN_PASSWORD) {
      const cookieStore = await cookies()
      cookieStore.set("admin-session", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
      })

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    } else {
      return new Response(JSON.stringify({ message: "Invalid password" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }
  } catch (e) {
    return new Response(JSON.stringify({ message: "Login failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
