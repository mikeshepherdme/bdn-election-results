'use client'

import { useEffect, useState, useRef } from 'react'
import type { RCVForecastResult, CandidateForecast } from '@/lib/rcv-sim'

const POLL_MS = 5 * 60 * 1000  // 5 minutes

interface Props {
  raceSlug: string
  partyColor: string
}

export default function RCVForecast({ raceSlug, partyColor }: Props) {
  const [data, setData] = useState<RCVForecastResult | null>(null)
  const [error, setError] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchForecast() {
    try {
      const res = await fetch(`/api/race/${raceSlug}/rcv-forecast`, { cache: 'no-store' })
      if (!res.ok) { setError(true); return }
      const json: RCVForecastResult = await res.json()
      setData(json)
      setError(false)
    } catch {
      setError(true)
    }
  }

  useEffect(() => {
    fetchForecast()
    timerRef.current = setInterval(fetchForecast, POLL_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [raceSlug])

  if (error || !data) return null

  const rcvPct = data.rcvNeededPct
  const showingLive = data.pctReporting > 0
  const updatedAt = new Date(data.computedAt)
  const timeLabel = updatedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: '#c8c8c8', marginTop: '28px' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: '#f2f2f2', borderBottom: '1px solid #c8c8c8' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#d6ead9', color: '#2e6b3e' }}
          >
            RCV Forecast
          </span>
          <span className="text-xs text-[#767676]">
            {showingLive
              ? `Based on ${data.pctReporting}% est. reporting + polling`
              : 'Based on pre-election polling'}
          </span>
        </div>
        <span className="text-xs text-[#767676]">{timeLabel}</span>
      </div>

      <div className="px-4 pt-4 pb-5 space-y-5">
        {/* RCV probability gauge */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-sm font-semibold text-[#222]">
              Chance ranked-choice count is needed
            </span>
            <span className="text-lg font-bold" style={{ color: '#2e6b3e' }}>
              {rcvPct.toFixed(0)}%
            </span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 10, backgroundColor: '#e5e5e5' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(rcvPct, 100)}%`, backgroundColor: '#2e6b3e' }}
            />
          </div>
          <p className="text-xs text-[#767676] mt-1.5">
            {rcvPct >= 85
              ? 'Almost certainly going to a ranked-choice count'
              : rcvPct >= 60
              ? 'Likely going to a ranked-choice count'
              : rcvPct >= 35
              ? 'Could go either way'
              : 'First-choice majority likely, ranked-choice count unlikely'}
          </p>
        </div>

        {/* Win probability bars */}
        <div>
          <p className="text-sm font-semibold text-[#222] mb-3">Win probability</p>
          <WinBars candidates={data.candidates} partyColor={partyColor} />
        </div>

        {/* Attribution */}
        <p className="text-xs text-[#767676] leading-snug">
          Simulation of 10,000 races blending live results with{' '}
          <span className="font-medium">{data.pollSource}</span>.
          Second-choice preferences from poll crosstabs model how RCV ballots
          would redistribute. Updated every 5 minutes.
        </p>
      </div>
    </div>
  )
}

function WinBars({
  candidates,
  partyColor,
}: {
  candidates: CandidateForecast[]
  partyColor: string
}) {
  const maxWin = Math.max(...candidates.map(c => c.winPct), 1)

  return (
    <div className="space-y-2.5">
      {candidates.map(c => (
        <div key={c.candId}>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-sm font-medium text-[#222] truncate pr-2" style={{ maxWidth: '60%' }}>
              {c.name}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {c.actualFirstChoicePct > 0 && (
                <span className="text-xs text-[#767676]">
                  {c.actualFirstChoicePct.toFixed(1)}% actual
                </span>
              )}
              <span className="text-sm font-bold" style={{ color: partyColor, minWidth: '44px', textAlign: 'right' }}>
                {c.winPct.toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: 7, backgroundColor: '#e5e5e5' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(c.winPct / maxWin) * 100}%`,
                backgroundColor: partyColor,
                opacity: 0.85,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
