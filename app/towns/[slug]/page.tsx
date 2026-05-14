import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTownRaces, getRaces } from '@/lib/mock-data'
import { candidatePct, flatVcus } from '@/lib/types'

export function generateStaticParams() {
  const slugs = new Set<string>()
  for (const race of getRaces()) {
    for (const county of race.counties) {
      for (const vcu of county.vcus) {
        slugs.add(vcu.vcu.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
      }
    }
  }
  return Array.from(slugs).map(slug => ({ slug }))
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function TownPage({ params }: Props) {
  const { slug } = await params
  const results = getTownRaces(slug)

  if (results.length === 0) notFound()

  const townName = results[0].vcu.vcu
  const countyName = results[0].vcu.county

  return (
    <>
      {/* Breadcrumb */}
      <nav className="text-sm text-[#767676] mb-4">
        <Link href="/" className="hover:text-[#2e6b3e]">Results</Link>
        <span className="mx-2">›</span>
        <span>{townName}</span>
      </nav>

      {/* Town header */}
      <div className="mb-6 border-b border-[#c8c8c8] pb-4">
        <h1 className="font-headline text-3xl md:text-4xl tracking-tight">
          {townName}
        </h1>
        <p className="text-[#767676] text-sm mt-1">
          {countyName} County · June 9, 2026 Primary
        </p>
      </div>

      {/* Race results */}
      <div className="space-y-6">
        {results.map(({ race, vcu }) => {
          const townTotal = Object.values(vcu.votes).reduce((s, v) => s + v, 0)

          const sorted = [...race.candidates].sort(
            (a, b) => (vcu.votes[String(b.cand_id)] ?? 0) - (vcu.votes[String(a.cand_id)] ?? 0)
          )
          const leader = sorted[0]
          const winner = race.topline_results.called_candidates.length > 0
            ? race.candidates.find(c => c.cand_id === race.topline_results.called_candidates[0])
            : null

          const partyColor = race.party === 'Democratic' ? '#1A5FAB' : '#CC2929'
          const barColor   = race.party === 'Democratic' ? 'bg-[#1A5FAB]' : 'bg-[#CC2929]'
          const raceTitle  = race.district
            ? `${race.office}, District ${race.district}`
            : race.office
          const partyLabel = race.party === 'Democratic' ? 'Democratic Primary' : 'Republican Primary'

          return (
            <div key={race.race_id} className="bg-white rounded-lg border border-[#c8c8c8] overflow-hidden">

              {/* Race header */}
              <div className="px-5 py-3 border-b border-[#c8c8c8] flex items-center justify-between">
                <div>
                  <Link
                    href={`/races/${race.slug}`}
                    className="font-headline text-lg tracking-tight hover:text-[#2e6b3e]"
                  >
                    {raceTitle}
                  </Link>
                  <span
                    className="ml-2 text-white text-xs px-2 py-0.5 rounded"
                    style={{ backgroundColor: partyColor }}
                  >
                    {partyLabel}
                  </span>
                </div>
                {race.called && winner && (
                  <span className="text-[#166534] text-xs font-bold">✓ Called: {winner.last_name}</span>
                )}
              </div>

              {/* Candidates */}
              <div className="px-5 py-4 space-y-3">
                {sorted.map(c => {
                  const v = vcu.votes[String(c.cand_id)] ?? 0
                  const pct = parseFloat(candidatePct(v, townTotal))
                  const isLeader = c.cand_id === leader.cand_id

                  return (
                    <div key={c.cand_id}>
                      <div className="flex items-baseline justify-between mb-1">
                        <span className={`text-sm ${isLeader ? 'font-bold' : ''}`}>
                          {c.first_name} {c.last_name}
                          {c.incumbent && <span className="text-[#767676] font-normal"> (i)</span>}
                        </span>
                        <div className="flex items-baseline gap-3">
                          <span className={`text-sm font-bold tabular-nums ${isLeader ? '' : 'text-[#767676]'}`}>
                            {pct.toFixed(1)}%
                          </span>
                          <span className="text-xs text-[#767676] tabular-nums w-16 text-right">
                            {v.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-[#c8c8c8] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor} ${isLeader ? 'opacity-100' : 'opacity-60'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer: town vs. statewide leader */}
              <div className="px-5 py-3 bg-[#f2f2f2] border-t border-[#c8c8c8] text-xs text-[#767676]">
                <span className="font-medium text-[#1A1A1A]">{townName} leader: {leader.last_name}</span>
                {' · '}
                {townTotal.toLocaleString()} votes cast in {townName}
                {' · '}
                <Link href={`/races/${race.slug}`} className="text-[#2e6b3e] hover:underline">
                  See statewide →
                </Link>
              </div>

            </div>
          )
        })}
      </div>

      {/* Historical context placeholder */}
      <div className="mt-8 bg-[#f2f2f2] border border-[#c8c8c8] rounded-lg p-5">
        <h2 className="text-xs font-semibold text-[#767676] mb-3">
          2018 Context
        </h2>
        <p className="text-sm text-[#767676]">
          2018 primary results and turnout comparison will appear here once the data
          join to live results is wired up.
        </p>
      </div>
    </>
  )
}
