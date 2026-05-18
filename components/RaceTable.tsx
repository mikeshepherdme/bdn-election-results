'use client'

import { useState, useRef } from 'react'
import type { Race } from '@/lib/types'
import { candidatePct, municipalitiesReporting, pctReporting, sortCandidates } from '@/lib/types'
import { candidatePhoto, candidatePhotoPosition } from '@/lib/candidate-photos'
import { candidateColorMap } from '@/lib/candidate-colors'

const ESTIMATED_VOTES_DISCLAIMER =
  "Estimated votes represents Decision Desk HQ's predicted estimate for the amount of votes that have been reported by local clerks. It will change as votes come in."

interface Props {
  race: Race
  vcuVotes?: Record<string, number>
  vcuTotal?: number
  compact?: boolean
  label?: string
  borderless?: boolean
}

// ── Compact badge (used on homepage cards) ───────────────────────────────────
function PctBadge({ pct }: { pct: number }) {
  return (
    <span className="font-bold tabular-nums text-sm" style={{ color: '#1a1a1a' }}>
      {pct.toFixed(1)}%
    </span>
  )
}

// ── Full-size inline bar (used on race pages) ────────────────────────────────
function PctBar({ pct, barColor }: { pct: number; barColor: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
      <span
        className="text-base font-bold tabular-nums shrink-0"
        style={{ minWidth: '3.5rem', textAlign: 'right', color: '#1a1a1a' }}
      >
        {pct.toFixed(1)}%
      </span>
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: '7px', backgroundColor: '#e8e8e8', minWidth: '40px' }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            backgroundColor: barColor,
            borderRadius: '9999px',
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  )
}

