import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getRace, getRaces } from '@/lib/mock-data'
import { flatVcus } from '@/lib/types'
import { candidateColorMap } from '@/lib/candidate-colors'
import RaceTable from '@/components/RaceTable'
import MunicipalityView from '@/components/MunicipalityView'
import MaineMap from '@/components/MaineMap'

export function generateStaticParams() {
  return getRaces().map(r => ({ slug: r.slug }))
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function RacePage({ params }: Props) {
  const { slug } = await params
  const race = getRace(slug)
  if (!race) notFound()

  const { topline_results, candidates } = race
  const winner = topline_results.called_candidates.length > 0
    ? candidates.find(c => c.cand_id === topline_results.called_candidates[0])
    : null

  const partyColor = race.party === 'Democratic' ? '#1A5FAB' : race.party === 'Republican' ? '#CC2929' : '#444444'
  const partyLabel = race.party === 'Democratic' ? 'Democratic Primary' : race.party === 'Republican' ? 'Republican Primary' : 'Nonpartisan'
  const raceTitle = race.district ? `${race.office}, District ${race.district}` : race.office

  // Color map: cand_id → hex color
  const colorMap = candidateColorMap(candidates, race.party)

  // Build per-town data for the map
  const allVcus = flatVcus(race)
  const townResults: Record<string, {
    leadingCandId: number
    leadingName: string
    leadingPct: number
    totalVotes: number
    color: string
  }> = {}

  for (const vcu of allVcus) {
    const total = Object.values(vcu.votes).reduce((s, v) => s + v, 0)
    if (total === 0) continue
    const sorted = candidates
      .map(c => ({ c, v: vcu.votes[String(c.cand_id)] ?? 0 }))
      .sort((a, b) => b.v - a.v)
    const leader = sorted[0]
    townResults[vcu.vcu] = {
      leadingCandId: leader.c.cand_id,
      leadingName: `${leader.c.first_name} ${leader.c.last_name}`,
      leadingPct: (leader.v / total) * 100,
      totalVotes: total,
      color: colorMap[leader.c.cand_id],
    }
  }

  // Town rows for municipality table
  const townRows = [...allVcus].sort((a, b) => {
    const at = Object.values(a.votes).reduce((s, v) => s + v, 0)
    const bt = Object.values(b.votes).reduce((s, v) => s + v, 0)
    return bt - at
  })

  const sortedCands = [...candidates].sort(
    (a, b) => (topline_results.votes[String(b.cand_id)] ?? 0) - (topline_results.votes[String(a.cand_id)] ?? 0)
  )

  return (
    <>
      {/* Breadcrumb */}
      <nav className="text-sm text-[#767676] mb-4">
        <Link href="/" className="hover:text-[#2e6b3e]">Results</Link>
        <span className="mx-2">›</span>
        <span>{raceTitle}</span>
      </nav>

      {/* Race header */}
      <div className="mb-5">
        <h1 className="font-headline text-3xl md:text-4xl tracking-tight">
          {raceTitle}
        </h1>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <p className="text-sm font-semibold" style={{ color: partyColor }}>{partyLabel}</p>
          {race.called && (
            <p className="text-sm font-semibold text-[#166534]">✓ Race Called</p>
          )}
          <p className="text-sm text-[#767676]">June 9, 2026 Primary</p>
        </div>
      </div>

      {/* Winner banner */}
      {race.called && winner && (
        <div className="border-l-4 border-[#166534] pl-4 mb-5">
          <p className="font-semibold text-[#166534]">
            ✓ {winner.first_name} {winner.last_name} wins the {partyLabel}
          </p>
        </div>
      )}

      <div className="space-y-5">

          {/* Results table + map */}
          <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-6 items-start">

            <RaceTable race={race} label="Statewide Results" />

            {/* Map — no box, floats on page background, top-aligned with table */}
            <div className="flex flex-col">
              <MaineMap townResults={townResults} />
              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {sortedCands.map(c => (
                  <div key={c.cand_id} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: colorMap[c.cand_id] }} />
                    <span className="text-xs text-[#444444]">{c.last_name}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: '#e8e8e8' }} />
                  <span className="text-xs text-[#767676]">No results</span>
                </div>
              </div>
            </div>

          </div>

          {/* Municipality results table — sortable */}
          <MunicipalityView
            race={race}
            townRows={townRows}
            sortedCands={sortedCands}
            colorMap={colorMap}
          />

      </div>
    </>
  )
}
