import { Link } from "@tanstack/react-router"
import { cn } from "@/lib/utils"

// Fusion bird mark — SVG matching brand colors
function FusionMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Upper wing — main orange */}
      <ellipse cx="22" cy="18" rx="18" ry="14" transform="rotate(-20 22 18)" fill="#E8913A" opacity="0.95" />
      {/* Lower wing — lighter orange */}
      <ellipse cx="26" cy="28" rx="20" ry="12" transform="rotate(-15 26 28)" fill="#F5BC6C" opacity="0.9" />
      {/* Body — gray */}
      <path d="M38 8 C54 12 58 28 50 40 C44 48 34 48 28 42 C20 34 24 20 32 14 C36 10 38 8 38 8Z" fill="#8E8E8E" opacity="0.85" />
    </svg>
  )
}

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
}

export function Logo({ variant = "full", className, asLink = true }: LogoProps) {
  const iconOnly = <FusionMark size={28} />

  const fullLogo = (
    <div className={cn("flex items-center gap-2.5", className)}>
      <FusionMark size={32} />
      <div className="leading-tight">
        <p className="font-semibold text-[15px] tracking-tight" style={{ color: "#636363" }}>
          fusion
        </p>
        <p className="text-[9.5px] font-medium tracking-[0.15em] uppercase" style={{ color: "#8E8E8E" }}>
          BD CORE OS
        </p>
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
