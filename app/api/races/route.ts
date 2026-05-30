import { NextResponse } from 'next/server'
import { getAllRaces, isConfigured } from '@/lib/ddhq'
import { getRaces } from '@/lib/mock-data'
import { getDistrictDescription, getDistrictTownCount } from '@/lib/district-descriptions'

export const dynamic = 'force-dynamic'

function isCountyOffice(office: string): boolean {
  return (
    office.includes('County') ||
    /Sheriff$/.test(office) ||
    /Register of Deeds$/.test(office) ||
    /Probate/.test(office) ||
    /Treasurer$/.test(office)
  )
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const office = searchParams.get('office')
  const party  = searchParams.get('party')
  const type   = searchParams.get('type')

  const allRaces = isConfigured() ? await getAllRaces() : getRaces()

  let filtered = allRaces

  if (type === 'da') {
    filtered = allRaces.filter(r => r.office === 'District Attorney')
  } else if (type === 'county') {
    filtered = allRaces.filter(r => isCountyOffice(r.office))
  } else {
    if (office) filtered = filtered.filter(r => r.office === office)
    if (party)  filtered = filtered.filter(r => r.party  === party)
  }

  const results = filtered.map(race => ({
    slug:              race.slug,
    office:            race.office,
    party:             race.party,
    district:          race.district ?? null,
    level:             race.level,
    election_type_id:  race.election_type_id,
    uncontested:       race.uncontested,
    called:            race.called,
    called_candidates: race.topline_results.called_candidates,
    candidates:        race.candidates.map(c => ({
      cand_id:    c.cand_id,
      first_name: c.first_name,
      last_name:  c.last_name,
      suffix:     c.suffix || '',
    })),
    votes:       race.topline_results.votes,
    total_votes: race.topline_results.total_votes,
    precincts:   race.topline_results.precincts,
    description: getDistrictDescription(race.office, race.district ?? null),
    town_count:  getDistrictTownCount(race.office, race.district ?? null),
  }))

  return NextResponse.json(results, {
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
