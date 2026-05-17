import { NextResponse } from 'next/server'
import { getCurrentChangelog } from '@/lib/changelog'

export const dynamic = 'force-dynamic'

export function GET() {
  const buildId = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev'
  const releaseVersion = process.env.NEXT_PUBLIC_RELEASE_VERSION ?? '0.0.0'
  const entry = getCurrentChangelog()
  return NextResponse.json({
    buildId,
    releaseVersion,
    features: entry.features ?? [],
    fixes: entry.fixes ?? [],
  })
}
