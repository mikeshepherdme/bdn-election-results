'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Race, Vcu } from '@/lib/types'
import { candidatePct } from '@/lib/types'

interface Props {
  race: Race
  townRows: (Vcu & { county: string })[]
  sortedCands: Race['candidates']
  colorMap: Record<number, string>
  showAllTowns?: boolean
}

type SortKey = 'name' | 'total' | number

const PAGE_SIZE = 20

export default function MunicipalityView({ race, townRows, sortedCands, colorMap, showAllTowns }: Props) {
  const hasAnyResults = race.topline_results.total_votes > 0
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>(() =>
    showAllTowns && !race.topline_results.total_votes ? 'name' : 'total'
  )
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>(() =>
    showAllTowns && !race.topline_results.total_votes ? 'asc' : 'desc'
  )
  const [page, setPage] = useState(1)

  // Reset to page 1 whenever search or sort changes
  useEffect(() => { setPage(1) }, [search, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return <span className="ml-1 text-[#c8c8c8]">↕</span>
    return <span className="ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>
  }

  const withVotes = townRows.filter(vcu =>
    Object.values(vcu.votes).reduce((s, v) => s + v, 0) > 0
  )

  const displayRows = showAllTowns ? townRows : withVotes

  const filtered = displayRows
    .filter(vcu =>
      !search ||
      vcu.vcu.toLowerCase().includes(search.toLowerCase()) ||
      vcu.county.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortKey === 'name') {
        return sortDir === 'asc'
          ? a.vcu.localeCompare(b.vcu)
          : b.vcu.localeCompare(a.vcu)
      }
      const aTotal = Object.values(a.votes).reduce((s, v) => s + v, 0)
      const bTotal = Object.values(b.votes).reduce((s, v) => s + v, 0)
      // Towns with no votes always sort to bottom regardless of direction
      if (aTotal === 0 && bTotal === 0) return a.vcu.localeCompare(b.vcu)
      if (aTotal === 0) return 1
      if (bTotal === 0) return -1
      let aVal: number, bVal: number
      if (sortKey === 'total') {
        aVal = aTotal
        bVal = bTotal
      } else {
        aVal = (a.votes[String(sortKey)] ?? 0) / aTotal
        bVal = (b.votes[String(sortKey)] ?? 0) / bTotal
      }
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal
    })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const reportingCount = withVotes.length

  return (
    <div className="bg-white border border-[#c8c8c8] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[#c8c8c8] flex items-center gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-[#444444]">Town-by-Town Results</h2>
        <div className="ml-auto">
          <input
            type="text"
            placeholder="Filter towns…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-[#c8c8c8] rounded px-3 py-1 text-sm focus:outline-none focus:border-[#2e6b3e] w-44"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#f2f2f2]">
            <tr className="border-b border-[#c8c8c8]">
              <th
                className="text-left px-4 py-2 text-xs text-[#767676] font-medium cursor-pointer hover:text-[#444444] select-none whitespace-nowrap"
                onClick={() => handleSort('name')}
              >
                Town {sortIcon('name')}
              </th>
              {sortedCands.map(c => (
                <th
                  key={c.cand_id}
                  className="text-right px-3 py-2 text-xs font-medium cursor-pointer hover:text-[#444444] select-none whitespace-nowrap"
                  style={{ color: sortKey === c.cand_id ? colorMap[c.cand_id] : '#767676' }}
                  onClick={() => handleSort(c.cand_id)}
                >
                  <span className="flex items-center justify-end gap-1">
                    <span className="w-2 h-2 rounded-sm inline-block shrink-0"
                      style={{ backgroundColor: colorMap[c.cand_id] }} />
                    {c.last_name}
                    {sortIcon(c.cand_id)}
                  </span>
                </th>
              ))}
              <th
                className="text-right px-4 py-2 text-xs text-[#767676] font-medium cursor-pointer hover:text-[#444444] select-none"
                onClick={() => handleSort('total')}
              >
                Total {sortIcon('total')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f2f2f2]">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={sortedCands.length + 2} className="px-4 py-6 text-center text-sm text-[#767676]">
                  {search ? `No towns match "${search}"` : 'No results yet'}
                </td>
              </tr>
            ) : (
              paginated.map(vcu => {
                const total = Object.values(vcu.votes).reduce((s, v) => s + v, 0)
                const maxVotes = Math.max(...sortedCands.map(c => vcu.votes[String(c.cand_id)] ?? 0))
                const townSlug = vcu.vcu.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

                return (
                  <tr key={vcu.id} className="hover:bg-[#f2f2f2] transition-colors">
                    <td className="px-4 py-2">
                      <Link href={`/towns/${townSlug}`} className="text-[#2e6b3e] hover:underline font-medium">
                        {vcu.vcu}
                      </Link>
                    </td>
                    {sortedCands.map(c => {
                      const v = vcu.votes[String(c.cand_id)] ?? 0
                      const p = total > 0 ? parseFloat(candidatePct(v, total)) : 0
                      const isTop = v === maxVotes && v > 0
                      const isSortCol = sortKey === c.cand_id

                      return (
                        <td
                          key={c.cand_id}
                          className="text-right px-3 py-2 tabular-nums"
                          style={isSortCol ? { backgroundColor: '#f2f2f2' } : {}}
                        >
                          {total === 0 ? (
                            <span className="text-[#c8c8c8]">—</span>
                          ) : (
                            <span
                              className={isTop ? 'font-bold' : ''}
                              style={isTop ? { color: colorMap[c.cand_id] } : { color: '#767676' }}
                            >
                              {p.toFixed(1)}%
                            </span>
                          )}
                        </td>
                      )
                    })}
                    <td className="text-right px-4 py-2 text-[#767676] tabular-nums text-xs">
                      {total > 0 ? total.toLocaleString() : <span className="text-[#c8c8c8]">—</span>}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: count + pagination */}
      <div className="px-4 py-2 border-t border-[#f2f2f2] flex items-center gap-3 text-xs text-[#767676]">
        <span>
          {filtered.length === 0
            ? 'No results yet'
            : showAllTowns
              ? hasAnyResults
                ? `${reportingCount} of ${filtered.length} municipalities reporting`
                : `${filtered.length} municipalities in district — no results yet`
              : `${filtered.length} municipalities reporting`}
          {sortKey !== 'total' && sortKey !== 'name' && reportingCount > 0 && (
            <span className="ml-1">· Sorted by {sortedCands.find(c => c.cand_id === sortKey)?.last_name}</span>
          )}
        </span>

        {totalPages > 1 && (
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-0.5 rounded border border-[#c8c8c8] disabled:opacity-40 hover:border-[#2e6b3e] hover:text-[#2e6b3e] disabled:hover:border-[#c8c8c8] disabled:hover:text-[#767676] transition-colors"
            >
              ←
            </button>
            <span className="px-2">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2 py-0.5 rounded border border-[#c8c8c8] disabled:opacity-40 hover:border-[#2e6b3e] hover:text-[#2e6b3e] disabled:hover:border-[#c8c8c8] disabled:hover:text-[#767676] transition-colors"
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
