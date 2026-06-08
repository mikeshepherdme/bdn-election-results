// Maine RCV simulation — proper ballot-profile model using full preference chains.
//
// Maine RCV rules: voters rank candidates in order of preference. In each round,
// the last-place candidate is eliminated. Their voters' ballots advance to the next
// ranked candidate still in the race. Rounds continue until two candidates remain;
// whichever has more votes (a majority of active ballots) wins. A ballot becomes
// "exhausted" if all ranked candidates have been eliminated.
//
// Simulation approach:
//   For each first-choice group, pre-build fractional "ballot templates" that capture
//   the full conditional preference chain (1st → 2nd → 3rd → ...) drawn from the
//   SurveyUSA cross-tab data. In each Monte Carlo trial, template sizes are scaled by
//   Dirichlet-sampled first-choice shares. The RCV count then advances each template's
//   "active" pointer to the next non-eliminated candidate — no redistribution matrices.

import type { Race } from '@/lib/types'
import type { RacePollingData } from '@/lib/polling-data'

// ── PRNG ──────────────────────────────────────────────────────────────────────

function standardNormal(): number {
  const u = 1 - Math.random()
  const v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function sampleGamma(alpha: number): number {
  if (alpha < 1) return sampleGamma(alpha + 1) * Math.pow(Math.random(), 1 / alpha)
  const d = alpha - 1 / 3
  const c = 1 / Math.sqrt(9 * d)
  for (;;) {
    let x: number, v: number
    do { x = standardNormal(); v = 1 + c * x } while (v <= 0)
    v = v * v * v
    const u = Math.random()
    if (u < 1 - 0.0331 * x * x * x * x) return d * v
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v
  }
}

function sampleDirichlet(alphas: number[]): number[] {
  const gs = alphas.map(a => sampleGamma(Math.max(a, 0.01)))
  const sum = gs.reduce((s, v) => s + v, 0)
  return gs.map(g => g / sum)
}

// ── Ballot templates ──────────────────────────────────────────────────────────

// A ballot template: ordered preference list + relative weight (fraction of the
// first-choice group that holds this specific sequence). Weights within a
// first-choice group sum to ≤1 (remainder = exhausted at 1st choice).
interface BallotTemplate {
  prefs: number[]   // candidate IDs in ranked order (length 1..5+)
  weight: number    // fraction of first-choice-group votes carrying this ranking
  firstIdx: number  // index into pollCands array (for Dirichlet scaling)
}

function sumObj(obj: Record<number, number>): number {
  return Object.values(obj).reduce((s, v) => s + v, 0)
}

// Filter a preference map to exclude candidates already in the voter's chain,
// then return the remaining entries as [candId, weight] pairs.
function available(
  prefs: Record<number, number>,
  alreadyRanked: number[]
): Array<[number, number]> {
  const seen = new Set(alreadyRanked)
  return Object.entries(prefs)
    .map(([k, v]) => [Number(k), v] as [number, number])
    .filter(([id, w]) => !seen.has(id) && w > 0)
}

// Pre-election forecast uncertainty factors:
//   ALPHA_SCALE: reduces the Dirichlet concentration below the poll's nominal n.
//   A poll of n=484 gives sampling σ≈2%; real forecasts need σ≈4-5% to reflect
//   turnout model error, house effects, and last-minute movement.  0.3 × 430 ≈ 130
//   effective obs, σ≈4%, which is in line with Maine primary forecast practice.
//   (Becomes less relevant as actual votes accumulate — Dirichlet only samples
//   the unreported fraction.)
//
//   PREF_SMOOTH: blends each conditional preference distribution 15% toward
//   uniform.  Cross-tab sub-samples can be as small as 30-50 respondents per
//   cell, so raw percentages carry substantial noise; smoothing prevents the
//   preference chain from being over-confident.
const ALPHA_SCALE = 0.3
const PREF_SMOOTH = 0.15

// Recursively expand a partial ballot into templates, going as deep as the
// polling data allows. Each call appends fully-resolved templates to `out`.
function expand(
  partial: number[],        // candidates ranked so far
  weightSoFar: number,      // cumulative probability reaching this node
  firstIdx: number,
  polling: RacePollingData,
  out: BallotTemplate[]
): void {
  const depth = partial.length  // 1=just 1st, 2=have 2nd, 3=have 3rd, ...
  const lastCand = partial[depth - 1]

  // Look up the next-choice distribution conditioned on the most-recent choice
  let nextMap: Record<number, number> | undefined
  if (depth === 1) nextMap = polling.secondChoice[lastCand]
  else if (depth === 2) nextMap = polling.thirdChoice?.[lastCand]
  else if (depth === 3) nextMap = polling.fourthChoice?.[lastCand]
  else if (depth === 4) nextMap = polling.fifthChoice?.[lastCand]
  // depth 5+: no data → ballot ends here

  if (!nextMap) {
    // No deeper data — treat this ballot as stopping here
    out.push({ prefs: [...partial], weight: weightSoFar, firstIdx })
    return
  }

  // Apply preference smoothing: blend raw cross-tab values toward a uniform
  // distribution over ALL candidates.  Cross-tab sub-samples are small (30-50
  // respondents per cell), so raw values carry substantial noise.  15% blend
  // prevents any single candidate from dominating preference chains.
  const nCands = polling.candidates.length
  const uniformVal = 100 / nCands  // uniform share if spread evenly across candidates
  const smoothedMap: Record<number, number> = {}
  for (const c of polling.candidates) {
    const raw = nextMap[c.candId] ?? 0
    smoothedMap[c.candId] = (1 - PREF_SMOOTH) * raw + PREF_SMOOTH * uniformVal
  }

  // fullTotal = sum of ALL smoothed values, including self-referential diagonals.
  // Exhaust fraction = 1 − fullTotal/100, matching "undecided + don't rank" rows.
  const fullTotal = sumObj(smoothedMap)

  if (fullTotal === 0) {
    out.push({ prefs: [...partial], weight: weightSoFar, firstIdx })
    return
  }

  const continueFrac = fullTotal / 100

  // Exhausted at this depth (genuine undecided/don't-rank voters)
  const exhaustWeight = weightSoFar * (1 - continueFrac)
  if (exhaustWeight > 1e-6) {
    out.push({ prefs: [...partial], weight: exhaustWeight, firstIdx })
  }

  // Among continuing voters, distribute only to available (not already-ranked) candidates.
  // Voters whose indicated next choice is already in their ballot (diagonal or repeat)
  // are proportionally redistributed across the remaining available candidates.
  const entries = available(smoothedMap, partial)
  const availTotal = entries.reduce((s, [, w]) => s + w, 0)

  if (availTotal === 0) {
    // All continuing choices are blocked → treat as exhausted
    if (continueFrac * weightSoFar > 1e-6) {
      out.push({ prefs: [...partial], weight: continueFrac * weightSoFar, firstIdx })
    }
    return
  }

  for (const [nextCand, nextWeight] of entries) {
    expand(
      [...partial, nextCand],
      weightSoFar * continueFrac * (nextWeight / availTotal),
      firstIdx,
      polling,
      out
    )
  }
}

// Build all ballot templates for a race, using normalized poll first-choice shares
// and the full conditional preference chain.
function buildTemplates(
  pollCands: RacePollingData['candidates'],
  polling: RacePollingData
): BallotTemplate[] {
  const out: BallotTemplate[] = []
  for (let i = 0; i < pollCands.length; i++) {
    expand([pollCands[i].candId], 1.0, i, polling, out)
  }
  return out
}

// ── RCV count ─────────────────────────────────────────────────────────────────

// Run one full RCV count given a set of ballot groups with concrete vote sizes.
// Returns the winner and whether a ranked-choice redistribution was needed.
function runRCV(
  templates: BallotTemplate[],
  sizes: Float64Array,      // sizes[i] = votes for templates[i] in this simulation
  allCands: number[]
): { winner: number; rcvNeeded: boolean } {
  const remaining = new Set(allCands)
  let rcvNeeded = false

  while (remaining.size > 1) {
    // Tally: each template's votes go to the first candidate in its prefs still in the race
    const tally = new Map<number, number>()
    for (const id of remaining) tally.set(id, 0)

    for (let i = 0; i < templates.length; i++) {
      const sz = sizes[i]
      if (sz <= 0) continue
      for (const cand of templates[i].prefs) {
        if (remaining.has(cand)) {
          tally.set(cand, (tally.get(cand) ?? 0) + sz)
          break
          // ballot exhausted if no ranked candidate is in `remaining`
        }
      }
    }

    // Active total (non-exhausted ballots)
    let active = 0
    for (const v of tally.values()) active += v

    // Check for majority winner
    for (const [cand, votes] of tally) {
      if (votes > active * 0.5) return { winner: cand, rcvNeeded }
    }

    // No majority → eliminate last place, advance to RCV round
    rcvNeeded = true
    let lowestId = -1, lowestVotes = Infinity
    for (const [cand, votes] of tally) {
      if (votes < lowestVotes || (votes === lowestVotes && cand < lowestId)) {
        lowestId = cand; lowestVotes = votes
      }
    }
    remaining.delete(lowestId)
  }

  return { winner: [...remaining][0], rcvNeeded: true }
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface CandidateForecast {
  candId: number
  name: string
  pollFirstChoicePct: number
  actualFirstChoicePct: number
  winPct: number
  winPctIfRCV: number
}

export interface RCVForecastResult {
  raceSlug: string
  pollSource: string
  simulationCount: number
  pctReporting: number
  rcvNeededPct: number
  candidates: CandidateForecast[]
  computedAt: string
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function runForecast(
  race: Race,
  polling: RacePollingData,
  N = 10_000
): RCVForecastResult {
  const pollCands = polling.candidates
  const candIds = pollCands.map(c => c.candId)

  // ── Poll first-choice shares (decided only, normalized) ───────────────────
  const decidedPct = 100 - polling.undecidedPct
  const decidedTotal = pollCands.reduce((s, c) => s + c.firstChoicePct, 0)
  const pollShares = pollCands.map(c =>
    decidedTotal > 0 ? c.firstChoicePct / decidedTotal : 1 / pollCands.length
  )
  const nDecided = polling.sampleSize * (decidedPct / 100) * ALPHA_SCALE
  const alphas = pollShares.map(s => Math.max(s * nDecided, 0.5))

  // ── Live vote data ────────────────────────────────────────────────────────
  const actualVotes: Record<number, number> = {}
  for (const c of pollCands) {
    actualVotes[c.candId] = race.topline_results.votes[String(c.candId)] ?? 0
  }
  const actualTotal = pollCands.reduce((s, c) => s + actualVotes[c.candId], 0)

  const ddhqTurnout = race.topline_results.estimated_votes?.turnout_mid ?? 0
  const totalEstimated = ddhqTurnout > 0 ? ddhqTurnout : polling.turnoutEstimate
  const remainingVotes = Math.max(0, totalEstimated - actualTotal)

  const pctRpt = totalEstimated > 0
    ? Math.min(100, Math.round((actualTotal / totalEstimated) * 100))
    : 0

  // ── Pre-build ballot templates (fixed across simulations) ─────────────────
  const templates = buildTemplates(pollCands, polling)
  const nTemplates = templates.length
  const sizes = new Float64Array(nTemplates)

  // ── Monte Carlo ───────────────────────────────────────────────────────────
  const winCounts: Record<number, number> = {}
  const winIfRCVCounts: Record<number, number> = {}
  for (const id of candIds) { winCounts[id] = 0; winIfRCVCounts[id] = 0 }
  let rcvCount = 0

  for (let sim = 0; sim < N; sim++) {
    // Sample remaining-vote first-choice shares from Dirichlet prior
    const shares = sampleDirichlet(alphas)

    // Scale templates: actual votes use poll preference chain too (we know their
    // first choice but not their full ballot — poll is the best available model)
    for (let i = 0; i < nTemplates; i++) {
      const t = templates[i]
      const totalForGroup = actualVotes[pollCands[t.firstIdx].candId]
                          + shares[t.firstIdx] * remainingVotes
      sizes[i] = totalForGroup * t.weight
    }

    const { winner, rcvNeeded } = runRCV(templates, sizes, candIds)
    winCounts[winner] = (winCounts[winner] ?? 0) + 1
    if (rcvNeeded) {
      rcvCount++
      winIfRCVCounts[winner] = (winIfRCVCounts[winner] ?? 0) + 1
    }
  }

  // ── Results ───────────────────────────────────────────────────────────────
  const candidates: CandidateForecast[] = pollCands.map((pc, j) => ({
    candId: pc.candId,
    name: pc.name,
    pollFirstChoicePct: Math.round(pollShares[j] * 1000) / 10,
    actualFirstChoicePct: actualTotal > 0
      ? Math.round((actualVotes[pc.candId] / actualTotal) * 1000) / 10
      : 0,
    winPct: Math.round((winCounts[pc.candId] / N) * 1000) / 10,
    winPctIfRCV: rcvCount > 0
      ? Math.round((winIfRCVCounts[pc.candId] / rcvCount) * 1000) / 10
      : NaN,
  }))
  candidates.sort((a, b) => b.winPct - a.winPct)

  return {
    raceSlug: race.slug,
    pollSource: polling.source,
    simulationCount: N,
    pctReporting: pctRpt,
    rcvNeededPct: Math.round((rcvCount / N) * 1000) / 10,
    candidates,
    computedAt: new Date().toISOString(),
  }
}
