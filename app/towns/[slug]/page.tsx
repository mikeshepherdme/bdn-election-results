import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getTownRaces, getRaces } from '@/lib/mock-data'
import { candidatePct, sortCandidates } from '@/lib/types'
import type { Race } from '@/lib/types'
import UncontestedToggle from '@/components/UncontestedToggle'

const OFFICE_PRIORITY: Record<string, number> = {
  'Governor':    0,
  'US Senate':   1,
  'US House':    2,
  'State Senate':3,
  'State House': 4,
}

function officePriority(office: string): number {
  return OFFICE_PRIORITY[office] ?? 99
}

function isContested(race: Race): boolean {
  return !race.uncontested && race.candidates.length > 1
}

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const results = getTownRaces(slug)
  if (results.length === 0) return {}

  const townName = results[0].vcu.vcu
  const countyName = results[0].vcu.county
  const canonical = `https://bangordailynews.com/elections/towns/${slug}`

  const contested = results.filter(r => !r.race.uncontested && r.race.candidates.length > 1)
  const calledRaces = contested.filter(r => r.race.called)
  const racesWithVotes = contested.filter(r => Object.values(r.vcu.votes).some(v => v > 0))

  const title = `${townName}, Maine Primary Election Results 2026`

  let description: string
  if (calledRaces.length > 0) {
    const summaries = calledRaces.map(({ race }) => {
      const winner = race.candidates.find(c => c.cand_id === race.topline_results.called_candidates[0])
      return winner ? `${winner.last_name} wins ${race.office}` : null
    }).filter(Boolean)
    description = `${townName}, Maine primary results: ${summaries.join('; ')}. Full results from the Bangor Daily News.`
  } else if (racesWithVotes.length > 0) {
    const summaries = racesWithVotes.slice(0, 2).map(({ race, vcu }) => {
      const total = Object.values(vcu.votes).reduce((s, v) => s + v, 0)
      const sorted = sortCandidates(race.candidates, vcu.votes)
      const leader = sorted[0]
      return `${leader.last_name} leads ${race.office}`
    })
    description = `Live ${townName}, Maine primary results: ${summaries.join('; ')}. Updated results from the Bangor Daily News.`
  } else {
    description = `${townName}, ${countyName} County, Maine primary election results for June 9, 2026. Live coverage by the Bangor Daily News.`
  }

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { card: 'summary', title, description },
  }
}

