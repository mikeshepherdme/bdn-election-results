import Link from 'next/link'
import type { Race } from '@/lib/types'
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
}

export default function RaceCard({ race }: Props) {
  const raceTitle = race.district ? `${race.office}, District ${race.district}` : race.office

  return (
    <div className="flex flex-col">
      {/* Title above card */}
      <Link href={`/races/${race.slug}`} className="group">
        <h3 className="text-xs font-black uppercase tracking-widest mb-2 transition-colors"
            style={{ color: partyLabelColor(race.party) }}>
          {partyLabel(race.party)}
        </h3>
      </Link>

      {/* DDHQ-style table */}
      <Link href={`/races/${race.slug}`} className="block hover:shadow-md transition-shadow rounded-lg">
        <RaceTable race={race} compact />
      </Link>

      <Link
        href={`/races/${race.slug}`}
        className="mt-2 text-xs text-[#2e6b3e] hover:underline self-end"
      >
        Full results & map →
      </Link>
    </div>
  )
}
