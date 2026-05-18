// Assign visually distinct colors to candidates within a primary.
// Dem primaries use blue-family shades; Rep primaries use red-family shades.
// In races with 5+ candidates, candidates at ≤10% of total votes share a gray "Other" color.

const DEM_COLORS = ['#1A5FAB', '#2980B9', '#1ABC9C', '#2C3E6B', '#5B8FD4', '#8EC6E6', '#16A085', '#3498DB']
const REP_COLORS = ['#CC2929', '#E67E22', '#C0392B', '#E74C3C', '#D35400', '#A93226', '#F39C12', '#CB4335']
export const OTHER_COLOR = '#aaaaaa'

export function candidateColorMap(
  candidates: { cand_id: number }[],
  party: string,
  votes?: Record<string, number>
): Record<number, string> {
  const palette = party === 'Democratic' ? DEM_COLORS : REP_COLORS
  const map: Record<number, string> = {}

  if (candidates.length >= 5 && votes) {
    const total = Object.values(votes).reduce((s, v) => s + v, 0)
    if (total > 0) {
      // Assign palette colors in vote-rank order to candidates above 10%; rest get OTHER_COLOR
      const sorted = [...candidates].sort(
        (a, b) => (votes[String(b.cand_id)] ?? 0) - (votes[String(a.cand_id)] ?? 0)
      )
      let colorIdx = 0
      for (const c of sorted) {
        const pct = (votes[String(c.cand_id)] ?? 0) / total * 100
        map[c.cand_id] = pct > 10 ? palette[colorIdx++] : OTHER_COLOR
      }
      return map
    }
  }

  candidates.forEach((c, i) => {
    map[c.cand_id] = palette[i % palette.length]
  })
  return map
}
