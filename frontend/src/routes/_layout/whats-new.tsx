import { createFileRoute } from "@tanstack/react-router"
import { Sparkles, Tag } from "lucide-react"

import { RELEASES, CURRENT_VERSION } from "@/releases"

export const Route = createFileRoute("/_layout/whats-new")({
  component: WhatsNewPage,
  head: () => ({ meta: [{ title: "What's New — Fusion BD CORE OS" }] }),
})

function WhatsNewPage() {
  return (
    <div className="flex flex-col gap-6 max-w-[820px] mx-auto w-full pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          What's New
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Product updates and improvements. Current version{" "}
          <span className="font-semibold text-foreground">v{CURRENT_VERSION}</span>.
        </p>
      </div>

      <div className="relative flex flex-col gap-6 border-l-2 border-muted pl-6">
        {RELEASES.map((r, idx) => (
          <div key={r.version} className="relative">
            {/* timeline dot */}
            <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-bold">
                    <Tag className="h-3 w-3" />v{r.version}
                  </span>
                  {idx === 0 && (
                    <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-bold">
                      LATEST
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
              <h2 className="font-semibold text-sm mb-2">{r.title}</h2>
              <ul className="space-y-1.5">
                {r.highlights.map((h, i) => (
                  <li key={i} className="text-[13px] text-muted-foreground flex gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
