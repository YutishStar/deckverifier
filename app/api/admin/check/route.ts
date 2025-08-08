import { cookies } from "next/headers"

export async function GET() {
  const cookieStore = await cookies()
  const session = cookieStore.get("admin-session")

  if (session?.value === "authenticated") {
    return new Response(JSON.stringify({ authenticated: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } else {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }
}
