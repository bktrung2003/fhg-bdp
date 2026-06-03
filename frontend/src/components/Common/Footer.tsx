export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t py-3 px-6">
      <p className="text-muted-foreground text-xs text-center">
        Fusion BD CORE OS © {currentYear} · Fusion Hotel Group
      </p>
    </footer>
  )
}
