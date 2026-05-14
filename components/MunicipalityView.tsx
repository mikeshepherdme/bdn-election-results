'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Race, Vcu } from '@/lib/types'
import { candidatePct } from '@/lib/types'

interface Props {
  race: Race
  townRows: (Vcu & { county: string })[]
  sortedCands: Race['candidates']
  colorMap: Record<number, string>
}

type SortKey = 'name' | 'total' | number  // number = cand_id

export default function MunicipalityView({ race, townRows, sortedCands, colorMap }: Props) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('total')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

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

  const filtered = townRows
    .filter(vcu =>
      vcu.vcu.toLowerCase().includes(search.toLowerCase()) ||
      vcu.county.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let aVal: number, bVal: number
      if (sortKey === 'name') {
        return sortDir === 'asc'
          ? a.vcu.localeCompare(b.vcu)
          : b.vcu.localeCompare(a.vcu)
      }
      if (sortKey === 'total') {
        aVal = Object.values(a.votes).reduce((s, v) => s + v, 0)
        bVal = Object.values(b.votes).reduce((s, v) => s + v, 0)
      } else {
        // sort by candidate pct in each town
        const aTotal = Object.values(a.votes).reduce((s, v) => s + v, 0)
        const bTotal = Object.values(b.votes).reduce((s, v) => s + v, 0)
        aVal = aTotal > 0 ? (a.votes[String(sortKey)] ?? 0) / aTotal : 0
        bVal = bTotal > 0 ? (b.votes[String(sortKey)] ?? 0) / bTotal : 0
      }
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal
    })

  const hasResults = race.topline_results.total_votes > 0

  return (
    <div className="bg-white border border-[#c8c8c8] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[#c8c8c8] flex items-center gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-[#444444]">
          Municipality Results
        </h2>
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
                    <span
                      className="w-2 h-2 rounded-sm inline-block shrink-0"
                      style={{ backgroundColor: colorMap[c.cand_id] }}
                    />
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={sortedCands.length + 2} className="px-4 py-6 text-center text-sm text-[#767676]">
                  {search ? `No towns match "${search}"` : 'No results yet'}
                </td>
              </tr>
            ) : (
              filtered.map(vcu => {
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
                          {hasResults ? (
                            <span
                              className={`${isTop ? 'font-bold' : ''}`}
                              style={isTop ? { color: colorMap[c.cand_id] } : { color: '#767676' }}
                            >
                              {p.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-[#c8c8c8]">—</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="text-right px-4 py-2 text-[#767676] tabular-nums text-xs">
                      {total > 0 ? total.toLocaleString() : '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 border-t border-[#f2f2f2] text-xs text-[#767676]">
        {filtered.length} of {townRows.length} municipalities
        {sortKey !== 'total' && sortKey !== 'name' && (
          <span className="ml-2">
            · Sorted by {sortedCands.find(c => c.cand_id === sortKey)?.last_name}
          </span>
        )}
      </div>
    </div>
  )
}
