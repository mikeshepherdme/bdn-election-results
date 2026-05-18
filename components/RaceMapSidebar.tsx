'use client'

import { useState, useEffect, useRef } from 'react'
import type { Race } from '@/lib/types'
import { flatVcus, sortCandidates } from '@/lib/types'
import { candidateColorMap, OTHER_COLOR } from '@/lib/candidate-colors'
import MaineMap from './MaineMap'

interface Props {
  initialRace: Race
}

export default function RaceMapSidebar({ initialRace }: Props) {
  const [race, setRace] = useState(initialRace)
  const slugRef = useRef(initialRace.slug)

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/race/${slugRef.current}`, { cache: 'no-store' })
        if (res.ok) setRace(await res.json())
      } catch {}
    }
    const id = setInterval(poll, 30_000)
    return () => clearInterval(id)
  }, [])

  const colorMap = candidateColorMap(race.candidates, race.party, race.topline_results.votes)

  const townResults: Record<string, {
    leadingCandId: number
    leadingName: string
    leadingPct: number
    totalVotes: number
    color: string
    allResults: { lastName: string; pct: number; color: string }[]
  }> = {}

  for (const vcu of flatVcus(race)) {
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

  const sortedCands = sortCandidates(race.candidates, race.topline_results.votes)

  const namedCands = sortedCands.filter(c => colorMap[c.cand_id] !== OTHER_COLOR)
  const hasOther = sortedCands.some(c => colorMap[c.cand_id] === OTHER_COLOR)

  return (
    <>
      <MaineMap townResults={townResults} />
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {namedCands.map(c => (
          <div key={c.cand_id} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: colorMap[c.cand_id] }} />
            <span className="text-xs text-[#444444]">{c.last_name}</span>
          </div>
        ))}
        {hasOther && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: OTHER_COLOR }} />
            <span className="text-xs text-[#767676]">Other</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: '#e8e8e8' }} />
          <span className="text-xs text-[#767676]">No results</span>
        </div>
      </div>
    </>
  )
}