export default async function TownPage({ params }: Props) {
  const { slug } = await params
  const results = getTownRaces(slug)

  if (results.length === 0) notFound()

  const townName = results[0].vcu.vcu
  const countyName = results[0].vcu.county

  const byPriority = (a: typeof results[0], b: typeof results[0]) =>
    officePriority(a.race.office) - officePriority(b.race.office)

  const contested   = results.filter(r => isContested(r.race)).sort(byPriority)
  const uncontested = results.filter(r => !isContested(r.race)).sort(byPriority)

  return (
    <>
      {/* Breadcrumb */}
      <nav className="text-sm text-[#767676] mb-4">
        <Link href="/" className="hover:text-[#2e6b3e]">Results</Link>
        <span className="mx-2">›</span>
        <span>{townName}</span>
      </nav>

      {/* Town header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="font-headline text-3xl md:text-4xl tracking-tight">
          {townName}
        </h1>
        <p className="text-[#767676] text-sm mt-1">
          {countyName} County · June 9, 2026 Primary
        </p>
      </div>

      {/* Contested race results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {contested.map(({ race, vcu }) => {
          const townTotal = Object.values(vcu.votes).reduce((s, v) => s + v, 0)
          const hasVotes = townTotal > 0

          const sorted = sortCandidates(race.candidates, vcu.votes)
          const leader = sorted[0]
          const winner = race.topline_results.called_candidates.length > 0
            ? race.candidates.find(c => c.cand_id === race.topline_results.called_candidates[0])
            : null

          const isNonpartisan = race.party !== 'Democratic' && race.party !== 'Republican'
          const partyColor = race.party === 'Democratic' ? '#1A5FAB' : race.party === 'Republican' ? '#CC2929' : '#555555'
          const raceTitle  = race.district
            ? `${race.office}, District ${race.district}`
            : race.office
          const partyLabel = race.party === 'Democratic' ? 'Democratic Primary' : race.party === 'Republican' ? 'Republican Primary' : null

          return (
            <div key={race.race_id} className="bg-white rounded-lg border border-[#c8c8c8] overflow-hidden">

              {/* Race header */}
              <div className="px-5 py-3 border-b border-[#c8c8c8] flex items-center gap-3">
                <Link
                  href={`/races/${race.slug}`}
                  className="font-headline text-lg font-bold tracking-tight hover:text-[#2e6b3e] leading-snug"
                >
                  {raceTitle}
                </Link>
                {partyLabel && (
                  <span
                    className="shrink-0 text-white text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: partyColor }}
                  >
                    {partyLabel}
                  </span>
                )}
              </div>

              {/* Single table: thead + tbody + tfoot so all columns share widths */}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e8e8e8' }}>
                    <th style={{ width: 4, padding: 0 }} />
                    <th style={{ textAlign: 'left', padding: '8px 16px', fontSize: '12px', color: '#767676', fontWeight: 500 }}>Candidate</th>
                    <th style={{ textAlign: 'right', padding: '8px 16px', fontSize: '12px', color: '#767676', fontWeight: 500 }}>Votes</th>
                    <th style={{ textAlign: 'right', padding: '8px 16px', fontSize: '12px', color: '#767676', fontWeight: 500, minWidth: '220px' }}>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((c, i) => {
                    const v = vcu.votes[String(c.cand_id)] ?? 0
                    const pct = hasVotes ? parseFloat(candidatePct(v, townTotal)) : 0
                    const isLeader = i === 0 && hasVotes
                    const isCalled = race.called && winner?.cand_id === c.cand_id
                    const isWinnerRow = isCalled

                    return (
                      <tr key={c.cand_id} style={{
                        borderBottom: '1px solid #f2f2f2',
                        backgroundColor: isWinnerRow ? (isNonpartisan ? '#f5f5f5' : partyColor) : 'white',
                      }}>
                        <td style={{ width: 4, padding: 0, backgroundColor: isWinnerRow ? 'transparent' : partyColor, opacity: isWinnerRow ? 1 : (i === 0 ? 1 : 0.35) }} />
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: '15px', fontWeight: isCalled ? 700 : 400, color: isWinnerRow ? '#fff' : '#1a1a1a' }}>
                            {c.first_name} {c.last_name}
                            {isCalled && <span style={{ marginLeft: '6px' }}>✓</span>}
                          </span>
                          {c.incumbent && (
                            <span style={{ fontSize: '13px', color: isWinnerRow ? 'rgba(255,255,255,0.7)' : '#767676', marginLeft: '4px' }}>*</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '15px', fontVariantNumeric: 'tabular-nums', color: isWinnerRow ? 'rgba(255,255,255,0.9)' : '#1a1a1a' }}>
                          {hasVotes ? v.toLocaleString() : '—'}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', minWidth: '220px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                            <span style={{ fontSize: '15px', fontWeight: 700, minWidth: '52px', textAlign: 'right', color: isWinnerRow ? '#fff' : '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>
                              {hasVotes ? `${pct.toFixed(1)}%` : '—'}
                            </span>
                            <div style={{ width: '120px', height: '8px', backgroundColor: isWinnerRow ? 'rgba(255,255,255,0.25)' : '#e8e8e8', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                              <div style={{ width: `${pct}%`, height: '100%', backgroundColor: isWinnerRow ? 'rgba(255,255,255,0.85)' : partyColor, borderRadius: '4px', transition: 'width 0.4s ease' }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot style={{ borderTop: '1px solid #c8c8c8', backgroundColor: '#f2f2f2' }}>
                  <tr>
                    <td style={{ width: 4, padding: 0 }} />
                    <td style={{ padding: '10px 16px', fontSize: '12px', color: '#767676' }}>
                      {hasVotes
                        ? race.called && winner
                          ? <><span style={{ fontWeight: 600, color: '#166534' }}>✓ {winner.last_name} wins</span>{' · '}
                              <Link href={`/races/${race.slug}`} style={{ color: '#2e6b3e' }}>Race results →</Link></>
                          : <><span style={{ fontWeight: 600, color: '#1a1a1a' }}>{leader.last_name} leads overall</span>{' · '}
                              <Link href={`/races/${race.slug}`} style={{ color: '#2e6b3e' }}>Race results →</Link></>
                        : <span>No results yet · <Link href={`/races/${race.slug}`} style={{ color: '#2e6b3e' }}>Race results →</Link></span>
                      }
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#1a1a1a', fontVariantNumeric: 'tabular-nums' }}>
                      {hasVotes ? townTotal.toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '10px 16px' }} />
                  </tr>
                </tfoot>
              </table>

            </div>
          )
        })}
      </div>

      {/* Uncontested races — collapsible */}
      <div style={{ marginTop: '2.5rem' }}>
        <UncontestedToggle rows={uncontested} townName={townName} />
      </div>

    </>
  )
}
