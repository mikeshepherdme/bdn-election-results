import { NextResponse } from 'next/server'
import { getRaceBySlug, isConfigured } from '@/lib/ddhq'
import { getRace } from '@/lib/mock-data'
import { POLLING } from '@/lib/polling-data'
import { runForecast } from '@/lib/rcv-sim'
import type { RCVForecastResult } from '@/lib/rcv-sim'

export const dynamic = 'force-dynamic'

// Module-level cache keyed by "slug:actualTotal" — same inputs, same result
const cache = new Map<string, { result: RCVForecastResult; at: number }>()
const CACHE_MS = 30_000  // 30 s

interface Props {
  params: Promise<{ slug: string }>
}

export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params

  const polling = POLLING[slug]
  if (!polling) {
    return NextResponse.json({ error: 'No polling data for this race' }, { status: 404 })
  }

  const race = isConfigured()
    ? await getRaceBySlug(slug)
    : getRace(slug)

  if (!race) {
    return NextResponse.json({ error: 'Race not found' }, { status: 404 })
  }

  const cacheKey = `${slug}:${race.topline_results.total_votes}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return NextResponse.json(cached.result, {
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'X-Forecast-Cached': 'true',
      },
    })
  }

  const result = runForecast(race, polling, 10_000)
  cache.set(cacheKey, { result, at: Date.now() })

  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
