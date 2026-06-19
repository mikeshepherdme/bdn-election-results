import overrides from '@/data/race-overrides.json'
import type { Race } from '@/lib/types'

const SUPPRESS_CALLED = new Set<string>(overrides.suppress_called)
const RCV_RACES       = new Set<string>(overrides.rcv)

export function applyOverrides(race: Race): Race {
  const suppressCall = SUPPRESS_CALLED.has(race.slug)
  const isRcv        = RCV_RACES.has(race.slug)
  if (!suppressCall && !isRcv) return race
  return {
    ...race,
    called: suppressCall ? false : race.called,
    rcv: isRcv,
    topline_results: suppressCall
      ? { ...race.topline_results, called_candidates: [] }
      : race.topline_results,
  }
}
