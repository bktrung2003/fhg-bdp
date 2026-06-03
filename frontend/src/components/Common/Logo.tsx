import { Link } from "@tanstack/react-router"
import { cn } from "@/lib/utils"

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
}

export function Logo({ variant = "full", className, asLink = true }: LogoProps) {
  const icon = (
    <div className={cn(
      "flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-background font-bold text-sm flex-shrink-0",
      className
    )}>
      F
    </div>
  )

  const full = (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-background font-bold text-sm flex-shrink-0">
        F
      </div>
      <div className="leading-tight">
        <p className="font-semibold text-sm tracking-tight">Fusion BD</p>
        <p className="text-[10px] text-muted-foreground font-medium">CORE OS</p>
      </div>
    </div>
  )

  const responsive = (
    <>
      <div className="group-data-[collapsible=icon]:hidden">
        {full}
      </div>
      <div className="hidden group-data-[collapsible=icon]:flex">
        {icon}
      </div>
    </>
  )

  const content = variant === "icon" ? icon : variant === "responsive" ? responsive : full

  if (!asLink) return content
  return <Link to="/">{content}</Link>
}
