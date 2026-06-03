import { Appearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import { Footer } from "./Footer"

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left panel — Fusion brand */}
      <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 relative hidden lg:flex lg:flex-col lg:items-center lg:justify-center gap-8 p-12">
        <Logo variant="full" className="scale-[2] origin-center" asLink={false} />
        <div className="text-center mt-8">
          <p className="text-lg font-semibold text-foreground/80 tracking-tight">
            Business Development CORE OS
          </p>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
            One source of truth for pipeline, owner relationships, deal governance and pre-opening execution.
          </p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center justify-between">
          {/* Show small logo on mobile (left panel hidden) */}
          <div className="lg:hidden">
            <Logo variant="full" asLink={false} />
          </div>
          <div className="ml-auto">
            <Appearance />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">{children}</div>
        </div>
        <Footer />
      </div>
    </div>
  )
}
