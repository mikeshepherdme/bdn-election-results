import Link from 'next/link'
import RaceCard from '@/components/RaceCard'
import { getRaces } from '@/lib/mock-data'
import type { Race } from '@/lib/types'

const TOP_LEVELS = new Set(['Statewide', 'Federal', 'Federal/District'])

interface RacePair {
  label: string
  dem?: Race
  rep?: Race
  nonpartisan?: Race[]
}

// Group races by office+district into dem/rep/nonpartisan pairs
function pairRaces(races: Race[]): RacePair[] {
  const groups: Record<string, RacePair> = {}
  for (const race of races) {
    const key = race.district ? `${race.office}||${race.district}` : race.office
    const label = race.district ? `${race.office}, District ${race.district}` : race.office
    if (!groups[key]) groups[key] = { label }
    if (race.party === 'Democratic') groups[key].dem = race
    else if (race.party === 'Republican') groups[key].rep = race
    else {
      if (!groups[key].nonpartisan) groups[key].nonpartisan = []
      groups[key].nonpartisan!.push(race)
    }
  }
  return Object.values(groups)
}

export default function HomePage() {
  const races = getRaces()

  // ── Section 1: Statewide & Federal ──────────────────────────────────────────
  const topRaces = races.filter(r => TOP_LEVELS.has(r.level))
  const topGroups = pairRaces(topRaces).sort((a, b) => {
    const order = ['Governor', 'US Senate', 'US House']
    const ai = order.findIndex(o => a.label.startsWith(o))
    const bi = order.findIndex(o => b.label.startsWith(o))
    const aScore = ai === -1 ? 99 : ai
    const bScore = bi === -1 ? 99 : bi
    if (aScore !== bScore) return aScore - bScore
    return a.label.localeCompare(b.label)
  })

  function raceIsContested(r: Race): boolean {
    return !r.uncontested && r.candidates.length > 1
  }
  // Strip uncontested individual races out of each group; collect them for dropdown
  const topUncontestedRaces: Race[] = []
  const topDisplayGroups = topGroups.map(g => {
    const dem = g.dem && !raceIsContested(g.dem) ? (topUncontestedRaces.push(g.dem), undefined) : g.dem
    const rep = g.rep && !raceIsContested(g.rep) ? (topUncontestedRaces.push(g.rep), undefined) : g.rep
    const nonpartisan = g.nonpartisan?.filter(r => raceIsContested(r) || (topUncontestedRaces.push(r), false))
    return { ...g, dem, rep, nonpartisan }
  }).filter(g => g.dem || g.rep || (g.nonpartisan && g.nonpartisan.length > 0))

  // ── Section 2: State Legislature ────────────────────────────────────────────
  const legRaces = races.filter(r => r.level === 'State/District')
  const specialElections = legRaces.filter(r => r.election_type_id === 9)
  const senateContested = legRaces.filter(r => r.office === 'State Senate' && !r.uncontested && r.election_type_id !== 9)
  const houseContested  = legRaces.filter(r => r.office === 'State House'  && !r.uncontested && r.election_type_id !== 9)
  const senateUncontested = legRaces.filter(r => r.office === 'State Senate' && r.uncontested && r.election_type_id !== 9)
  const houseUncontested  = legRaces.filter(r => r.office === 'State House'  && r.uncontested && r.election_type_id !== 9)

  // Group contested legislature by district, dem/rep side by side
  const senatePairs = pairRaces(senateContested).sort((a, b) => {
    const ad = parseInt(a.label.match(/\d+/)?.[0] ?? '0')
    const bd = parseInt(b.label.match(/\d+/)?.[0] ?? '0')
    return ad - bd
  })
  const housePairs = pairRaces(houseContested).sort((a, b) => {
    const ad = parseInt(a.label.match(/\d+/)?.[0] ?? '0')
    const bd = parseInt(b.label.match(/\d+/)?.[0] ?? '0')
    return ad - bd
  })

  // ── Section 3: County & Local ────────────────────────────────────────────────
  const localRaces = races.filter(r => r.level === 'Universal')

  function isCountyOrDA(race: Race): boolean {
    return race.office.includes('County') ||
           race.office === 'District Attorney' ||
           /Sheriff$/.test(race.office) ||
           /Register of Deeds$/.test(race.office) ||
           /Probate/.test(race.office)
  }

  const countyRaces = localRaces.filter(isCountyOrDA)
  const muniRaces   = localRaces.filter(r => !isCountyOrDA(r))

  const countyContested   = countyRaces.filter(r => !r.uncontested)
  const countyUncontested = countyRaces.filter(r => r.uncontested)

  const countyGroups = pairRaces(countyContested).sort((a, b) => a.label.localeCompare(b.label))

  return (
    <>
      <div className="space-y-10" style={{ paddingTop: '2rem' }}>

        {/* ── Statewide & Federal ──────────────────────────────────────────── */}
        <section id="statewide">
          <span className="section-label">Statewide &amp; Federal</span>
          <div className="space-y-6">
            {(() => {
              // Groups with both sides contested render as their own row
              const paired = topDisplayGroups.filter(g => {
                const cards = [g.dem, g.rep, ...(g.nonpartisan ?? [])].filter(Boolean)
                return cards.length >= 2
              })
              // Groups with only one contested card flow into a shared grid, Dem first
              const solo = topDisplayGroups
                .filter(g => {
                  const cards = [g.dem, g.rep, ...(g.nonpartisan ?? [])].filter(Boolean)
                  return cards.length === 1
                })
                .sort((a, b) => {
                  const aParty = a.dem ? 0 : 1
                  const bParty = b.dem ? 0 : 1
                  if (aParty !== bParty) return aParty - bParty
                  return a.label.localeCompare(b.label)
                })

              return (
                <>
                  {paired.map(group => (
                    <div key={group.label}>
                      <h3 className="font-headline text-xl font-bold tracking-tight mb-3">{group.label}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        {group.dem && <RaceCard race={group.dem} />}
                        {group.rep && <RaceCard race={group.rep} />}
                        {group.nonpartisan?.map(r => <RaceCard key={r.race_id} race={r} />)}
                      </div>
                    </div>
                  ))}
                  {solo.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                      {solo.map(group => {
                        const card = (group.dem ?? group.rep ?? group.nonpartisan?.[0])!
                        return (
                          <div key={group.label}>
                            <h3 className="font-headline text-xl font-bold tracking-tight mb-3">{group.label}</h3>
                            <RaceCard race={card} />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )
            })()}
            {topUncontestedRaces.length > 0 && (
              <UncontestedList races={topUncontestedRaces} label="uncontested statewide & federal races" />
            )}
          </div>
        </section>

        {/* ── State Legislature ─────────────────────────────────────────────── */}
        {(senatePairs.length > 0 || housePairs.length > 0) && (
          <section id="legislature">
            <span className="section-label">State Legislature</span>
            <div className="space-y-8">

              {senatePairs.length > 0 && (
                <div>
                  <h3 className="font-headline text-lg font-bold tracking-tight mb-3 text-[#444444]">
                    State Senate — Contested Primaries
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {senatePairs.flatMap(pair => [
                      pair.dem && <RaceCard key={pair.dem.race_id} race={pair.dem} showDistrict />,
                      pair.rep && <RaceCard key={pair.rep.race_id} race={pair.rep} showDistrict />,
                      ...(pair.nonpartisan ?? []).map(r => <RaceCard key={r.race_id} race={r} showDistrict />),
                    ].filter(Boolean))}
                  </div>
                  {senateUncontested.length > 0 && (
                    <UncontestedList races={senateUncontested} label="uncontested Senate races" />
                  )}
                </div>
              )}

              {housePairs.length > 0 && (
                <div>
                  <h3 className="font-headline text-lg font-bold tracking-tight mb-3 text-[#444444]">
                    State House — Contested Primaries
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                    {housePairs.flatMap(pair => [
                      pair.dem && <RaceCard key={pair.dem.race_id} race={pair.dem} showDistrict />,
                      pair.rep && <RaceCard key={pair.rep.race_id} race={pair.rep} showDistrict />,
                      ...(pair.nonpartisan ?? []).map(r => <RaceCard key={r.race_id} race={r} showDistrict />),
                    ].filter(Boolean))}
                  </div>
                  {houseUncontested.length > 0 && (
                    <UncontestedList races={houseUncontested} label="uncontested House races" />
                  )}
                </div>
              )}

              {/* Fully uncontested chambers (no contested districts) */}
              {senatePairs.length === 0 && senateUncontested.length > 0 && (
                <UncontestedList races={senateUncontested} label="uncontested State Senate races" />
              )}
              {housePairs.length === 0 && houseUncontested.length > 0 && (
                <UncontestedList races={houseUncontested} label="uncontested State House races" />
              )}
            </div>
          </section>
        )}

        {/* ── Special Elections ────────────────────────────────────────────── */}
        {specialElections.length > 0 && (
          <section id="special">
            <span className="section-label">Special Elections</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {specialElections.map(r => (
                <div key={r.race_id}>
                  <h3 className="font-headline text-xl font-bold tracking-tight mb-3">
                    {r.office}{r.district ? `, District ${r.district}` : ''}
                  </h3>
                  <RaceCard race={r} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── County & District Attorney ───────────────────────────────────── */}
        {countyRaces.length > 0 && (
          <section id="county">
            <span className="section-label">County &amp; District Attorney</span>
            <div className="space-y-4">
              {countyGroups.map(group => (
                <div key={group.label}>
                  <h3 className="font-headline text-lg font-bold tracking-tight mb-3 text-[#444444]">
                    {group.label}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {group.dem && <RaceCard race={group.dem} />}
                    {group.rep && <RaceCard race={group.rep} />}
                    {group.nonpartisan?.map(r => <RaceCard key={r.race_id} race={r} />)}
                  </div>
                </div>
              ))}
              {countyUncontested.length > 0 && (
                <UncontestedList races={countyUncontested} label="uncontested county races" />
              )}
            </div>
          </section>
        )}


      </div>

    </>
  )
}

function UncontestedSlot({ party }: { party: string }) {
  const color = party === 'Democratic' ? '#1A5FAB' : '#CC2929'
  return (
    <div className="border border-[#c8c8c8] rounded-lg p-4 text-sm text-[#767676]"
         style={{ borderLeftColor: color, borderLeftWidth: '3px' }}>
      <span className="text-xs font-bold uppercase tracking-widest block mb-1"
            style={{ color }}>
        {party} Primary
      </span>
      No primary — uncontested
    </div>
  )
}

function UncontestedList({ races, label }: { races: Race[]; label: string }) {
  return (
    <details className="mt-3">
      <summary className="text-sm text-[#767676] cursor-pointer hover:text-[#444444] select-none">
        {races.length} {label} — click to expand
      </summary>
      <div className="mt-2 flex flex-wrap gap-2">
        {races.map(r => {
          const cand = r.candidates[0]
          const partyColor = r.party === 'Democratic' ? '#1A5FAB'
            : r.party === 'Republican' ? '#CC2929'
            : '#444444'
          const distLabel = r.district ? ` Dist. ${r.district}` : ''
          return (
            <Link
              key={r.race_id}
              href={`/races/${r.slug}`}
              className="inline-flex items-center gap-1.5 text-xs border border-[#c8c8c8] rounded px-2 py-1 hover:border-[#2e6b3e] hover:text-[#2e6b3e] transition-colors"
            >
              <span className="text-[#767676]">{distLabel || r.office}</span>
              {cand && (
                <span className="font-medium" style={{ color: partyColor }}>
                  {cand.last_name}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </details>
  )
}
