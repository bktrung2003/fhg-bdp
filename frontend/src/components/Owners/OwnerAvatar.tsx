import { useState } from "react"
import { OpenAPI } from "@/client"
import { cn } from "@/lib/utils"

interface Props {
  ownerId: string
  company: string
  logoPath?: string | null
  className?: string   // size + shape, e.g. "h-9 w-9 rounded-md"
  textClassName?: string
}

/** Owner logo with graceful fallback to initials.
 *  Logo is streamed from the backend with a ?token= query (so <img> works). */
export function OwnerAvatar({ ownerId, company, logoPath, className, textClassName }: Props) {
  const [failed, setFailed] = useState(false)
  const initials = (company || "?").slice(0, 2).toUpperCase()

  if (logoPath && !failed) {
    const token = localStorage.getItem("access_token") || ""
    const src = `${OpenAPI.BASE}/api/v1/owners/${ownerId}/logo?token=${encodeURIComponent(token)}`
    return (
      <div className={cn("bg-white border flex items-center justify-center overflow-hidden flex-shrink-0", className)}>
        <img
          src={src}
          alt={company}
          className="h-full w-full object-contain p-1"
          onError={() => setFailed(true)}
        />
      </div>
    )
  }

  return (
    <div className={cn("bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0", className, textClassName)}>
      {initials}
    </div>
  )
}
