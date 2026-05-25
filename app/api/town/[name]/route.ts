import { NextResponse } from 'next/server'
import { getRaces } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ name: string }>
}

export async function GET(_req: Request, { params }: Props) {
  const { name } = await params
  const townName = decodeURIComponent(name)
  const races = getRaces()

  const results = []

  for (const race of races) {
    for (const county of race.counties) {
      const vcu = county.vcus.find(v => v.vcu === townName)
      if (!vcu) continue

      const townTotal = Object.values(vcu.votes).reduce((s, v) => s + (v || 0), 0)

      results.push({
        slug:               race.slug,
        office:             race.office,
        party:              race.party,
        district:           race.district ?? null,
        level:              race.level,
        election_type_id:   race.election_type_id,
        candidates:         race.candidates.map(c => ({
          cand_id:    c.cand_id,
          first_name: c.first_name,
          last_name:  c.last_name,
          suffix:     c.suffix || '',
        })),
        town_votes:          vcu.votes,      // Record<string, number>
        town_total:          townTotal,
        called:              race.called,
        called_candidates:   race.topline_results.called_candidates,
        county:              county.county,
      })
      break  // town can only appear once per race
    }
  }

  return NextResponse.json(results, {
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
