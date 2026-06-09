import { Link } from "@tanstack/react-router"

import { CURRENT_VERSION } from "@/releases"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t py-3 px-6">
      <p className="text-muted-foreground text-xs text-center">
        Fusion BD CORE OS © {currentYear} · Fusion Hotel Group{" "}
        <span className="mx-1 opacity-50">·</span>
        <Link
          to="/whats-new"
          className="hover:text-foreground hover:underline underline-offset-2"
        >
          v{CURRENT_VERSION}
        </Link>
      </p>
    </footer>
  )
}
