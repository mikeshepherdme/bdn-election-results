import Link from 'next/link'
import type { Race } from '@/lib/types'
import { isRCV } from '@/lib/types'
import RaceTable from './RaceTable'

function partyLabelColor(party: string): string {
  if (party === 'Democratic') return '#1A5FAB'
  if (party === 'Republican') return '#CC2929'
  return '#444444'
}

function partyLabel(party: string): string {
  if (party === 'Democratic') return 'Democratic Primary'
  if (party === 'Republican') return 'Republican Primary'
  return 'Nonpartisan'
}

interface Props {
  race: Race
  showDistrict?: boolean
}

export default function RaceCard({ race, showDistrict }: Props) {
  const raceTitle = race.district ? `${race.office}, District ${race.district}` : race.office

  return (
    <div className="flex flex-col">
      {/* Title above card */}
      <Link href={`/races/${race.slug}`} className="group">
        {showDistrict && race.district && (
          <p className="text-base font-bold text-[#1a1a1a] mb-0.5">District {race.district}</p>
        )}
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-black uppercase tracking-widest transition-colors"
              style={{ color: partyLabelColor(race.party) }}>
            {partyLabel(race.party)}
          </h3>
          {isRCV(race) && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                  style={{ backgroundColor: '#d6ead9', color: '#2e6b3e' }}>
              Ranked-Choice Voting
            </span>
          )}
        </div>
      </Link>

      {/* DDHQ-style table */}
      <Link href={`/races/${race.slug}`} className="block hover:shadow-md transition-shadow rounded-lg">
        <RaceTable race={race} compact />
      </Link>

      <Link
        href={`/races/${race.slug}`}
        className="mt-2 text-xs text-[#2e6b3e] hover:underline self-end"
      >
        {race.level !== 'Universal' && race.office !== 'State House' && race.office !== 'State Senate' ? 'Full results, analysis & map →' : 'Full results & map →'}
      </Link>
    </div>
  )
}
