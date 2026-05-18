import { NextResponse } from 'next/server'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { getRace } from '@/lib/mock-data'
import { flatVcus, sortCandidates, pctReporting, candidatePct } from '@/lib/types'
import { BELLWETHER_TOWNS } from '@/lib/bellwether-towns'
import type { RaceEvent } from '../events/route'

export const dynamic = 'force-dynamic'

const FILE = join(process.cwd(), 'data/race-events.json')

function readAll(): Record<string, RaceEvent[]> {
  try { return JSON.parse(readFileSync(FILE, 'utf-8')) } catch { return {} }
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const race = getRace(slug)
  if (!race) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Only generate auto-updates for state & federal races
  if (race.level === 'Universal') return NextResponse.json([])

  const all = readAll()
  const existing: RaceEvent[] = all[slug] ?? []
  const usedKeys = new Set(existing.map(e => e.condition_key).filter(Boolean))

  const newEvents: RaceEvent[] = []

  const votes = race.topline_results.votes
  const total = race.topline_results.total_votes

  // ── 0. Race call ─────────────────────────────────────────────────────────────
  for (const candId of race.topline_results.called_candidates) {
    const key = `call-${candId}`
    if (usedKeys.has(key)) continue
    const winner = race.candidates.find(c => c.cand_id === candId)
    if (!winner) continue
    newEvents.push({
      id: randomUUID(),
      created_at: new Date().toISOString(),
      category: 'call',
      condition_key: key,
      text: `✅ ${winner.first_name} ${winner.last_name} wins, per a BDN and Decision Desk HQ call.`,
    })
    usedKeys.add(key)
  }

  if (total === 0) {
    if (newEvents.length > 0) {
      all[slug] = [...(all[slug] ?? []), ...newEvents]
      writeFileSync(FILE, JSON.stringify(all, null, 2))
    }
    return NextResponse.json(newEvents)
  }

  const sorted = sortCandidates(race.candidates, votes)
  const leader = sorted[0]
  const second = sorted[1]
  const leaderVotes = votes[String(leader.cand_id)] ?? 0
  const secondVotes = second ? (votes[String(second.cand_id)] ?? 0) : 0
  const leaderPct = parseFloat(candidatePct(leaderVotes, total))
  const secondPct = second ? parseFloat(candidatePct(secondVotes, total)) : 0
  const margin = (leaderPct - secondPct).toFixed(1)
  const pct = pctReporting(race)

  // ── 1. Milestones ────────────────────────────────────────────────────────────
  const MILESTONES = [10, 20, 30, 40, 50, 60, 70, 80, 90]
  for (const threshold of MILESTONES) {
    if (pct < threshold) break
    const key = `milestone-${threshold}`
    if (usedKeys.has(key)) continue
    const secondLine = second
      ? `, ${margin} points ahead of ${second.first_name} ${second.last_name} (${secondPct.toFixed(1)}%)`
      : ''
    newEvents.push({
      id: randomUUID(),
      created_at: new Date().toISOString(),
      category: 'milestone',
      condition_key: key,
      text: `🏃 ${threshold}% of estimated votes are in. ${leader.first_name} ${leader.last_name} leads with ${leaderPct.toFixed(1)}%${secondLine}.`,
    })
    usedKeys.add(key)
  }

  // ── 2. Big vote drops ────────────────────────────────────────────────────────
  const allVcus = flatVcus(race)
  for (const vcu of allVcus) {
    const townTotal = Object.values(vcu.votes).reduce((s, v) => s + v, 0)
    if (townTotal < 2000) continue
    const key = `bigdrop-${vcu.vcu}`
    if (usedKeys.has(key)) continue
    const townSorted = race.candidates
      .map(c => ({ c, v: vcu.votes[String(c.cand_id)] ?? 0 }))
      .sort((a, b) => b.v - a.v)
    const townLeader = townSorted[0]
    const townSecond = townSorted[1]
    const townLeaderPct = ((townLeader.v / townTotal) * 100).toFixed(1)
    const secondPart = townSecond?.v > 0
      ? `, ahead of ${townSecond.c.last_name} (${((townSecond.v / townTotal) * 100).toFixed(1)}%)`
      : ''
    newEvents.push({
      id: randomUUID(),
      created_at: new Date().toISOString(),
      category: 'ai',
      condition_key: key,
      text: `🧳 ${vcu.vcu} is in — ${townTotal.toLocaleString()} votes cast. ${townLeader.c.first_name} ${townLeader.c.last_name} leads with ${townLeaderPct}%${secondPart}.`,
    })
    usedKeys.add(key)
  }

  // ── 3. Bellwether towns (Governor race only) ─────────────────────────────────
  if (race.office === 'Governor') {
  const partyBellwethers = BELLWETHER_TOWNS[race.party] ?? []
  const bellwetherSet = new Set(partyBellwethers)
  const bellwetherRank = (name: string) => partyBellwethers.indexOf(name) + 1

  for (const vcu of allVcus) {
    if (!bellwetherSet.has(vcu.vcu)) continue
    const townTotal = Object.values(vcu.votes).reduce((s, v) => s + v, 0)
    if (townTotal === 0) continue
    const key = `bellwether-${vcu.vcu}`
    if (usedKeys.has(key)) continue
    const townSorted = race.candidates
      .map(c => ({ c, v: vcu.votes[String(c.cand_id)] ?? 0 }))
      .sort((a, b) => b.v - a.v)
    const townLeader = townSorted[0]
    const townLeaderPct = ((townLeader.v / townTotal) * 100).toFixed(1)
    const rank = bellwetherRank(vcu.vcu)
    newEvents.push({
      id: randomUUID(),
      created_at: new Date().toISOString(),
      category: 'ai',
      condition_key: key,
      text: `🔔 Bellwether: ${vcu.vcu} is in — the ${ordinal(rank)} of 20 towns that most closely mirrored 2018 primary results. ${townLeader.c.first_name} ${townLeader.c.last_name} leads with ${townLeaderPct}% of ${townTotal.toLocaleString()} votes cast.`,
    })
    usedKeys.add(key)
  }
  } // end Governor-only bellwether block

  if (newEvents.length > 0) {
    all[slug] = [...(all[slug] ?? []), ...newEvents]
    writeFileSync(FILE, JSON.stringify(all, null, 2))
  }

  return NextResponse.json(newEvents)
}
