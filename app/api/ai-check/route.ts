import { generateText } from "ai"
import { xai } from "@ai-sdk/xai"

// The AI checks use the AI SDK to call xAI models; set XAI_API_KEY to enable. [^1]

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { ruleId, ruleLabel, prompt, deckSummary } = body || {}

    if (!process.env.XAI_API_KEY) {
      return new Response(JSON.stringify({ message: "AI disabled: set XAI_API_KEY to enable AI checks.", pass: false }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Short-circuit the images rule if deterministic analysis already found images.
    const looksLikeImagesRule = ruleId === "ai-has-images" || /image|diagram/i.test(String(ruleLabel || ""))
    const imagesApprox = Number(deckSummary?.imagesApprox ?? 0)
    if (looksLikeImagesRule && imagesApprox >= 1) {
      return new Response(JSON.stringify({ pass: true, reasons: ["Detected images via deterministic analysis."] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    const system = [
      "You are a slide deck validator for a conference.",
      "Evaluate using ONLY the provided metadata. You do NOT see slide content.",
      "When uncertain, prefer pass=true with a brief caution in reasons.",
      "Respond with strict JSON: {\"pass\": boolean, \"reasons\": string[]}. Keep reasons concise (max 2-3 short items)."
    ].join(" ")

    const { text } = await generateText({
      model: xai("grok-3"),
      system,
      prompt: [
        `Rule: ${ruleLabel}`,
        `Instruction: ${prompt}`,
        `Deck metadata (JSON): ${JSON.stringify(deckSummary)}`,
        "Respond with JSON only."
      ].join("\n\n"),
      temperature: 0.2,
      maxTokens: 200
    })

    const trimmed = text.trim()
    let parsed: any = null
    try {
      const jsonStr = trimmed.replace(/^[\s\S]*?({[\s\S]*})[\s\S]*$/m, "$1")
      parsed = JSON.parse(jsonStr)
    } catch {
      return new Response(
        JSON.stringify({ pass: true, reasons: ["Model returned unstructured output; defaulting to pass with caution."] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    const pass = Boolean(parsed?.pass)
    let reasons = Array.isArray(parsed?.reasons) ? parsed.reasons : []
    reasons = reasons
      .filter((r: any) => typeof r === "string")
      .map((r: string) => (r.length > 140 ? r.slice(0, 137) + "..." : r))
      .slice(0, 3)

    return new Response(JSON.stringify({ pass, reasons }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ message: e?.message || "Unexpected error." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
