import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { callAI } from '@/lib/ai-client'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { notes } = await req.json()
  if (!notes?.trim()) return NextResponse.json({ error: 'Kein Text vorhanden' }, { status: 400 })

  const aiResponse = await callAI({
    userId: user.id,
    system: '',
    messages: [{
      role: 'user',
      content: `Du bist ein Trading-Journal-Assistent. Der folgende Text wurde per Spracheingabe (z.B. Wispr Flow) diktiert und enthält typische Diktierfehler, Füllwörter und unstrukturierte Gedanken eines Traders.

Bereinige den Text: korrigiere Fehler, entferne Füllwörter ("ähm", "also", "irgendwie"), strukturiere die Gedanken klar und präzise. Behalte alle inhaltlichen Details und den Trading-Kontext vollständig. Schreibe in der ersten Person. Antworte NUR mit dem bereinigten Text — keine Erklärungen, keine Präambel.

Originaltext:
${notes}`,
    }],
    maxTokens: 1024,
  })

  const rewritten = aiResponse.text ?? ''
  return NextResponse.json({ rewritten })
}
