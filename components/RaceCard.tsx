import Link from 'next/link'
import type { Race } from '@/lib/types'
import { isRCV } from '@/lib/types'
import RaceTable from './RaceTable'

function partyLabelColor(race: Race): string {
  if (race.election_type_id === 9) return '#444444'
  if (race.party === 'Democratic') return '#1A5FAB'
  if (race.party === 'Republican') return '#CC2929'
  return '#444444'
}

function partyLabel(race: Race): string {
  if (race.election_type_id === 9) return 'Special Election'
  if (race.party === 'Democratic') return 'Democratic Primary'
  if (race.party === 'Republican') return 'Republican Primary'
  return 'Nonpartisan'
}

interface Props {
  race: Race
  showDistrict?: boolean
}

export default function RaceCard({ race, showDistrict }: Props) {
  const ctaLabel =
    race.level !== 'Universal' && race.office !== 'State House' && race.office !== 'State Senate'
      ? 'Full results, analysis & map →'
      : 'Full results & map →'

  return (
    <div className="flex flex-col">
      {/* Title above card */}
      <Link href={`/races/${race.slug}`} className="group">
        {showDistrict && race.district && (
          <p className="text-base font-bold text-[#1a1a1a] mb-0.5">District {race.district}</p>
        )}
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-black uppercase tracking-widest transition-colors"
              style={{ color: partyLabelColor(race) }}>
            {partyLabel(race)}
          </h3>
          {isRCV(race) && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                  style={{ backgroundColor: '#d6ead9', color: '#2e6b3e' }}>
              Ranked-Choice Voting
            </span>
          )}
        </div>
      </Link>

      {/* Table — not a link; candidate names are plain text, not pseudo-links */}
      <div className="border border-[#c8c8c8] rounded-t-lg overflow-hidden border-b-0">
        <RaceTable race={race} compact borderless />
      </div>

      {/* CTA — the single, explicit entry point to the race page */}
      <Link
        href={`/races/${race.slug}`}
        className="block text-center text-sm font-bold text-white rounded-b-lg transition-colors bg-[#2e6b3e] hover:bg-[#1e4d2c]"
        style={{ padding: '10px 16px' }}
      >
        {ctaLabel}
      </Link>
    </div>
  )
}
