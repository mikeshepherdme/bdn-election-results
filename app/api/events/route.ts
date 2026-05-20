import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { getRaces } from '@/lib/mock-data'
import type { RaceEvent } from '@/app/api/race/[slug]/events/route'

export const dynamic = 'force-dynamic'

const FILE = join(process.cwd(), 'data/race-events.json')

export interface GlobalEvent extends RaceEvent {
  race_slug: string
  race_label: string
}

function readAll(): Record<string, RaceEvent[]> {
  try {
    return JSON.parse(readFileSync(FILE, 'utf-8'))
  } catch {
    return {}
  }
}

export async function GET() {
  const all = readAll()
  const races = getRaces()
  const labelBySlug = new Map<string, string>()
  for (const r of races) {
    const label = r.district ? `${r.office}, Dist. ${r.district}` : r.office
    const partySuffix = r.party === 'Democratic' ? ' (D)' : r.party === 'Republican' ? ' (R)' : ''
    labelBySlug.set(r.slug, `${label}${partySuffix}`)
  }

  const merged: GlobalEvent[] = []
  for (const [slug, evs] of Object.entries(all)) {
    for (const ev of evs) {
      merged.push({
        ...ev,
        race_slug: slug,
        race_label: labelBySlug.get(slug) ?? slug,
      })
    }
  }
  merged.sort((a, b) => b.created_at.localeCompare(a.created_at))

  return NextResponse.json(merged, { headers: { 'Cache-Control': 'no-store' } })
}
