const SUSPENDED = new Set([
  950883, // Janet Mills — US Senate (D)
  950902, // James Libby — Governor (R)
])

export function isSuspended(candId: number): boolean {
  return SUSPENDED.has(candId)
}
