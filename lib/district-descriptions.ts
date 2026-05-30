import fs from 'fs'
import path from 'path'

type DistrictEntry = { count: number; label: string }

const lookup: Record<string, DistrictEntry> = (() => {
  try {
    const filePath = path.join(process.cwd(), 'data', 'district-short-desc.json')
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, DistrictEntry>
  } catch {
    return {}
  }
})()

function key(office: string, district: string | number | null): string {
  return `${office}|${district}`
}

export function getDistrictDescription(office: string, district: string | number | null): string | null {
  if (district == null) return null
  return lookup[key(office, district)]?.label ?? null
}

export function getDistrictTownCount(office: string, district: string | number | null): number | null {
  if (district == null) return null
  return lookup[key(office, district)]?.count ?? null
}
