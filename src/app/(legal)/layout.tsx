import Link from 'next/link'
import Image from 'next/image'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-1)', color: 'var(--fg-1)' }}>
      <header className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: 'var(--border-raw)' }}>
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image src="/logo/nous-mark-white.svg" alt="NOUS" width={20} height={20} />
          <Image src="/logo/nous-wordmark-white.svg" alt="NOUS" width={58} height={14} />
        </Link>
        <Link
          href="/dashboard"
          className="text-xs hover:underline"
          style={{ color: 'var(--fg-4)' }}
        >
          ← Zurück zur App
        </Link>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-12">
        {children}
      </main>
      <footer className="border-t px-6 py-6 flex flex-wrap gap-4 justify-center" style={{ borderColor: 'var(--border-raw)' }}>
        <Link href="/impressum" className="text-xs hover:underline" style={{ color: 'var(--fg-4)' }}>Impressum</Link>
        <Link href="/datenschutz" className="text-xs hover:underline" style={{ color: 'var(--fg-4)' }}>Datenschutz</Link>
        <Link href="/agb" className="text-xs hover:underline" style={{ color: 'var(--fg-4)' }}>AGB</Link>
        <Link href="/about" className="text-xs hover:underline" style={{ color: 'var(--fg-4)' }}>Über NOUS</Link>
      </footer>
    </div>
  )
}
