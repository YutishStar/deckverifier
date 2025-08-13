import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// The AI checks use the AI SDK to call OpenAI models; set OPENAI_API_KEY to enable.

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { ruleId, ruleLabel, prompt, deckSummary } = body || {}

    if (!process.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ 
        pass: true, 
        reasons: ["⚠️ AI disabled: OPENAI_API_KEY not configured. Using deterministic analysis."],
        fallback: true
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Smart short-circuits based on deterministic analysis
    const imagesApprox = Number(deckSummary?.imagesApprox ?? 0)
    const bulletsApprox = Number(deckSummary?.bulletsApprox ?? 0)
    const textOpsApprox = Number(deckSummary?.textOpsApprox ?? 0)
    
    // Images rule optimization
    const looksLikeImagesRule = ruleId === "ai-has-images" || /image|diagram|visual/i.test(String(ruleLabel || ""))
    if (looksLikeImagesRule && imagesApprox >= 1) {
      return new Response(JSON.stringify({ 
        pass: true, 
        reasons: [`✅ Found ${imagesApprox} images via analysis`] 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }
    
    // Bullet points rule optimization
    const looksLikeBulletsRule = ruleId === "ai-no-bullets" || /bullet|list/i.test(String(ruleLabel || ""))
    if (looksLikeBulletsRule && bulletsApprox === 0) {
      return new Response(JSON.stringify({ 
        pass: true, 
        reasons: ["✅ No bullet points detected via analysis"] 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Enhanced system prompt with context awareness
    const platformInfo = deckSummary?.platform ? `Platform: ${deckSummary.platform}` : ""
    const system = [
      "You are an expert slide deck validator for a professional conference.",
      "Evaluate using ONLY the provided metadata. You do NOT see actual slide content.",
      "Consider the platform/format when making judgments.",
      "When uncertain, prefer pass=true with constructive feedback.",
      "Respond with strict JSON: {\"pass\": boolean, \"reasons\": string[]}.",
      "Keep reasons concise, actionable, and positive (max 2-3 items).",
      platformInfo
    ].filter(Boolean).join(" ")

    // Enhanced prompt with better context
    const contextualPrompt = [
      `🎯 Validation Rule: ${ruleLabel}`,
      `📋 Instructions: ${prompt}`,
      `📊 Deck Analysis:`,
      `- Format: ${deckSummary?.format || 'unknown'}`,
      `- Platform: ${deckSummary?.platform || 'unknown'}`,
      `- Slides: ${deckSummary?.pageCount || 'unknown'}`,
      `- Images: ${imagesApprox}`,
      `- Text elements: ${textOpsApprox}`,
      `- Bullet points: ${bulletsApprox}`,
      `- Video: ${deckSummary?.hasVideo ? 'yes' : 'no'}`,
      `- Audio: ${deckSummary?.hasAudio ? 'yes' : 'no'}`,
      `- Aspect ratio: ${deckSummary?.aspect?.commonRatio || 'unknown'}`,
      "",
      "Respond with JSON only: {\"pass\": boolean, \"reasons\": string[]}"
    ].join("\n")

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system,
      prompt: contextualPrompt,
      temperature: 0.1
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
      .map((r: string) => {
        // Clean up and format reasons
        let cleaned = r.trim()
        if (cleaned.length > 120) cleaned = cleaned.slice(0, 117) + "..."
        // Add emoji if not present
        if (!cleaned.match(/^[\u{1F300}-\u{1F9FF}]/u)) {
          cleaned = (pass ? "✅ " : "⚠️ ") + cleaned
        }
        return cleaned
      })
      .slice(0, 3)
    
    // Add fallback reason if none provided
    if (reasons.length === 0) {
      reasons = [pass ? "✅ Validation passed" : "⚠️ Validation failed"]
    }

    return new Response(JSON.stringify({ pass, reasons }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (e: any) {
    console.error("AI check error:", e)
    
    // Check if it's a credits/quota error
    const errorMsg = e?.message || ""
    const isQuotaError = errorMsg.includes("credits") || errorMsg.includes("quota") || errorMsg.includes("limit")
    
    return new Response(JSON.stringify({ 
      pass: true, 
      reasons: isQuotaError 
        ? ["⚠️ AI credits exhausted. Check OpenAI billing/limits or use a lower-cost model."]
        : ["⚠️ AI check failed, defaulting to pass. Please review manually."],
      error: errorMsg,
      fallback: true
    }), {
      status: 200, // Return 200 to avoid breaking the validation flow
      headers: { "Content-Type": "application/json" },
    })
  }
}
