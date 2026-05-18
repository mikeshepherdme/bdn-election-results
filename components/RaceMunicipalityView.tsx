'use client'

import { useState, useEffect, useRef } from 'react'
import type { Race } from '@/lib/types'
import { flatVcus, sortCandidates } from '@/lib/types'
import { candidateColorMap } from '@/lib/candidate-colors'
import MunicipalityView from './MunicipalityView'

interface Props {
  initialRace: Race
  showAllTowns?: boolean
}

export default function RaceMunicipalityView({ initialRace, showAllTowns }: Props) {
  const [race, setRace] = useState(initialRace)
  const slugRef = useRef(initialRace.slug)

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/race/${slugRef.current}`, { cache: 'no-store' })
        if (res.ok) setRace(await res.json())
      } catch {}
    }
    const id = setInterval(poll, 30_000)
    return () => clearInterval(id)
  }, [])

  const colorMap = candidateColorMap(race.candidates, race.party, race.topline_results.votes)

  const allVcus = flatVcus(race)

  const townRows = [...allVcus].sort((a, b) => {
    const at = Object.values(a.votes).reduce((s, v) => s + v, 0)
    const bt = Object.values(b.votes).reduce((s, v) => s + v, 0)
    return bt - at
  })

  const sortedCands = sortCandidates(race.candidates, race.topline_results.votes)

  return (
    <MunicipalityView
      race={race}
      townRows={townRows}
      sortedCands={sortedCands}
      colorMap={colorMap}
      showAllTowns={showAllTowns}
    />
  )
}
