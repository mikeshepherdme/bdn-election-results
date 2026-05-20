import { NextResponse } from 'next/server'
import { getRaces } from '@/lib/mock-data'
import {
  sortCandidates,
  candidatePct,
  pctReporting,
  candidateFullName,
  type Race,
} from '@/lib/types'

export const dynamic = 'force-dynamic'

const TOP_LEVELS = new Set(['Statewide', 'Federal', 'Federal/District'])
const OFFICE_ORDER = ['Governor', 'US Senate', 'US House']

export interface TopperRace {
  slug: string
  office: string
  district: string | null
  party: 'Democratic' | 'Republican' | 'Nonpartisan'
  called: boolean
  pct_reporting: number
  leader: {
    name: string
    last_name: string
    pct: string
    incumbent: boolean
  } | null
  runner_up: {
    last_name: string
    pct: string
  } | null
  total_candidates: number
}

function officeRank(office: string): number {
  const i = OFFICE_ORDER.findIndex(o => office.startsWith(o))
  return i === -1 ? 99 : i
}

function partyRank(party: string): number {
  if (party === 'Democratic') return 0
  if (party === 'Republican') return 1
  return 2
}

function toTopperRace(race: Race): TopperRace {
  const sorted = sortCandidates(race.candidates, race.topline_results.votes)
  const total = race.topline_results.total_votes
  const leadCand = sorted[0]
  const runnerCand = sorted[1]
  const leader = leadCand ? {
    name: candidateFullName(leadCand),
    last_name: leadCand.last_name || leadCand.first_name,
    pct: candidatePct(race.topline_results.votes[String(leadCand.cand_id)] ?? 0, total),
    incumbent: leadCand.incumbent,
  } : null
  const runner_up = runnerCand ? {
    last_name: runnerCand.last_name || runnerCand.first_name,
    pct: candidatePct(race.topline_results.votes[String(runnerCand.cand_id)] ?? 0, total),
  } : null
  return {
    slug: race.slug,
    office: race.office,
    district: race.district,
    party: race.party as TopperRace['party'],
    called: race.called,
    pct_reporting: pctReporting(race),
    leader,
    runner_up,
    total_candidates: race.candidates.length,
  }
}

export async function GET() {
  const races = getRaces()
    .filter(r => TOP_LEVELS.has(r.level))
    .filter(r => !r.uncontested && r.candidates.length > 1)

  races.sort((a, b) => {
    const oa = officeRank(a.office)
    const ob = officeRank(b.office)
    if (oa !== ob) return oa - ob
    const da = parseInt(a.district ?? '0') || 0
    const db = parseInt(b.district ?? '0') || 0
    if (da !== db) return da - db
    return partyRank(a.party) - partyRank(b.party)
  })

  return NextResponse.json(races.map(toTopperRace), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
