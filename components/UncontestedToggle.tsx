'use client'

import { useState } from 'react'
import Link from 'next/link'
import { candidatePct } from '@/lib/types'
import type { Race, Vcu } from '@/lib/types'

interface RaceVcu {
  race: Race
  vcu: Vcu & { county: string }
}

interface Props {
  rows: RaceVcu[]
  townName: string
}

export default function UncontestedToggle({ rows, townName }: Props) {
  const [open, setOpen] = useState(false)

  if (rows.length === 0) return null

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-[#c8c8c8] rounded-lg text-sm text-[#444444] hover:border-[#767676] transition-colors"
      >
        <span className="font-medium">
          {rows.length} uncontested race{rows.length !== 1 ? 's' : ''} in {townName}
        </span>
        <span className="text-[#767676] text-xs">{open ? '▲ Hide' : '▼ Show'}</span>
      </button>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', marginTop: '1rem' }}>
          {rows.map(({ race, vcu }) => {
            const townTotal = Object.values(vcu.votes).reduce((s, v) => s + v, 0)
            const hasVotes = townTotal > 0
            const c = race.candidates[0]
            const v = c ? (vcu.votes[String(c.cand_id)] ?? 0) : 0
            const pct = hasVotes && c ? parseFloat(candidatePct(v, townTotal)) : 0
            const partyColor = race.party === 'Democratic' ? '#1A5FAB' : '#CC2929'
            const raceTitle = race.district
              ? `${race.office}, District ${race.district}`
              : race.office
            const partyLabel = race.party === 'Democratic' ? 'Dem.' : 'Rep.'

            return (
              <div key={race.race_id} className="bg-white rounded-lg border border-[#c8c8c8] overflow-hidden opacity-80">
                <div className="px-5 py-2.5 border-b border-[#f2f2f2] flex items-center gap-3">
                  <Link
                    href={`/races/${race.slug}`}
                    className="font-headline text-base tracking-tight hover:text-[#2e6b3e] leading-snug"
                  >
                    {raceTitle}
                  </Link>
                  <span
                    className="shrink-0 text-white text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: partyColor }}
                  >
                    {partyLabel}
                  </span>
                  <span className="ml-auto text-xs text-[#767676] border border-[#c8c8c8] rounded px-1.5 py-0.5">
                    Uncontested
                  </span>
                </div>

                {c && (
                  <div className="px-5 py-2.5 flex items-center gap-3">
                    <span className="text-sm font-bold flex-1">
                      {c.first_name} {c.last_name}
                      {c.incumbent && <span className="text-[#767676] font-normal text-xs ml-1">(i)</span>}
                    </span>
                    <span className="text-sm tabular-nums text-[#767676]">
                      {hasVotes ? `${pct.toFixed(1)}%` : '—'}
                    </span>
                    <span className="text-xs tabular-nums text-[#767676] w-12 text-right">
                      {hasVotes ? v.toLocaleString() : '—'}
                    </span>
                  </div>
                )}

                <div className="px-5 py-2 bg-[#f2f2f2] border-t border-[#f2f2f2] flex items-center gap-2 text-xs text-[#767676]">
                  {hasVotes
                    ? <span>{townTotal.toLocaleString()} votes cast</span>
                    : <span>No results yet</span>
                  }
                  <Link href={`/races/${race.slug}`} className="ml-auto text-[#2e6b3e] hover:underline whitespace-nowrap">
                    Race results →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
