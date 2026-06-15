import overrides from '@/data/race-overrides.json'
import type { Race } from '@/lib/types'

const SUPPRESS_CALLED = new Set<string>(overrides.suppress_called)

export function applyOverrides(race: Race): Race {
  if (!SUPPRESS_CALLED.has(race.slug)) return race
  return {
    ...race,
    called: false,
    topline_results: {
      ...race.topline_results,
      called_candidates: [],
    },
  }
}
