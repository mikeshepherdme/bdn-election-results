// Assign visually distinct colors to candidates within a primary.
// Dem primaries use blue-family shades; Rep primaries use red-family shades.

const DEM_COLORS = ['#1A5FAB', '#2980B9', '#1ABC9C', '#2C3E6B', '#5B8FD4', '#8EC6E6', '#16A085', '#3498DB']
const REP_COLORS = ['#CC2929', '#E67E22', '#C0392B', '#E74C3C', '#D35400', '#A93226', '#F39C12', '#CB4335']

export function candidateColorMap(
  candidates: { cand_id: number }[],
  party: string
): Record<number, string> {
  const palette = party === 'Democratic' ? DEM_COLORS : REP_COLORS
  const map: Record<number, string> = {}
  candidates.forEach((c, i) => {
    map[c.cand_id] = palette[i % palette.length]
  })
  return map
}
