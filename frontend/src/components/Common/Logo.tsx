import { Link } from "@tanstack/react-router"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

// Paths to the real Fusion logo images in /public/assets/images/
const LOGO_LIGHT = "/assets/images/fusion-logo.png"
const LOGO_DARK = "/assets/images/fusion-logo-dark.png"
// Bird-only mark for collapsed sidebar / small icon contexts.
const LOGO_ICON = "/assets/images/fusion-icon.png"

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
}

export function Logo({ variant = "full", className, asLink = true }: LogoProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const src = isDark ? LOGO_DARK : LOGO_LIGHT

  // Icon only — small bird, no text
  const iconOnly = (
    <img
      src={LOGO_ICON}
      alt="Fusion"
      className={cn("h-7 w-auto object-contain", className)}
    />
  )

  // Full — logo with text
  const fullLogo = (
    <img
      src={src}
      alt="Fusion BD CORE OS"
      className={cn("h-10 w-auto object-contain", className)}
    />
  )

  // Responsive — full when sidebar open, icon when collapsed
  const responsive = (
    <>
      <img
        src={src}
        alt="Fusion BD CORE OS"
        className={cn(
          "h-9 w-auto object-contain group-data-[collapsible=icon]:hidden",
          className,
        )}
      />
      <img
        src={LOGO_ICON}
        alt="Fusion"
        className={cn(
          "h-7 w-auto object-contain hidden group-data-[collapsible=icon]:block",
          className,
        )}
      />
    </>
  )

  const content =
    variant === "icon" ? iconOnly :
    variant === "responsive" ? responsive :
    fullLogo

  if (!asLink) return content
  return <Link to="/">{content}</Link>
}
