// DDHQ API v4 types — field names match the API response exactly

export interface Candidate {
  cand_id: number
  first_name: string
  middle_name: string
  last_name: string
  suffix: string
  preferred_name: string
  party_name: string
  party_id: number
  incumbent: boolean
}

export interface VcuPrecincts {
  total: number
  reporting: number
  percent: number | null
}

export interface EstimatedVotes {
  estimated_votes_low: number
  estimated_votes_mid: number
  estimated_votes_high: number
  turnout_low: number
  turnout_mid: number
  turnout_high: number
}

export interface VotingData {
  absentee_ballots_early_votes: number
  election_day_votes: number
}

export interface Vcu {
  id: number
  vcu: string           // town name
  fips: string
  votes: Record<string, number>   // cand_id (string) → vote count
  precincts: VcuPrecincts
  estimated_votes: EstimatedVotes
  voting_data: Record<string, VotingData>
  county?: string       // populated when we flatten counties → vcus
}

export interface County {
  id: number
  county: string
  fips: string
  votes: Record<string, number>
  precincts: VcuPrecincts
  estimated_votes: EstimatedVotes
  voting_data: Record<string, VotingData>
  vcus: Vcu[]
}

export interface ToplineResults {
  votes: Record<string, number>   // cand_id (string) → vote count
  total_votes: number
  precincts: VcuPrecincts
  called_candidates: number[]
  call_times: string[]
  advancing_candidates: number[]
  estimated_votes: EstimatedVotes
  pulse_data: unknown
  voting_data: Record<string, VotingData>
}

export interface MarginSnapshot {
  snapshot_at: string
  total_votes: number
  precincts_reporting: number
  precincts_total: number
  votes: Record<string, number>
}

export interface Race {
  race_id: number
  slug: string                        // generated; not from DDHQ
  test_data: boolean
  year: number
  state: string
  election_type_id: number
  name: string                        // "Primary"
  race_date: string
  office_id: number
  office: string
  district: string | null
  party: string                       // "Democratic" | "Republican" | "Nonpartisan"
  party_id: number
  level: string
  reporting_type: 'precincts' | 'estimated'
  marquee_race: boolean
  expected_winners: number
  uncontested: boolean
  last_updated: string
  poll_close_time_utc: string
  candidates: Candidate[]
  topline_results: ToplineResults
  counties: County[]
  snapshots?: MarginSnapshot[]
  // convenience
  called: boolean
}

export interface TownContextRow {
  municipality: string
  county: string
  dem_registered_2017: number
  rep_registered_2017: number
  dem_2018_ballots: number
  rep_2018_ballots: number
  dem_turnout_2018_pct: number
  rep_turnout_2018_pct: number
  dem_eligible_2026: number
  rep_eligible_2026: number
}

// ── Derived helpers ────────────────────────────────────────────────────────────

export function candidateFullName(c: Candidate): string {
  return `${c.first_name} ${c.last_name}`
}

export function partyColor(party: string): string {
  if (party === 'Democratic') return 'dem'
  if (party === 'Republican') return 'rep'
  return 'other'
}

/**
 * Percentage of results in, 0–100.
 * Uses estimated_votes when reporting_type === 'estimated' (statewide/federal races),
 * falls back to precincts for local races.
 */
export function pctReporting(race: Race): number {
  if (race.reporting_type === 'estimated') {
    const est = race.topline_results.estimated_votes
    if (!est || est.turnout_mid === 0) return 0
    return Math.min(100, Math.round((est.estimated_votes_mid / est.turnout_mid) * 100))
  }
  const p = race.topline_results.precincts
  if (!p || p.total === 0) return 0
  return Math.round((p.reporting / p.total) * 100)
}

/** Human-readable reporting status label for the status bar */
export function reportingLabel(race: Race): string {
  if (race.reporting_type === 'estimated') {
    const est = race.topline_results.estimated_votes
    if (!est || est.estimated_votes_mid === 0) return 'Awaiting results'
    const pct = pctReporting(race)
    return `~${pct}% est. reporting`
  }
  const p = race.topline_results.precincts
  if (!p || p.total === 0) return 'Awaiting results'
  return `${p.reporting.toLocaleString()} of ${p.total.toLocaleString()} precincts`
}

/** Sort candidates by votes desc, except Yes/No referendums which always go Yes → No. */
export function sortCandidates(
  candidates: Candidate[],
  votes: Record<string, number>
): Candidate[] {
  const isReferendum = candidates.some(
    c => c.last_name.toLowerCase() === 'yes' || c.last_name.toLowerCase() === 'no'
  )
  if (isReferendum) {
    return [...candidates].sort((a, b) => {
      const aName = (a.last_name || a.first_name).toLowerCase()
      const bName = (b.last_name || b.first_name).toLowerCase()
      if (aName === 'yes') return -1
      if (bName === 'yes') return 1
      return 0
    })
  }
  return [...candidates].sort(
    (a, b) => (votes[String(b.cand_id)] ?? 0) - (votes[String(a.cand_id)] ?? 0)
  )
}

export function candidatePct(votes: number, total: number): string {
  if (total === 0) return '0.0'
  return ((votes / total) * 100).toFixed(1)
}

export function leadMargin(race: Race): number | null {
  const { votes, total_votes } = race.topline_results
  if (total_votes === 0) return null
  const sorted = Object.values(votes).sort((a, b) => b - a)
  if (sorted.length < 2) return null
  return ((sorted[0] - sorted[1]) / total_votes) * 100
}

/**
 * For legislative, county, DA, and local races: count municipalities (VCUs) total
 * and how many have reported votes. Returns null for statewide/federal races.
 */
export function municipalitiesReporting(race: Race): { reporting: number; total: number } | null {
  if (race.level === 'Federal' || race.level === 'Federal/District' || race.level === 'Statewide') return null
  const vcus = flatVcus(race)
  if (vcus.length === 0) return null
  const reporting = vcus.filter(v =>
    v.precincts.reporting > 0 || Object.values(v.votes).some(n => n > 0)
  ).length
  return { reporting, total: vcus.length }
}

/** True for state/federal races with 3+ candidates — Maine uses RCV for these */
export function isRCV(race: Race): boolean {
  return race.level !== 'Universal' && race.candidates.length >= 3
}

/** Flatten counties → vcus, attaching county name to each VCU */
export function flatVcus(race: Race): (Vcu & { county: string })[] {
  return race.counties.flatMap(county =>
    county.vcus.map(vcu => ({ ...vcu, county: county.county }))
  )
}
