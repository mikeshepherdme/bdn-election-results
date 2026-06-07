// Monte Carlo RCV simulator — pure TS, no external deps.
// Uses the Marsaglia-Tsang method for Gamma sampling → Dirichlet shares.

import type { Race } from '@/lib/types'
import type { RacePollingData } from '@/lib/polling-data'

// ── PRNG / Sampling ───────────────────────────────────────────────────────────

function standardNormal(): number {
  // Box-Muller transform
  const u = 1 - Math.random()
  const v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function sampleGamma(alpha: number): number {
  if (alpha < 1) {
    // Boost: Gamma(alpha) = Gamma(alpha+1) * U^(1/alpha)
    return sampleGamma(alpha + 1) * Math.pow(Math.random(), 1 / alpha)
  }
  const d = alpha - 1 / 3
  const c = 1 / Math.sqrt(9 * d)
  for (;;) {
    let x: number, v: number
    do {
      x = standardNormal()
      v = 1 + c * x
    } while (v <= 0)
    v = v * v * v
    const u = Math.random()
    if (u < 1 - 0.0331 * x * x * x * x) return d * v
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v
  }
}

function sampleDirichlet(alphas: number[]): number[] {
  const gs = alphas.map(a => sampleGamma(Math.max(a, 0.01)))
  const total = gs.reduce((s, v) => s + v, 0)
  return gs.map(g => g / total)
}

// ── RCV simulation ────────────────────────────────────────────────────────────

/**
 * Run one full RCV count on a simulated first-choice vote tally.
 * Returns the winner's candId and whether a second-round count was needed.
 */
function runRCV(
  initialVotes: Record<number, number>,
  candIds: number[],
  secondChoice: Record<number, Record<number, number>>
): { winner: number; rcvNeeded: boolean } {
  const votes = { ...initialVotes }
  const remaining = [...candIds]
  let rcvNeeded = false

  while (remaining.length > 1) {
    const total = remaining.reduce((s, id) => s + (votes[id] ?? 0), 0)

    // Check for first-choice majority
    for (const id of remaining) {
      if ((votes[id] ?? 0) > total * 0.5) {
        return { winner: id, rcvNeeded }
      }
    }

    // No majority → RCV round begins
    rcvNeeded = true

    // Eliminate lowest vote-getter (ties: eliminate the one with lower candId)
    let lowestId = remaining[0]
    for (const id of remaining) {
      if ((votes[id] ?? 0) < (votes[lowestId] ?? 0)) lowestId = id
    }

    const eliminatedVotes = votes[lowestId] ?? 0
    const newRemaining = remaining.filter(id => id !== lowestId)

    // Redistribute to remaining candidates using second-choice weights
    const sc = secondChoice[lowestId] ?? {}
    let weightSum = 0
    for (const id of newRemaining) weightSum += sc[id] ?? 0

    if (weightSum > 0) {
      for (const id of newRemaining) {
        votes[id] = (votes[id] ?? 0) + eliminatedVotes * ((sc[id] ?? 0) / weightSum)
      }
    } else {
      // No second-choice data → distribute evenly (exhaust equally)
      const share = eliminatedVotes / newRemaining.length
      for (const id of newRemaining) votes[id] = (votes[id] ?? 0) + share
    }

    remaining.splice(remaining.indexOf(lowestId), 1)
  }

  return { winner: remaining[0], rcvNeeded }
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface CandidateForecast {
  candId: number
  name: string
  pollFirstChoicePct: number   // poll share (decided voters, normalized)
  actualFirstChoicePct: number // live result, 0 if no votes in yet
  winPct: number               // P(win) across all N simulations
  winPctIfRCV: number          // P(win | RCV count happens), NaN if never triggered
}

export interface RCVForecastResult {
  raceSlug: string
  pollSource: string
  simulationCount: number
  pctReporting: number
  rcvNeededPct: number         // P(no first-choice majority)
  candidates: CandidateForecast[]
  computedAt: string
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function runForecast(
  race: Race,
  polling: RacePollingData,
  N = 10_000
): RCVForecastResult {
  // Use the full polling candidate list — actual votes default to 0 for any
  // not yet present in DDHQ data, which is correct pre-results.
  const pollCands = polling.candidates

  // ── Poll first-choice shares, decided only ─────────────────────────────────
  const decidedPct = 100 - polling.undecidedPct
  const pollDecidedTotal = pollCands.reduce((s, c) => s + c.firstChoicePct, 0)

  // Normalized decided shares (sum = 1)
  const pollShares = pollCands.map(c =>
    pollDecidedTotal > 0 ? c.firstChoicePct / pollDecidedTotal : 1 / pollCands.length
  )

  // Dirichlet concentration ~ number of decided respondents
  const nDecided = polling.sampleSize * (decidedPct / 100)
  const alphas = pollShares.map(s => Math.max(s * nDecided, 0.5))

  // ── Actual vote totals from the live race ─────────────────────────────────
  const actualVotes: Record<number, number> = {}
  for (const c of pollCands) {
    actualVotes[c.candId] = race.topline_results.votes[String(c.candId)] ?? 0
  }
  const actualTotal = pollCands.reduce((s, c) => s + actualVotes[c.candId], 0)

  // ── Estimated total turnout ───────────────────────────────────────────────
  const ddhqTurnout = race.topline_results.estimated_votes?.turnout_mid ?? 0
  const totalEstimated = ddhqTurnout > 0 ? ddhqTurnout : polling.turnoutEstimate
  const remainingVotes = Math.max(0, totalEstimated - actualTotal)

  // ── Percent reporting (approximate) ──────────────────────────────────────
  const pctRpt = totalEstimated > 0
    ? Math.min(100, Math.round((actualTotal / totalEstimated) * 100))
    : 0

  // ── Monte Carlo ───────────────────────────────────────────────────────────
  const candIds = pollCands.map(c => c.candId)
  const winCounts: Record<number, number> = {}
  const winIfRCVCounts: Record<number, number> = {}
  for (const id of candIds) { winCounts[id] = 0; winIfRCVCounts[id] = 0 }
  let rcvNeededCount = 0

  for (let i = 0; i < N; i++) {
    // Sample remaining-vote shares from Dirichlet prior
    const shares = sampleDirichlet(alphas)

    const simVotes: Record<number, number> = {}
    for (let j = 0; j < candIds.length; j++) {
      simVotes[candIds[j]] = actualVotes[candIds[j]] + shares[j] * remainingVotes
    }

    const { winner, rcvNeeded } = runRCV(simVotes, candIds, polling.secondChoice)
    winCounts[winner] = (winCounts[winner] ?? 0) + 1
    if (rcvNeeded) {
      rcvNeededCount++
      winIfRCVCounts[winner] = (winIfRCVCounts[winner] ?? 0) + 1
    }
  }

  // ── Collate results ───────────────────────────────────────────────────────
  const totalActual = actualTotal
  const candidates: CandidateForecast[] = pollCands.map((pc, j) => {
    const liveShare = totalActual > 0
      ? (actualVotes[pc.candId] / totalActual) * 100
      : 0
    return {
      candId: pc.candId,
      name: pc.name,
      pollFirstChoicePct: Math.round(pollShares[j] * 1000) / 10,
      actualFirstChoicePct: Math.round(liveShare * 10) / 10,
      winPct: Math.round((winCounts[pc.candId] / N) * 1000) / 10,
      winPctIfRCV: rcvNeededCount > 0
        ? Math.round((winIfRCVCounts[pc.candId] / rcvNeededCount) * 1000) / 10
        : NaN,
    }
  })

  // Sort by win probability descending
  candidates.sort((a, b) => b.winPct - a.winPct)

  return {
    raceSlug: race.slug,
    pollSource: polling.source,
    simulationCount: N,
    pctReporting: pctRpt,
    rcvNeededPct: Math.round((rcvNeededCount / N) * 1000) / 10,
    candidates,
    computedAt: new Date().toISOString(),
  }
}
