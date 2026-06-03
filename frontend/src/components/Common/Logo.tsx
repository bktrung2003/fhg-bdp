import { Link } from "@tanstack/react-router"
import { cn } from "@/lib/utils"

// Fusion bird logo — SVG approximation of the orange+gray bird mark
function FusionMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Orange upper petal */}
      <path
        d="M6 38 C4 18 22 4 40 8 C30 20 16 30 6 38Z"
        fill="#F0A040"
        opacity="0.95"
      />
      {/* Orange lower petal (lighter) */}
      <path
        d="M8 43 C12 22 32 12 48 18 C36 30 20 40 8 43Z"
        fill="#F7C070"
        opacity="0.9"
      />
      {/* Gray bird body / tail */}
      <path
        d="M38 8 C52 10 56 26 50 38 C46 44 36 46 28 40 C20 34 22 22 28 16 C34 10 38 8 38 8Z"
        fill="#939393"
        opacity="0.88"
      />
    </svg>
  )
}

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
}

export function Logo({ variant = "full", className, asLink = true }: LogoProps) {
  const iconOnly = (
    <FusionMark size={28} />
  )

  const fullLogo = (
    <div className={cn("flex items-center gap-2.5", className)}>
      <FusionMark size={28} />
      <div className="leading-tight">
        <p className="font-semibold text-sm tracking-tight text-foreground">fusion</p>
        <p className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase">BD CORE OS</p>
      </div>
    </div>
  )

  const responsive = (
    <>
      <div className="group-data-[collapsible=icon]:hidden">
        {fullLogo}
      </div>
      <div className="hidden group-data-[collapsible=icon]:flex justify-center">
        <FusionMark size={24} />
      </div>
    </>
  )

  const content =
    variant === "icon" ? iconOnly :
    variant === "responsive" ? responsive :
    fullLogo

  if (!asLink) return content
  return <Link to="/">{content}</Link>
}
