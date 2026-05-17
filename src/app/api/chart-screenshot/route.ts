import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { symbol, tradeId } = await req.json()

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })

    const key = process.env.SCREENSHOT_ONE_KEY
    if (!key) return NextResponse.json({ error: 'no_key' }, { status: 503 })

    // TradingView embed widget — shows only the chart, no TV header/navigation
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

    const params = new URLSearchParams({
      access_key: key,
      url: tvUrl,
      viewport_width: '1280',
      viewport_height: '720',
      device_scale_factor: '2',
      format: 'png',
      block_ads: 'true',
      block_cookie_banners: 'true',
      dark_mode: 'true',
      // Wait for chart candles to fully render
      delay: '5',
      timeout: '30',
      // Clip off the small TradingView copyright bar at the bottom (~32px)
      clip_x: '0',
      clip_y: '0',
      clip_width: '1280',
      clip_height: '688',
    })

    const ssRes = await fetch(`https://api.screenshotone.com/take?${params}`, {
      signal: AbortSignal.timeout(35_000),
    })

    if (!ssRes.ok) {
      const err = await ssRes.text()
      console.error('[chart-screenshot] ScreenshotOne error:', err)
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
