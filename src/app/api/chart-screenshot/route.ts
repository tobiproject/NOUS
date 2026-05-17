import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { symbol, tradeId } = await req.json()

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })

    const tvUrl = 'https://www.tradingview.com/embed-widget/advanced-chart/?' + new URLSearchParams({
      locale: 'de_DE',
      symbol,
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      hide_side_toolbar: 'false',
      allow_symbol_change: 'false',
      save_image: 'false',
      withdateranges: 'true',
      range: '1D',
    }).toString()

    // thum.io: free, no API key, no signup — URL placed raw at the end (not encoded)
    const thumbUrl = `https://image.thum.io/get/width/1280/crop/688/${tvUrl}`

    const ssRes = await fetch(thumbUrl, {
      signal: AbortSignal.timeout(35_000),
    })

    if (!ssRes.ok) {
      console.error('[chart-screenshot] thum.io error:', ssRes.status)
      return NextResponse.json({ error: `Screenshot fehlgeschlagen: ${ssRes.status}` }, { status: 500 })
    }

    const buffer = await ssRes.arrayBuffer()
    const path = `${user.id}/${tradeId}/${Date.now()}.png`

    const { error: uploadErr } = await supabase.storage
      .from('screenshots')
      .upload(path, buffer, { contentType: 'image/png', upsert: false })

    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

    const { data: { publicUrl } } = supabase.storage.from('screenshots').getPublicUrl(path)

    const { data: existing } = await supabase
      .from('trades').select('screenshot_urls').eq('id', tradeId).single()

    await supabase.from('trades')
      .update({ screenshot_urls: [...(existing?.screenshot_urls ?? []), publicUrl] })
      .eq('id', tradeId)

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('[chart-screenshot]', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