export default function RaceTable({ race, vcuVotes, vcuTotal, compact, label, borderless }: Props) {
  const [evTooltipOpen, setEvTooltipOpen] = useState(false)
  const evSpanRef = useRef<HTMLSpanElement>(null)

  const getEvTooltipStyle = (): React.CSSProperties => {
    if (!evSpanRef.current) return { display: 'none' }
    const r = evSpanRef.current.getBoundingClientRect()
    return {
      position: 'fixed',
      bottom: window.innerHeight - r.top + 8,
      right: window.innerWidth - r.right,
      width: '280px',
      backgroundColor: '#1a1a1a',
      color: '#fff',
      padding: '10px 12px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      fontSize: '12px',
      lineHeight: '1.4',
      zIndex: 9999,
    }
  }
  const votes = vcuVotes ?? race.topline_results.votes
  const total = vcuTotal ?? race.topline_results.total_votes
  const calledId = race.topline_results.called_candidates[0] ?? null
  const callTime = (() => {
    if (!race.called || !race.topline_results.call_times[0]) return null
    const d = new Date(race.topline_results.call_times[0])
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
      .toLowerCase().replace(/ am$/, ' a.m.').replace(/ pm$/, ' p.m.')
    const date = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'America/New_York' })
    return `${time}, ${date}`
  })()

  const sorted = sortCandidates(race.candidates, votes)

  const pct = pctReporting(race)
  const hasResults = total > 0
  const muniCount = municipalitiesReporting(race)
  const hasIncumbent = race.candidates.some(c => c.incumbent)
  const partyColor = race.party === 'Democratic' ? '#1A5FAB' : race.party === 'Republican' ? '#CC2929' : '#444444'
  const calledBg   = race.party === 'Democratic' ? '#eff6ff' : race.party === 'Republican' ? '#fff1f2' : '#f5f5f5'
  const hasPhotos = sorted.some(c => candidatePhoto(c.cand_id) !== null)
  const colorMap = candidateColorMap(race.candidates, race.party, race.topline_results.votes)

  // Full race-page view: not compact AND not a per-municipality detail
  const full = !compact && !vcuVotes

  const updated = new Date(race.last_updated)
  const updatedStr = updated.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York',
  }) + ' ET'

  return (
    <div className={`bg-white overflow-hidden ${borderless ? '' : 'border border-[#c8c8c8] rounded-lg'}`}>

      {/* Status bar */}
      <div className="px-4 py-1.5 bg-[#f2f2f2] border-b border-[#c8c8c8] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <img src="/ddhq-logo.png" alt="DDHQ" style={{ height: '14px', width: 'auto', opacity: 0.75 }} />
          <img src="/bdn-logo.webp" alt="BDN" style={{ height: '14px', width: 'auto' }} />
        </div>
        {(hasResults || muniCount !== null) && (
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-[#c8c8c8] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                style={{
                  width: muniCount
                    ? `${(muniCount.reporting / muniCount.total) * 100}%`
                    : `${pct}%`,
                  backgroundColor: partyColor,
                }} />
            </div>
            {muniCount ? (
              <span className="text-xs font-bold text-[#1a1a1a] whitespace-nowrap">
                {muniCount.reporting}/{muniCount.total}{compact ? '' : ' municipalities'} reporting
              </span>
            ) : race.reporting_type === 'estimated' ? (
              <>
                <span
                  ref={evSpanRef}
                  className="text-xs font-bold text-[#1a1a1a] whitespace-nowrap cursor-help"
                  onMouseEnter={() => setEvTooltipOpen(true)}
                  onMouseLeave={() => setEvTooltipOpen(false)}
                  onFocus={() => setEvTooltipOpen(true)}
                  onBlur={() => setEvTooltipOpen(false)}
                  tabIndex={0}
                  role="note"
                  aria-label={`${pct}% estimated votes reported — ${ESTIMATED_VOTES_DISCLAIMER}`}
                >
                  {pct}% estimated votes reported <span aria-hidden="true">📝</span>
                </span>
                {evTooltipOpen && (
                  <div style={getEvTooltipStyle()}>
                    {ESTIMATED_VOTES_DISCLAIMER}
                    <div style={{
                      position: 'absolute', top: '100%', right: '14px',
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderTop: '6px solid #1a1a1a',
                    }} />
                  </div>
                )}
              </>
            ) : (
              <span className="text-xs font-bold text-[#1a1a1a] whitespace-nowrap">
                {pct}% of precincts reporting
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#c8c8c8]">
            {/* Left border gutter */}
            {full && <th style={{ width: '8px', padding: 0 }} />}
            <th className={`text-left px-4 ${full ? 'py-2.5' : 'py-1.5'} text-xs text-[#767676] font-medium`}>
              {label ?? 'Candidates'}
            </th>
            <th className={`${full ? 'py-2.5' : 'py-1.5'} text-xs text-[#767676] font-medium`}
                style={{ paddingLeft: full ? '24px' : '16px', paddingRight: full ? '24px' : '16px', textAlign: 'left' }}>Percentage</th>
            <th className={`${full ? 'py-2.5' : 'py-1.5'} text-xs text-[#767676] font-medium`}
                style={{ textAlign: 'right', paddingLeft: '16px', paddingRight: '24px' }}>Votes</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c, i) => {
            const v = votes[String(c.cand_id)] ?? 0
            const p = total > 0 ? parseFloat(candidatePct(v, total)) : 0
            const isLeader = i === 0 && hasResults
            const isCalled = c.cand_id === calledId && race.called
            const candColor = colorMap[c.cand_id] ?? partyColor
            const photo = candidatePhoto(c.cand_id)
            const photoPosition = candidatePhotoPosition(c.cand_id)

            const rowStyle = { backgroundColor: isCalled ? calledBg : 'white' }
            const textColor = '#1a1a1a'
            const subTextColor = '#767676'

            return (
              <tr
                key={c.cand_id}
                className="border-b border-[#f2f2f2] last:border-0"
                style={rowStyle}
              >
                {full && <td style={{ width: '8px', padding: 0, backgroundColor: candColor }} />}

                {/* Name cell */}
                <td className={`px-4 ${full ? 'py-3' : hasPhotos ? 'py-1.5' : 'py-2'}`}>
                  <div className="flex items-center gap-3">
                    {/* Photo — full view, all candidates */}
                    {full && hasPhotos && (
                      <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-[#e8e8e8]">
                        {photo && (
                          <img
                            src={photo}
                            alt={`${c.first_name} ${c.last_name}`}
                            style={{ width: '40px', height: '40px', objectFit: 'cover', objectPosition: photoPosition }}
                          />
                        )}
                      </div>
                    )}
                    {/* Photo — compact, any row */}
                    {!full && hasPhotos && (
                      <div className="w-9 h-9 rounded overflow-hidden shrink-0 bg-[#e8e8e8]">
                        {photo && (
                          <img
                            src={photo}
                            alt={`${c.first_name} ${c.last_name}`}
                            style={{ width: '36px', height: '36px', objectFit: 'cover', objectPosition: photoPosition }}
                          />
                        )}
                      </div>
                    )}
                    {/* Called checkmark */}
                    {isCalled && !full && (
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: partyColor }}
                      >
                        ✓
                      </span>
                    )}
                    <div>
                      <span
                        className={`${isCalled ? 'font-bold' : ''} ${full ? 'text-base' : compact ? 'text-sm' : 'text-base'}`}
                        style={{ color: textColor }}
                      >
                        {c.first_name} {c.last_name}
                        {isCalled && full && (
                          <span className="text-sm font-bold" style={{ color: partyColor, marginLeft: '6px' }}>✓</span>
                        )}
                        {c.incumbent && (
                          <span className="font-normal text-sm ml-0.5" style={{ color: subTextColor }}> *</span>
                        )}
                        {race.election_type_id === 9 && c.party_name && (
                          <span className="text-xs font-bold ml-1.5" style={{
                            color: c.party_name === 'Democratic' ? '#1A5FAB' : c.party_name === 'Republican' ? '#CC2929' : '#444444',
                          }}>
                            {c.party_name === 'Democratic' ? 'Dem.' : c.party_name === 'Republican' ? 'Rep.' : c.party_name}
                          </span>
                        )}
                      </span>
                      {isCalled && callTime && (
                        <span
                          className="block text-xs font-normal mt-0.5"
                          style={{ color: '#767676' }}
                        >
                          Race called: {callTime}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Pct */}
                <td className={`${full ? 'py-3' : hasPhotos ? 'py-1.5' : 'py-2'} ${full ? '' : 'text-right'}`}
                    style={{ minWidth: full ? '180px' : undefined, paddingLeft: full ? '24px' : '16px', paddingRight: full ? '24px' : '16px' }}>
                  {full ? (
                    hasResults
                      ? <PctBar pct={p} barColor={candColor} />
                      : <span className="text-base font-bold tabular-nums" style={{ color: textColor }}>—</span>
                  ) : (
                    <PctBadge pct={p} />
                  )}
                </td>

                {/* Votes */}
                <td
                  className={`${full ? 'py-3' : hasPhotos ? 'py-1.5' : 'py-2'} text-right tabular-nums font-medium ${full ? 'text-base' : 'text-sm'}`}
                  style={{ color: '#1a1a1a', paddingLeft: '16px', paddingRight: '24px' }}
                >
                  {hasResults ? v.toLocaleString() : '—'}
                </td>

              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-[#c8c8c8] bg-[#f2f2f2]">
            {full && <td style={{ width: '8px', padding: 0 }} />}
            <td className={`px-4 ${full ? 'py-2' : 'py-1.5'} text-[#767676] font-medium text-sm`}>Total</td>
            <td className={`px-4 ${full ? 'py-2' : 'py-1.5'}`} />
            <td className={`${full ? 'py-2' : 'py-1.5'} text-right tabular-nums text-[#767676] font-medium text-sm`}
                style={{ paddingLeft: '16px', paddingRight: '24px' }}>
              {hasResults ? total.toLocaleString() : '—'}
            </td>
          </tr>
        </tfoot>
      </table>

      {hasIncumbent && (
        <div className="px-4 py-1.5 text-xs text-[#767676] border-t border-[#f2f2f2]">
          * Incumbent
        </div>
      )}
    </div>
  )
}
