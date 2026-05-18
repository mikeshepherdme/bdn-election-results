'use client'

import { useState, useEffect, useRef } from 'react'
import type { Race } from '@/lib/types'
import { flatVcus, sortCandidates } from '@/lib/types'
import { candidateColorMap } from '@/lib/candidate-colors'
import RaceTable from './RaceTable'
import DistrictMap from './DistrictMap'
import RaceTicker from './RaceTicker'

interface Props {
  initialRace: Race
  partyColor: string
  partyLabel: string
}

const POLL_INTERVAL = 30_000

export default function RaceResults({ initialRace, partyColor, partyLabel }: Props) {
  const [race, setRace] = useState(initialRace)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const slugRef = useRef(initialRace.slug)

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/race/${slugRef.current}`, { cache: 'no-store' })
        if (res.ok) {
          const data: Race = await res.json()
          setRace(data)
          setLastUpdated(new Date())
          // Trigger auto-update generation for state & federal races
          if (data.level !== 'Universal') {
            fetch(`/api/race/${slugRef.current}/auto-updates`, { method: 'POST' }).catch(() => {})
          }
        }
      } catch {}
    }

    // Run once immediately on mount, then on interval
    poll()
    const id = setInterval(poll, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [])

  const winner = race.topline_results.called_candidates.length > 0
    ? race.candidates.find(c => c.cand_id === race.topline_results.called_candidates[0])
    : null

  const colorMap = candidateColorMap(race.candidates, race.party, race.topline_results.votes)

  const allVcus = flatVcus(race)
  const townResults: Record<string, {
    leadingCandId: number
    leadingName: string
    leadingPct: number
    totalVotes: number
    color: string
    allResults: { lastName: string; pct: number; color: string }[]
  }> = {}

  for (const vcu of allVcus) {
    const total = Object.values(vcu.votes).reduce((s, v) => s + v, 0)
    if (total === 0) continue
    const sorted = race.candidates
      .map(c => ({ c, v: vcu.votes[String(c.cand_id)] ?? 0 }))
      .sort((a, b) => b.v - a.v)
    const leader = sorted[0]
    townResults[vcu.vcu] = {
      leadingCandId: leader.c.cand_id,
      leadingName: `${leader.c.first_name} ${leader.c.last_name}`,
      leadingPct: (leader.v / total) * 100,
      totalVotes: total,
      color: colorMap[leader.c.cand_id],
      allResults: sorted.map(({ c, v }) => ({
        lastName: c.last_name,
        pct: (v / total) * 100,
        color: colorMap[c.cand_id],
      })),
    }
  }

  const townRows = [...allVcus].sort((a, b) => {
    const at = Object.values(a.votes).reduce((s, v) => s + v, 0)
    const bt = Object.values(b.votes).reduce((s, v) => s + v, 0)
    return bt - at
  })

  const sortedCands = sortCandidates(race.candidates, race.topline_results.votes)

  return (
    <>
<div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <RaceTable
          race={race}
          label={race.office === 'State House' || race.office === 'State Senate' ? 'District Results' : 'Statewide Results'}
        />

        {(race.office === 'State House' || race.office === 'State Senate') && race.district && (
          <DistrictMap
            districtNum={Number(race.district)}
            districtType={race.office === 'State House' ? 'house' : 'senate'}
            townResults={townResults}
            candidates={sortedCands}
            colorMap={colorMap}
          />
        )}

        {/* Live updates ticker — statewide and federal only */}
        {(race.level === 'Federal' || race.level === 'Federal/District' || race.level === 'Statewide') && (
          <RaceTicker raceSlug={initialRace.slug} />
        )}
      </div>

      {lastUpdated && (
        <p className="text-xs text-[#767676] mt-3">
          Live results · last refreshed {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
        </p>
      )}
    </>
  )
}
