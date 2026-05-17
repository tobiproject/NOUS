'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { useTradingRules, type TradingRule } from '@/hooks/useTradingRules'

export function TradingRulesEditor() {
  const { fetchRules, createRule, updateRule, deleteRule } = useTradingRules()
  const [rules, setRules] = useState<TradingRule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newRuleText, setNewRuleText] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true)
    const data = await fetchRules()
    setRules(data)
    setIsLoading(false)
  }, [fetchRules])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    const text = newRuleText.trim()
    if (!text) return
    setIsAdding(true)
    const rule = await createRule(text)
    if (rule) setRules(prev => [...prev, rule])
    setNewRuleText('')
    setIsAdding(false)
  }

  const handleToggle = async (id: string, isActive: boolean) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: isActive } : r))
    await updateRule(id, { is_active: isActive })
  }

  const handleDelete = async (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id))
    await deleteRule(id)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Meine Trading-Regeln</CardTitle>
        <p className="text-xs text-muted-foreground">
          Diese Regeln werden der KI als Kontext mitgegeben — sie prüft, ob du dich an sie gehalten hast.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded-md" />)}
          </div>
        ) : (
          <>
            {rules.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border/60 rounded-md">
                Noch keine Regeln. Füge deine Trading-Regeln hinzu.
              </p>
            )}
            <div className="space-y-2">
              {rules.map(rule => (
                <div
                  key={rule.id}
                  className="flex items-center gap-2.5 rounded-md border border-border/60 bg-card px-3 py-2.5"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  <span className={`flex-1 text-sm ${!rule.is_active ? 'line-through text-muted-foreground' : ''}`}>
                    {rule.rule_text}
                  </span>
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={(checked) => handleToggle(rule.id, checked)}
                    aria-label={rule.is_active ? 'Regel deaktivieren' : 'Regel aktivieren'}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleDelete(rule.id)}
                    aria-label="Regel löschen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add new rule */}
            <div className="flex gap-2 pt-1">
              <Input
                placeholder="Neue Regel hinzufügen…"
                value={newRuleText}
                onChange={e => setNewRuleText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-sm"
              />
              <Button
                onClick={handleAdd}
                disabled={isAdding || !newRuleText.trim()}
                size="sm"
                className="gap-1.5 shrink-0"
              >
                <Plus className="h-4 w-4" />
                Hinzufügen
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
