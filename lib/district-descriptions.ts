import fs from 'fs'
import path from 'path'

type TownEntry = {
  county: string
  races: Array<{
    office: string
    district: number | null
    party: string
    [key: string]: unknown
  }>
}

type ElectionsByTown = {
  towns: Record<string, TownEntry>
}

// Build office|district -> "Town1, Town2, ..." lookup at module load time
const lookup: Record<string, string> = (() => {
  const filePath = path.join(process.cwd(), 'data', 'elections-by-town.json')
  const raw: ElectionsByTown = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

  const map: Record<string, Set<string>> = {}
  for (const [town, info] of Object.entries(raw.towns)) {
    const seen = new Set<string>()
    for (const race of info.races) {
      if ((race.office === 'State Senate' || race.office === 'State House') && race.district != null) {
        const key = `${race.office}|${race.district}`
        if (!seen.has(key)) {
          seen.add(key)
          if (!map[key]) map[key] = new Set()
          map[key].add(town)
        }
      }
    }
  }

  const result: Record<string, string> = {}
  for (const [key, towns] of Object.entries(map)) {
    result[key] = [...towns].sort().join(', ')
  }
  return result
})()

export function getDistrictDescription(office: string, district: string | number | null): string | null {
  if (district == null) return null
  const key = `${office}|${district}`
  return lookup[key] ?? null
}
