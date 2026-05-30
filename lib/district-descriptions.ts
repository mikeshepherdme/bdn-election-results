import fs from 'fs'
import path from 'path'

// Slim pre-built lookup: "State Senate|21" -> "Town1, Town2, ..."
const lookup: Record<string, string> = (() => {
  try {
    const filePath = path.join(process.cwd(), 'data', 'district-towns.json')
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, string>
  } catch {
    return {}
  }
})()

export function getDistrictDescription(office: string, district: string | number | null): string | null {
  if (district == null) return null
  const key = `${office}|${district}`
  return lookup[key] ?? null
}
