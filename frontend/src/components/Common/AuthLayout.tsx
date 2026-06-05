import { Appearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import { Footer } from "./Footer"

interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left panel — Fusion brand. Light, warm background so the logo
          (white bg / grey wordmark / orange bird) reads cleanly. */}
      <div className="bg-gradient-to-br from-[#fff7f0] via-[#fdf2e9] to-[#f7ede3] relative hidden lg:flex lg:flex-col lg:items-center lg:justify-center gap-6 p-12 border-r border-orange-100/60">
        <img
          src="/assets/images/fusion-logo.png"
          alt="Fusion"
          className="h-44 w-auto object-contain"
        />
        <div className="text-center">
          <p className="text-lg font-semibold text-[#4a4f5a] tracking-tight">
            Business Development CORE OS
          </p>
          <p className="text-sm text-[#7a8089] mt-2 max-w-sm leading-relaxed">
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
