import Link from 'next/link'
import RaceCard from '@/components/RaceCard'
import TownSearch from '@/components/TownSearch'
import { getRaces } from '@/lib/mock-data'
import type { Race } from '@/lib/types'
import { flatVcus } from '@/lib/types'

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

function lastUpdated(races: Race[]): string {
  const latest = new Date(Math.max(...races.map(r => new Date(r.last_updated).getTime())))
  return latest.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }) + ' ET'
}

function allTownNames(races: Race[]): string[] {
  const names = new Set<string>()
  for (const race of races) {
    for (const vcu of flatVcus(race)) names.add(vcu.vcu)
  }
  return Array.from(names).sort()
}

export default function HomePage() {
  const races = getRaces()
  const anyResults = races.some(r => r.topline_results.total_votes > 0)
  const updated = lastUpdated(races)
  const towns = allTownNames(races)

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

  // ── Section 2: State Legislature ────────────────────────────────────────────
  const legRaces = races.filter(r => r.level === 'State/District')
  const senateContested = legRaces.filter(r => r.office === 'State Senate' && !r.uncontested)
  const houseContested  = legRaces.filter(r => r.office === 'State House'  && !r.uncontested)
  const senateUncontested = legRaces.filter(r => r.office === 'State Senate' && r.uncontested)
  const houseUncontested  = legRaces.filter(r => r.office === 'State House'  && r.uncontested)

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
  const muniContested     = muniRaces.filter(r => !r.uncontested)
  const muniUncontested   = muniRaces.filter(r => r.uncontested)

  const countyGroups = pairRaces(countyContested).sort((a, b) => a.label.localeCompare(b.label))
  const muniGroups   = pairRaces(muniContested).sort((a, b) => a.label.localeCompare(b.label))

  return (
    <>
      {/* Page header */}
      <div className="mb-6 border-b border-[#c8c8c8] pb-4">
        <h1 className="font-headline text-3xl md:text-4xl tracking-tight text-[#1A1A1A]">
          Maine Primary Election Results
        </h1>
        <div className="flex items-center justify-between mt-1 flex-wrap gap-2">
          <p className="text-[#767676] text-sm">Tuesday, June 9, 2026</p>
          {anyResults && (
            <p className="text-xs text-[#767676]">Updated {updated}</p>
          )}
        </div>
      </div>

      {/* Pre-election state */}
      {!anyResults && (
        <div className="bg-[#f2f2f2] border border-[#c8c8c8] rounded-lg p-6 mb-8 text-center">
          <p className="text-lg font-bold text-[#1A1A1A]">Polls close at 8 p.m.</p>
          <p className="text-[#767676] text-sm mt-1">Results will appear here as precincts report.</p>
        </div>
      )}

      <div className="space-y-10">

        {/* ── Statewide & Federal ──────────────────────────────────────────── */}
        <section>
          <span className="section-label">Statewide &amp; Federal</span>
          <div className="space-y-6">
            {topGroups.map(group => (
              <div key={group.label}>
                <h3 className="font-headline text-xl tracking-tight mb-3">{group.label}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  {group.dem && <RaceCard race={group.dem} />}
                  {group.rep && <RaceCard race={group.rep} />}
                  {group.nonpartisan?.map(r => <RaceCard key={r.race_id} race={r} />)}
                  {!group.dem && !group.nonpartisan && (
                    <UncontestedSlot party="Democratic" />
                  )}
                  {!group.rep && !group.nonpartisan && (
                    <UncontestedSlot party="Republican" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── State Legislature ─────────────────────────────────────────────── */}
        {(senatePairs.length > 0 || housePairs.length > 0) && (
          <section>
            <span className="section-label">State Legislature</span>
            <div className="space-y-8">

              {senatePairs.length > 0 && (
                <div>
                  <h3 className="font-headline text-lg tracking-tight mb-3 text-[#444444]">
                    State Senate — Contested Primaries
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {senatePairs.map(pair => (
                      pair.dem
                        ? <RaceCard key={pair.dem.race_id} race={pair.dem} />
                        : pair.rep
                          ? <RaceCard key={pair.rep!.race_id} race={pair.rep!} />
                          : null
                    ))}
                  </div>
                  {senateUncontested.length > 0 && (
                    <UncontestedList races={senateUncontested} label="uncontested Senate districts" />
                  )}
                </div>
              )}

              {housePairs.length > 0 && (
                <div>
                  <h3 className="font-headline text-lg tracking-tight mb-3 text-[#444444]">
                    State House — Contested Primaries
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                    {housePairs.map(pair => (
                      pair.dem
                        ? <RaceCard key={pair.dem.race_id} race={pair.dem} />
                        : pair.rep
                          ? <RaceCard key={pair.rep!.race_id} race={pair.rep!} />
                          : null
                    ))}
                  </div>
                  {houseUncontested.length > 0 && (
                    <UncontestedList races={houseUncontested} label="uncontested House districts" />
                  )}
                </div>
              )}

              {/* Fully uncontested chambers (no contested districts) */}
              {senatePairs.length === 0 && senateUncontested.length > 0 && (
                <UncontestedList races={senateUncontested} label="uncontested State Senate districts" />
              )}
              {housePairs.length === 0 && houseUncontested.length > 0 && (
                <UncontestedList races={houseUncontested} label="uncontested State House districts" />
              )}
            </div>
          </section>
        )}

        {/* ── County & District Attorney ───────────────────────────────────── */}
        {countyRaces.length > 0 && (
          <section>
            <span className="section-label">County &amp; District Attorney</span>
            <div className="space-y-4">
              {countyGroups.map(group => (
                <div key={group.label}>
                  <h3 className="font-headline text-lg tracking-tight mb-3 text-[#444444]">
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

        {/* ── Municipal ────────────────────────────────────────────────────── */}
        {muniRaces.length > 0 && (
          <section>
            <span className="section-label">Municipal</span>
            <div className="space-y-4">
              {muniGroups.map(group => (
                <div key={group.label}>
                  <h3 className="font-headline text-lg tracking-tight mb-3 text-[#444444]">
                    {group.label}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {group.dem && <RaceCard race={group.dem} />}
                    {group.rep && <RaceCard race={group.rep} />}
                    {group.nonpartisan?.map(r => <RaceCard key={r.race_id} race={r} />)}
                  </div>
                </div>
              ))}
              {muniUncontested.length > 0 && (
                <UncontestedList races={muniUncontested} label="uncontested municipal races" />
              )}
            </div>
          </section>
        )}

      </div>

      {/* Town search */}
      <div className="mt-10 bg-[#d6ead9] border border-[#2e6b3e]/20 rounded-lg p-5">
        <span className="section-label" style={{ borderBottom: 'none', marginBottom: 'var(--space-2)' }}>Find your town</span>
        <p className="text-sm text-[#1A1A1A] mb-3">
          See results for every race in a specific Maine municipality.
        </p>
        <TownSearch towns={towns} />
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
