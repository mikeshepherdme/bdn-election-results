'use client'

import dynamic from 'next/dynamic'

const TownMap = dynamic(() => import('./TownMap'), { ssr: false })

interface TownResult {
  leadingCandId: number
  leadingName: string
  leadingPct: number
  totalVotes: number
  color: string
}

interface Props {
  townResults: Record<string, TownResult>
  height?: string
}

export default function TownMapWrapper(props: Props) {
  return <TownMap {...props} />
}
