"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import type { Config } from "@/lib/types"

type Props = {
  config: Config
  onChange: (cfg: Config) => void
}

const ALL_FORMATS = ["pdf", "pptx", "keynote", "google-slides", "canva", "figma", "url"]

export function AdminChecksForm({ config, onChange }: Props) {
  const [local, setLocal] = useState<Config>(config)

  function update<K extends keyof Config>(key: K, value: Config[K]) {
    const next = { ...local, [key]: value }
    setLocal(next)
    onChange(next)
  }

  function toggleFormat(fmt: string) {
    const set = new Set(local.acceptedFormats)
    if (set.has(fmt)) set.delete(fmt)
    else set.add(fmt)
    update("acceptedFormats", Array.from(set))
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label>Accepted formats</Label>
          <div className="grid grid-cols-2 gap-2">
            {ALL_FORMATS.map((f) => (
              <label key={f} className="flex items-center gap-2 text-sm">
                <Checkbox checked={local.acceptedFormats.includes(f as any)} onCheckedChange={() => toggleFormat(f)} />
                <span className="uppercase">{f}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-neutral-500">Users will be blocked at upload if the detected format is not accepted.</p>
        </div>

        <div className="space-y-2">
          <Label>Expected speakers</Label>
          <Input
            type="number"
            min={0}
            value={local.expectedDecks ?? 0}
            onChange={(e) => update("expectedDecks", Number(e.target.value))}
          />
        </div>

        <div className="space-y-2">
          <Label>Deterministic checks</Label>
          <div className="grid gap-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={local.enforceSize} onCheckedChange={(v) => update("enforceSize", Boolean(v))} />
              Enforce file size under
              <Input className="h-8 w-20" type="number" min={1} value={local.maxSizeMB} onChange={(e) => update("maxSizeMB", Number(e.target.value))} />
              MB
            </label>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={local.enforceSlideCount} onCheckedChange={(v) => update("enforceSlideCount", Boolean(v))} />
              Enforce slide count between
              <Input className="h-8 w-20" type="number" min={0} value={local.minSlides} onChange={(e) => update("minSlides", Number(e.target.value))} />
              and
              <Input className="h-8 w-20" type="number" min={0} value={local.maxSlides} onChange={(e) => update("maxSlides", Number(e.target.value))} />
            </label>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={local.enforceAspect} onCheckedChange={(v) => update("enforceAspect", Boolean(v))} />
              Require aspect 16:9
            </label>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={local.enforceVideoConstraint} onCheckedChange={(v) => update("enforceVideoConstraint", Boolean(v))} />
              {local.allowVideo ? "Allow video" : "No embedded video"}
            </label>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={local.enforceAudioConstraint} onCheckedChange={(v) => update("enforceAudioConstraint", Boolean(v))} />
              {local.allowAudio ? "Allow audio" : "No embedded audio"}
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>AI checks</Label>
        <div className="rounded-md border divide-y">
          {(local.aiChecks ?? []).map((c, idx) => (
            <div key={c.id} className="grid gap-2 p-3">
              <Input
                value={c.label}
                onChange={(e) => {
                  const copy = [...(local.aiChecks ?? [])]
                  copy[idx] = { ...copy[idx], label: e.target.value }
                  update("aiChecks", copy)
                }}
              />
              <Textarea
                rows={3}
                value={c.prompt}
                onChange={(e) => {
                  const copy = [...(local.aiChecks ?? [])]
                  copy[idx] = { ...copy[idx], prompt: e.target.value }
                  update("aiChecks", copy)
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
