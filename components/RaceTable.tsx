'use client'

import type { Race, Candidate } from '@/lib/types'
import { candidatePct, pctReporting, reportingLabel } from '@/lib/types'

interface Props {
  race: Race
  vcuVotes?: Record<string, number>
  vcuTotal?: number
  compact?: boolean
  label?: string
  borderless?: boolean
}

function PctBadge({ pct, isLeader, party }: { pct: number; isLeader: boolean; party: string }) {
  const bg = isLeader
    ? party === 'Democratic' ? '#1A5FAB' : party === 'Republican' ? '#CC2929' : '#444444'
    : '#c8c8c8'
  const text = isLeader ? '#fff' : '#767676'
  const width = Math.max(pct, 2)
  return (
    <div
      className="inline-flex items-center justify-center font-bold tabular-nums rounded-sm text-sm"
      style={{
        backgroundColor: bg,
        color: text,
        minWidth: '4.5rem',
        padding: '2px 8px',
      }}
    >
      {pct.toFixed(1)}%
    </div>
  )
}

export default function RaceTable({ race, vcuVotes, vcuTotal, compact, label, borderless }: Props) {
  const votes = vcuVotes ?? race.topline_results.votes
  const total = vcuTotal ?? race.topline_results.total_votes
  const calledId = race.topline_results.called_candidates[0] ?? null

  const sorted = [...race.candidates].sort(
    (a, b) => (votes[String(b.cand_id)] ?? 0) - (votes[String(a.cand_id)] ?? 0)
  )

  const pct = pctReporting(race)
  const hasResults = total > 0
  const hasIncumbent = race.candidates.some(c => c.incumbent)
  const partyColor = race.party === 'Democratic' ? '#1A5FAB' : race.party === 'Republican' ? '#CC2929' : '#444444'

  const updated = new Date(race.last_updated)
  const updatedStr = updated.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York',
  }) + ' ET'

  return (
    <div className={`bg-white overflow-hidden ${borderless ? '' : 'border border-[#c8c8c8] rounded-lg'}`}>
      {/* Status bar */}
      <div className="px-4 py-2 bg-[#f2f2f2] border-b border-[#c8c8c8] flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <img src="/ddhq-logo.png" alt="DDHQ" style={{ height: '14px', width: 'auto', opacity: 0.75 }} />
          <img src="/bdn-logo.webp" alt="BDN" style={{ height: '14px', width: 'auto' }} />
          <span className="text-xs text-[#767676]">Last Updated: {updatedStr}</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-[#767676]">{reportingLabel(race)}</span>
          {hasResults && (
            <div className="w-24 h-1.5 bg-[#c8c8c8] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: partyColor }}
              />
            </div>
          )}
          {hasResults && (
            <span className="text-xs font-bold text-[#1a1a1a]">{pct}%</span>
          )}
        </div>
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#c8c8c8]">
            <th className="text-left px-4 py-2 text-xs text-[#767676] font-medium">
              {label ?? 'Candidates'}
            </th>
            <th className="text-center px-3 py-2 text-xs text-[#767676] font-medium">Party</th>
            <th className="text-right px-3 py-2 text-xs text-[#767676] font-medium">Votes</th>
            <th className="text-right px-4 py-2 text-xs text-[#767676] font-medium">Pct.</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c, i) => {
            const v = votes[String(c.cand_id)] ?? 0
            const p = total > 0 ? parseFloat(candidatePct(v, total)) : 0
            const isLeader = i === 0 && hasResults
            const isCalled = c.cand_id === calledId && race.called
            const rowBg = isCalled ? '#FEF2F2' : isLeader && hasResults ? '#f2f2f2' : 'white'
            const borderColor = race.party === 'Democratic' ? '#1A5FAB' : '#CC2929'

            return (
              <tr
                key={c.cand_id}
                className="border-b border-[#f2f2f2] last:border-0"
                style={{
                  backgroundColor: rowBg,
                  borderLeft: isCalled ? `3px solid ${borderColor}` : '3px solid transparent',
                }}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {isCalled && (
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: borderColor }}
                      >
                        ✓
                      </span>
                    )}
                    <span className={`${isCalled || isLeader ? 'font-bold' : ''} ${compact ? 'text-sm' : 'text-base'}`}>
                      {c.first_name} {c.last_name}
                      {c.incumbent && <span className="font-normal text-[#767676]"> *</span>}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <PartyBadge party={c.party_name} />
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                  {hasResults ? v.toLocaleString() : '—'}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <PctBadge pct={p} isLeader={isLeader || isCalled} party={race.party} />
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-[#c8c8c8] bg-[#f2f2f2]">
            <td className="px-4 py-2 text-[#767676] font-medium text-sm" colSpan={2}>Total</td>
            <td className="px-3 py-2 text-right tabular-nums text-[#767676] font-medium text-sm">
              {hasResults ? total.toLocaleString() : '—'}
            </td>
            <td className="px-4 py-2" />
          </tr>
        </tfoot>
      </table>

      {hasIncumbent && (
        <div className="px-4 py-2 text-xs text-[#767676] border-t border-[#f2f2f2]">
          * Incumbent
        </div>
      )}
    </div>
  )
}

function PartyBadge({ party }: { party: string }) {
  const label = party === 'Democratic' ? 'DEM' : party === 'Republican' ? 'REP' : party === 'Nonpartisan' ? 'NP' : 'OTH'
  return (
    <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: '#e8e8e8', color: '#444444' }}>
      {label}
    </span>
  )
}
