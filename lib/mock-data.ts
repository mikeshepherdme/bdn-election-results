import type { Race, Candidate, County, Vcu } from '@/lib/types'
import rawJson from '@/data/ddhq_races.json'

function kebab(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function makeSlug(office: string, party: string, district: string | null, special = false): string {
  const parts = [kebab(office)]
  if (district) parts.push('district', kebab(String(district)))
  special ? parts.push('special', 'election') : parts.push(kebab(party), 'primary')
  return parts.join('-')
}

export function transform(r: any): Race {
  const topline = r.topline_results ?? {}
  const isSpecial = r.election_type_id === 9
  return {
    race_id: r.race_id,
    slug: makeSlug(r.office ?? '', r.party ?? 'nonpartisan', r.district ?? null, isSpecial),
    test_data: r.test_data ?? false,
    year: r.year ?? 2026,
    state: r.state ?? 'ME',
    election_type_id: r.election_type_id ?? 2,
    name: r.name ?? 'Primary',
    race_date: r.race_date ?? '2026-06-09',
    office_id: r.office_id ?? 0,
    office: r.office ?? '',
    district: r.district ?? null,
    party: r.party ?? 'Nonpartisan',
    party_id: r.party_id ?? 0,
    level: r.level ?? 'Universal',
    reporting_type: r.reporting_type ?? 'precincts',
    marquee_race: r.marquee_race === true || r.marquee_race === 'true',
    expected_winners: r.expected_winners ?? 1,
    uncontested: r.uncontested ?? false,
    last_updated: r.last_updated ?? new Date().toISOString(),
    poll_close_time_utc: r.poll_close_time_utc ?? '2026-06-10T00:00:00Z',
    called: (topline.called_candidates?.length ?? 0) > 0,
    candidates: (r.candidates ?? []).map((c: any): Candidate => ({
      cand_id: c.cand_id,
      first_name: c.first_name ?? '',
      middle_name: c.middle_name ?? '',
      last_name: c.last_name ?? '',
      suffix: c.suffix ?? '',
      preferred_name: c.preferred_name ?? '',
      party_name: c.party_name ?? '',
      party_id: c.party_id ?? 0,
      incumbent: c.incumbent ?? false,
    })),
    topline_results: {
      votes: topline.votes ?? {},
      total_votes: topline.total_votes ?? 0,
      precincts: topline.precincts ?? { total: 0, reporting: 0, percent: null },
      called_candidates: topline.called_candidates ?? [],
      call_times: topline.call_times ?? [],
      advancing_candidates: topline.advancing_candidates ?? [],
      pulse_data: null,
      estimated_votes: topline.estimated_votes ?? {
        estimated_votes_low: 0, estimated_votes_mid: 0, estimated_votes_high: 0,
        turnout_low: 0, turnout_mid: 0, turnout_high: 0,
      },
      voting_data: topline.voting_data ?? {},
    },
    counties: (r.counties ?? []).map((c: any): County => ({
      id: c.id,
      county: c.county ?? '',
      fips: c.fips ?? '',
      votes: c.votes ?? {},
      precincts: c.precincts ?? { total: 0, reporting: 0, percent: null },
      estimated_votes: c.estimated_votes ?? {
        estimated_votes_low: 0, estimated_votes_mid: 0, estimated_votes_high: 0,
        turnout_low: 0, turnout_mid: 0, turnout_high: 0,
      },
      voting_data: c.voting_data ?? {},
      vcus: (c.vcus ?? []).map((v: any): Vcu => ({
        id: v.id,
        vcu: v.vcu ?? '',
        fips: v.fips ?? '',
        votes: v.votes ?? {},
        precincts: v.precincts ?? { total: 0, reporting: 0, percent: null },
        estimated_votes: v.estimated_votes ?? {
          estimated_votes_low: 0, estimated_votes_mid: 0, estimated_votes_high: 0,
          turnout_low: 0, turnout_mid: 0, turnout_high: 0,
        },
        voting_data: v.voting_data ?? {},
      })),
    })),
    snapshots: [],
  }
}

function loadRaces(): Race[] {
  return (rawJson as any[]).map(transform)
}

export function getRaces(): Race[] {
  return loadRaces()
}

export function getRace(slugOrId: string): Race | undefined {
  return loadRaces().find(r => r.slug === slugOrId || String(r.race_id) === slugOrId)
}

export function getTownRaces(townSlug: string): { race: Race; vcu: Vcu & { county: string } }[] {
  const results: { race: Race; vcu: Vcu & { county: string } }[] = []
  for (const race of loadRaces()) {
    for (const c of race.counties) {
      for (const v of c.vcus) {
        const s = v.vcu.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        if (s === townSlug) {
          results.push({ race, vcu: { ...v, county: c.county } })
        }
      }
    }
  }
  return results
}
