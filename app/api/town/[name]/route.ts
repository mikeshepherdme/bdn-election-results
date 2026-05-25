import { NextResponse } from 'next/server'
import { getTownRaces, isConfigured } from '@/lib/ddhq'
import { getRaces } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ name: string }>
}

export async function GET(_req: Request, { params }: Props) {
  const { name } = await params
  const townName = decodeURIComponent(name)

  let results: { slug: string; office: string; party: string; district: string | null; level: string; election_type_id: number; candidates: object[]; town_votes: Record<string, number>; town_total: number; called: boolean; called_candidates: number[]; county: string }[]

  if (isConfigured()) {
    const matches = await getTownRaces(townName)
    results = matches.map(({ race, vcu }) => ({
      slug:              race.slug,
      office:            race.office,
      party:             race.party,
      district:          race.district ?? null,
      level:             race.level,
      election_type_id:  race.election_type_id,
      candidates:        race.candidates.map(c => ({
        cand_id:    c.cand_id,
        first_name: c.first_name,
        last_name:  c.last_name,
        suffix:     c.suffix || '',
      })),
      town_votes:        vcu.votes,
      town_total:        Object.values(vcu.votes).reduce((s, v) => s + (v || 0), 0),
      called:            race.called,
      called_candidates: race.topline_results.called_candidates,
      county:            vcu.county,
    }))
  } else {
    // Fall back to mock data
    const races = getRaces()
    results = []
    for (const race of races) {
      for (const county of race.counties) {
        const vcu = county.vcus.find(v => v.vcu === townName)
        if (!vcu) continue
        const townTotal = Object.values(vcu.votes).reduce((s, v) => s + (v || 0), 0)
        results.push({
          slug:              race.slug,
          office:            race.office,
          party:             race.party,
          district:          race.district ?? null,
          level:             race.level,
          election_type_id:  race.election_type_id,
          candidates:        race.candidates.map(c => ({
            cand_id:    c.cand_id,
            first_name: c.first_name,
            last_name:  c.last_name,
            suffix:     c.suffix || '',
          })),
          town_votes:        vcu.votes,
          town_total:        townTotal,
          called:            race.called,
          called_candidates: race.topline_results.called_candidates,
          county:            county.county,
        })
        break
      }
    }
  }

  return NextResponse.json(results, {
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
