import Link from "next/link"
import { LogOut } from "lucide-react"

interface UploadHeaderProps {
  onLogout: () => void
}

export function UploadHeader({ onLogout }: UploadHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-3 pt-3">
      <div className="bg-card/90 border border-white/10 rounded-xl h-14 flex items-center justify-between px-4 max-w-4xl mx-auto">
        <Link href="/" className="font-heading font-bold text-lg gradient-text-extended" aria-label="Moistello home">
          Moistello
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline" aria-hidden="true">/upload</span>
          <button
            type="button"
            onClick={onLogout}
            className="bg-white/5 border border-white/10 rounded-full p-2 text-muted-foreground hover:text-red-400 transition-colors"
            title="Logout"
            aria-label="Log out of upload manager"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  )
}
