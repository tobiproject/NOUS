'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, BarChart2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { AccountSwitcher } from '@/components/accounts/AccountSwitcher'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/journal', label: 'Journal' },
  { href: '/performance', label: 'Performance' },
  { href: '/analysen', label: 'Analysen' },
  { href: '/risk', label: 'Risk' },
  { href: '/kalender', label: 'Kalender' },
  { href: '/tagesplan', label: 'Tagesplan' },
  { href: '/lernmodus', label: 'Lernen' },
  { href: '/accounts', label: 'Konten' },
]

export function AppNav() {
  const pathname = usePathname()
  const { logout } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex h-14 items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold shrink-0">
            <BarChart2 className="h-5 w-5 text-primary" />
            NOUS
          </Link>

          <Separator orientation="vertical" className="h-5" />

          <nav className="flex items-center gap-1" aria-label="Hauptnavigation">
            {NAV_ITEMS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md transition-colors',
                  pathname === href || pathname.startsWith(href + '/')
                    ? 'bg-accent text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <AccountSwitcher />
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              aria-label="Abmelden"
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
