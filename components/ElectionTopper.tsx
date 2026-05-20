'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { TopperRace } from '@/app/api/topper/route'

const PARTY_COLOR: Record<TopperRace['party'], string> = {
  Democratic: '#1A5FAB',
  Republican: '#CC2929',
  Nonpartisan: '#444444',
}

const PARTY_LABEL: Record<TopperRace['party'], string> = {
  Democratic: 'Dem. Primary',
  Republican: 'Rep. Primary',
  Nonpartisan: '',
}

function officeShort(office: string, district: string | null): string {
  if (office === 'Governor') return 'Governor'
  if (office === 'US Senate') return 'U.S. Senate'
  if (office === 'US House') return `U.S. House CD-${district ?? ''}`
  return district ? `${office} D${district}` : office
}

function Card({ r }: { r: TopperRace }) {
  const color = PARTY_COLOR[r.party]
  const partyLabel = PARTY_LABEL[r.party]
  const officeLabel = officeShort(r.office, r.district)
  const pctNum = r.leader ? parseFloat(r.leader.pct) : 0

  return (
    <Link
      href={`/races/${r.slug}`}
      className="block shrink-0 border border-[#c8c8c8] rounded-lg bg-white hover:border-[#2e6b3e] transition-colors no-underline"
      style={{ width: '210px', padding: '10px 12px', borderLeftWidth: '3px', borderLeftColor: color }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wide truncate" style={{ color }}>
          {partyLabel || officeLabel}
        </span>
        {r.called ? (
          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0"
                style={{ color: '#166534', backgroundColor: '#dcfce7' }}>
            Called
          </span>
        ) : (
          <span className="text-[10px] text-[#767676] tabular-nums shrink-0">
            {r.pct_reporting}% in
          </span>
        )}
      </div>
      <div className="text-sm font-semibold text-[#1a1a1a] mt-0.5 truncate font-headline">
        {partyLabel ? officeLabel : 'Race'}
      </div>
      {r.leader ? (
        <>
          <div className="flex items-baseline justify-between gap-2 mt-1.5">
            <span className="text-sm font-bold text-[#1a1a1a] truncate">
              {r.leader.last_name}
              {r.leader.incumbent && <span className="text-[10px] font-normal text-[#767676] ml-1">(i)</span>}
            </span>
            <span className="text-sm font-bold tabular-nums shrink-0" style={{ color }}>
              {r.leader.pct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[#f2f2f2] overflow-hidden mt-1">
            <div className="h-full rounded-full transition-all"
                 style={{ width: `${Math.min(100, pctNum)}%`, backgroundColor: color }} />
          </div>
          {r.runner_up && (
            <div className="flex items-baseline justify-between gap-2 mt-1 text-xs text-[#767676]">
              <span className="truncate">{r.runner_up.last_name}</span>
              <span className="tabular-nums shrink-0">{r.runner_up.pct}%</span>
            </div>
          )}
        </>
      ) : (
        <div className="text-xs text-[#767676] mt-2">Awaiting results</div>
      )}
    </Link>
  )
}

export default function ElectionTopper({ heading = true }: { heading?: boolean }) {
  const [races, setRaces] = useState<TopperRace[]>([])
  const [loaded, setLoaded] = useState(false)

  async function fetchRaces() {
    try {
      const res = await fetch('/api/topper', { cache: 'no-store' })
      if (!res.ok) return
      const data: TopperRace[] = await res.json()
      setRaces(data)
    } finally {
      setLoaded(true)
    }
  }

  useEffect(() => {
    fetchRaces()
    const t = setInterval(fetchRaces, 30_000)
    return () => clearInterval(t)
  }, [])

  if (!loaded) {
    return (
      <div className="border border-[#c8c8c8] rounded-lg bg-white px-4 py-6 text-sm text-[#767676]">
        Loading races…
      </div>
    )
  }

  if (races.length === 0) {
    return (
      <div className="border border-[#c8c8c8] rounded-lg bg-white px-4 py-6 text-sm text-[#767676]">
        No featured races yet.
      </div>
    )
  }

  return (
    <div className="border border-[#c8c8c8] rounded-lg overflow-hidden bg-white">
      {heading && (
        <div className="px-4 py-2.5 bg-[#f2f2f2] border-b border-[#c8c8c8] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#444444] flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#cc2929] animate-pulse" />
            Top races
          </h2>
          <span className="text-xs text-[#767676]">June 9 Maine primary</span>
        </div>
      )}
      <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
        <div className="flex gap-3" style={{ padding: '12px' }}>
          {races.map(r => <Card key={r.slug} r={r} />)}
        </div>
      </div>
    </div>
  )
}
