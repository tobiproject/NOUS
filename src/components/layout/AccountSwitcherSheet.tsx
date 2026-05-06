'use client'

import { Check } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useAccountContext, type Account } from '@/contexts/AccountContext'

interface Props {
  open: boolean
  onClose: () => void
}

export function AccountSwitcherSheet({ open, onClose }: Props) {
  const { accounts, activeAccount, setActiveAccount } = useAccountContext()

  const active = accounts.filter(a => !a.is_archived)
  const archived = accounts.filter(a => a.is_archived)

  function handleSelect(account: Account) {
    setActiveAccount(account)
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent
        side="bottom"
        className="p-0 rounded-t-2xl border-0 focus:outline-none"
        style={{ background: '#111111', maxHeight: '60vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="px-5 pb-2 pt-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-[13px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Konto wechseln
          </p>
        </div>

        <div className="overflow-y-auto px-4 py-3 space-y-1 pb-safe">
          {active.map(account => {
            const isActive = account.id === activeAccount?.id
            return (
              <button
                key={account.id}
                onClick={() => handleSelect(account)}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left transition-colors"
                style={{
                  background: isActive ? 'rgba(41,98,255,0.12)' : 'transparent',
                  minHeight: 48,
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: isActive ? 'rgba(41,98,255,0.25)' : 'rgba(255,255,255,0.08)',
                    color: isActive ? 'var(--brand-blue)' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {account.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium truncate" style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.75)' }}>
                    {account.name}
                  </p>
                  {account.broker && (
                    <p className="text-[12px] truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {account.broker}
                    </p>
                  )}
                </div>
                {isActive && <Check className="h-4 w-4 shrink-0" style={{ color: 'var(--brand-blue)' }} />}
              </button>
            )
          })}

          {archived.length > 0 && (
            <>
              <div className="pt-2 pb-1 px-3">
                <p className="text-[11px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>Archiviert</p>
              </div>
              {archived.map(account => (
                <button
                  key={account.id}
                  onClick={() => handleSelect(account)}
                  className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left"
                  style={{ minHeight: 48, opacity: 0.5 }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                    {account.name[0]?.toUpperCase()}
                  </div>
                  <p className="text-[15px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{account.name}</p>
                </button>
              ))}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
