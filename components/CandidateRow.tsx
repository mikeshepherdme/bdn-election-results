import type { Candidate } from '@/lib/types'
import { candidatePct } from '@/lib/types'

interface Props {
  candidate: Candidate
  votes: number
  totalVotes: number
  isCalled: boolean
  isLeading: boolean
}

export default function CandidateRow({ candidate, votes, totalVotes, isCalled, isLeading }: Props) {
  const pct = parseFloat(candidatePct(votes, totalVotes))
  const isWinner = isCalled && isLeading
  const barColor = candidate.party_name === 'Democratic' ? 'bg-[#1A5FAB]' : candidate.party_name === 'Republican' ? 'bg-[#CC2929]' : 'bg-gray-400'

  return (
    <div className={`py-2 ${isWinner ? 'bg-[#F0FDF4] -mx-4 px-4 rounded' : ''}`}>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          {isWinner && (
            <span className="text-[#166534] text-sm font-bold shrink-0">✓</span>
          )}
          <span className={`text-base truncate ${isWinner ? 'text-[#166534] font-bold' : ''}`}>
            {candidate.first_name} {candidate.last_name}
          </span>
          {candidate.incumbent && (
            <span className="text-xs text-[#6B7280] shrink-0">(i)</span>
          )}
        </div>
        <div className="flex items-baseline gap-3 shrink-0 text-right">
          <span className={`text-sm font-bold tabular-nums ${isWinner ? 'text-[#166534]' : ''}`}>
            {pct.toFixed(1)}%
          </span>
          <span className="text-xs text-[#6B7280] tabular-nums w-20 text-right">
            {totalVotes > 0 ? votes.toLocaleString() : '—'}
          </span>
        </div>
      </div>
      <div className="h-1.5 bg-[#E5E5E5] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor} ${isWinner ? 'opacity-100' : 'opacity-80'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
