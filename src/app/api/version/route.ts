import { NextResponse } from 'next/server'
import { getChangelogForVersion } from '@/lib/changelog'

export const dynamic = 'force-dynamic'

export function GET() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0'
  const entry = getChangelogForVersion(version)
  return NextResponse.json({
    version,
    features: entry?.features ?? [],
    fixes: entry?.fixes ?? [],
  })
}
