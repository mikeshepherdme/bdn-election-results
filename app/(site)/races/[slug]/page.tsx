import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getRace, getRaces } from '@/lib/mock-data'
import { isRCV, sortCandidates, candidatePct, pctReporting, flatVcus } from '@/lib/types'
import type { Race } from '@/lib/types'
import RaceResults from '@/components/RaceResults'
import RaceMapSidebar from '@/components/RaceMapSidebar'
import RaceMunicipalityView from '@/components/RaceMunicipalityView'
import RCVBadge from '@/components/RCVBadge'

function districtGeo(race: Race): string | null {
  if (!race.district) return null
  const vcus = flatVcus(race)
  if (vcus.length === 0) return null
  if (vcus.length === 1) return vcus[0].vcu
  const counties = race.counties.map(c => c.county).filter(Boolean)
  if (counties.length === 1) return `${counties[0]} County`
  if (counties.length === 2) return `${counties[0]} and ${counties[1]} counties`
  const top = race.counties
    .sort((a, b) => b.vcus.length - a.vcus.length)
    .slice(0, 2)
    .map(c => c.county)
  return `${top[0]}, ${top[1]} area`
}

export function generateStaticParams() {
  return getRaces().map(r => ({ slug: r.slug }))
}

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const race = getRace(slug)
  if (!race) return {}

  const raceTitle = race.district ? `${race.office}, District ${race.district}` : race.office
  const partyLabel = race.party === 'Democratic' ? 'Democratic' : race.party === 'Republican' ? 'Republican' : 'Nonpartisan'
  const votes = race.topline_results.votes
  const total = race.topline_results.total_votes
  const canonical = `https://bangordailynews.com/elections/races/${slug}`

  // Title: called > live > default — NYT pattern: "Maine [Race] [Party] Primary Results 2026"
  let title: string
  let description: string

  if (race.called && race.topline_results.called_candidates.length > 0) {
    const winner = race.candidates.find(c => c.cand_id === race.topline_results.called_candidates[0])
    title = winner
      ? `Maine ${raceTitle} Results: ${winner.first_name} ${winner.last_name} Wins ${partyLabel} Primary 2026`
      : `Maine ${raceTitle} ${partyLabel} Primary Election Results 2026`
    description = winner
      ? `${winner.first_name} ${winner.last_name} has won the Maine ${partyLabel} primary for ${raceTitle}. Full results and analysis from the Bangor Daily News.`
      : `Results for the Maine ${raceTitle} ${partyLabel} primary election on June 9, 2026.`
  } else if (total > 0) {
    const sorted = sortCandidates(race.candidates, votes)
    const leader = sorted[0]
    title = `Maine ${raceTitle} ${partyLabel} Primary Election Results 2026`
    description = `Live results for the Maine ${partyLabel} primary for ${raceTitle}. ${leader.first_name} ${leader.last_name} is leading. Updated results from the Bangor Daily News.`
  } else {
    title = `Maine ${raceTitle} ${partyLabel} Primary Election Results 2026`
    description = `Live results for the Maine ${partyLabel} primary election for ${raceTitle} on June 9, 2026. Coverage by the Bangor Daily News.`
  }

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

const LEGISLATIVE = new Set(['State House', 'State Senate'])

export default async function RacePage({ params }: Props) {
  const { slug } = await params
  const race = getRace(slug)
  if (!race) notFound()

  const isSpecial = race.election_type_id === 9
  const partyColor = race.party === 'Democratic' ? '#1A5FAB' : race.party === 'Republican' ? '#CC2929' : '#444444'
  const partyLabel = isSpecial ? 'Special Election' : race.party === 'Democratic' ? 'Democratic Primary' : race.party === 'Republican' ? 'Republican Primary' : 'Nonpartisan'
  const raceTitle = race.district ? `${race.office}, District ${race.district}` : race.office
  const isLegislative = LEGISLATIVE.has(race.office)
  const isCountyOrDA = race.office.includes('County') ||
    race.office === 'District Attorney' ||
    /Sheriff$/.test(race.office) ||
    /Register of Deeds$/.test(race.office) ||
    /Probate/.test(race.office)
  const showAllTowns = isLegislative || isCountyOrDA

  const header = (
    <>
      <div className="mb-4">
        <Link href="/" className="text-sm font-medium text-[#2e6b3e] hover:underline">
          ← Return to statewide results
        </Link>
      </div>
      <div className="mb-6">
        <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">
          {raceTitle}
        </h1>
        {districtGeo(race) && (
          <p className="text-sm text-[#767676] mt-0.5">{districtGeo(race)}</p>
        )}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <p className="text-sm font-semibold" style={{ color: partyColor }}>{partyLabel}</p>
          {isRCV(race) && <RCVBadge />}
        </div>
      </div>
    </>
  )

  if (isLegislative) {
    return (
      <>
        {header}
        <RaceResults initialRace={race} partyColor={partyColor} partyLabel={partyLabel} />
        <div style={{ marginTop: '48px' }}>
          <RaceMunicipalityView initialRace={race} showAllTowns={showAllTowns} />
        </div>
      </>
    )
  }

  return (
    <>
      <div className="race-page-grid">
        <div className="race-page-main">
          {header}
          <RaceResults initialRace={race} partyColor={partyColor} partyLabel={partyLabel} />
        </div>
        <div className="race-page-sidebar">
          <RaceMapSidebar initialRace={race} />
        </div>
      </div>
      <div style={{ marginTop: '48px' }}>
        <RaceMunicipalityView initialRace={race} showAllTowns={showAllTowns} />
      </div>
    </>
  )
}
