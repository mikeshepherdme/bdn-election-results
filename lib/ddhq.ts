import type { Race, Vcu } from '@/lib/types'
import { transform } from '@/lib/mock-data'

const BASE         = process.env.DDHQ_API_BASE!
const CLIENT_ID    = process.env.DDHQ_CLIENT_ID!
const CLIENT_SECRET= process.env.DDHQ_CLIENT_SECRET!
const RACE_DATE    = process.env.DDHQ_RACE_DATE ?? '2026-06-09'
const STATE        = 'ME'
const PAGE_LIMIT   = 100

// ── OAuth token cache ─────────────────────────────────────────────────────────
let cachedToken   = ''
let tokenExpiresAt = 0

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) return cachedToken
  const res = await fetch(`${BASE}/api/v4/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type:    'client_credentials',
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`DDHQ token fetch failed: ${res.status}`)
  const data = await res.json()
  if (!data.access_token) throw new Error(`DDHQ token missing: ${JSON.stringify(data)}`)
  cachedToken    = data.access_token as string
  tokenExpiresAt = Date.now() + (data.expires_in as number) * 1000
  return cachedToken
}

// ── Race cache ────────────────────────────────────────────────────────────────
let raceCache:  Race[] | null = null
let raceCacheAt = 0
const RACE_TTL  = 120_000   // 2 minutes

export async function getAllRaces(): Promise<Race[]> {
  if (raceCache && Date.now() - raceCacheAt < RACE_TTL) return raceCache

  const token = await getToken()
  const baseUrl = `${BASE}/api/v4/races?state=${STATE}&race_date=${RACE_DATE}&limit=${PAGE_LIMIT}`

  // Fetch page 1 to learn total_pages
  const first = await fetchPage(baseUrl, 1, token)
  const totalPages: number = first.total_pages ?? 1
  const races: Race[] = first.data.map(transform)

  // Fetch remaining pages in parallel
  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) => fetchPage(baseUrl, i + 2, token))
    )
    for (const page of rest) {
      for (const raw of page.data) races.push(transform(raw))
    }
  }

  raceCache   = races
  raceCacheAt = Date.now()
  return races
}

async function fetchPage(baseUrl: string, page: number, token: string) {
  const res = await fetch(`${baseUrl}&page=${page}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`DDHQ races page ${page} failed: ${res.status}`)
  return res.json() as Promise<{ total_pages: number; data: any[] }>
}

// ── Public helpers ────────────────────────────────────────────────────────────
export async function getRaceBySlug(slug: string): Promise<Race | undefined> {
  const races = await getAllRaces()
  return races.find(r => r.slug === slug)
}

export async function getTownRaces(
  townName: string
): Promise<{ race: Race; vcu: Vcu & { county: string } }[]> {
  const races = await getAllRaces()
  const results: { race: Race; vcu: Vcu & { county: string } }[] = []
  for (const race of races) {
    for (const county of race.counties) {
      const vcu = county.vcus.find(v => v.vcu === townName)
      if (vcu) {
        results.push({ race, vcu: { ...vcu, county: county.county } })
        break
      }
    }
  }
  return results
}

export function isConfigured(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET && BASE)
}
