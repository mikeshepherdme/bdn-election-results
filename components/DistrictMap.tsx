'use client'

import { useEffect, useRef, useState } from 'react'
import type { Candidate } from '@/lib/types'
import { OTHER_COLOR } from '@/lib/candidate-colors'

interface CandResult {
  lastName: string
  pct: number
  color: string
}

interface TownResult {
  leadingCandId: number
  leadingName: string
  leadingPct: number
  totalVotes: number
  color: string
  allResults: CandResult[]
}

interface Props {
  districtNum: number
  districtType: 'house' | 'senate'
  townResults: Record<string, TownResult>
  candidates: Candidate[]
  colorMap: Record<number, string>
}

const W = 340
const DISPLAY_H = 320
const MIN_ZOOM = 1, MAX_ZOOM = 4, ZOOM_STEP = 1

const BTN: React.CSSProperties = {
  width: 28, height: 28, background: 'white', border: '1px solid #c8c8c8',
  borderRadius: 4, fontSize: 18, fontWeight: 700, lineHeight: 1,
  cursor: 'pointer', color: '#444', display: 'flex',
  alignItems: 'center', justifyContent: 'center', userSelect: 'none',
}

function toMercY(lat: number) {
  const r = (lat * Math.PI) / 180
  return Math.log(Math.tan(Math.PI / 4 + r / 2))
}

function getBounds(features: any[]): { minLng: number; maxLng: number; minLat: number; maxLat: number } {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
  for (const feat of features) {
    const g = feat.geometry
    const rings: number[][][] = g.type === 'Polygon' ? g.coordinates : g.coordinates.flat(1)
    for (const ring of rings) {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng
        if (lng > maxLng) maxLng = lng
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
      }
    }
  }
  return { minLng, maxLng, minLat, maxLat }
}

function featureToPath(
  feature: any,
  project: (lng: number, lat: number) => [number, number]
): string {
  const geom = feature?.geometry
  if (!geom) return ''
  const rings: number[][][] = geom.type === 'Polygon' ? geom.coordinates : geom.coordinates.flat(1)
  return rings
    .map(ring =>
      ring
        .map(([lng, lat], i) => {
          const [x, y] = project(lng, lat)
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
        })
        .join(' ') + ' Z'
    )
    .join(' ')
}

export default function DistrictMap({ districtNum, districtType, townResults, candidates, colorMap }: Props) {
  const [districtGeo, setDistrictGeo] = useState<any>(null)
  const [municipalGeo, setMunicipalGeo] = useState<any>(null)
  const [tooltip, setTooltip] = useState<{
    clientX: number; clientY: number; name: string; result: TownResult | null
  } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)
  const computedHRef = useRef(DISPLAY_H)

  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setDistrictGeo(null)
    Promise.all([
      fetch(`/geo/${districtType}-districts/${districtNum}.geojson`).then(r => r.json()),
      fetch('/geo/maine-results.geojson').then(r => r.json()),
    ]).then(([dist, muni]) => {
      setDistrictGeo(dist)
      setMunicipalGeo(muni)
    })
  }, [districtNum, districtType])

  if (!districtGeo || !municipalGeo) {
    return (
      <div
        className="border border-[#c8c8c8] rounded-lg bg-[#f2f2f2] animate-pulse"
        style={{ height: DISPLAY_H }}
      />
    )
  }

  const districtFeature = districtGeo.features[0]
  const raw = getBounds([districtFeature])

  // 12% padding around the district
  const lngPad = (raw.maxLng - raw.minLng) * 0.12
  const latPad = (raw.maxLat - raw.minLat) * 0.12
  const b = {
    minLng: raw.minLng - lngPad,
    maxLng: raw.maxLng + lngPad,
    minLat: raw.minLat - latPad,
    maxLat: raw.maxLat + latPad,
  }

  const mercYMin = toMercY(b.minLat)
  const mercYMax = toMercY(b.maxLat)
  const lngSpan = b.maxLng - b.minLng
  const mercSpan = mercYMax - mercYMin

  const H = Math.round(W * mercSpan / (lngSpan * (Math.PI / 180)))
  computedHRef.current = H

  function project(lng: number, lat: number): [number, number] {
    const x = ((lng - b.minLng) / lngSpan) * W
    const y = (1 - (toMercY(lat) - mercYMin) / mercSpan) * H
    return [x, y]
  }

  function handleZoom(delta: number) {
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta))
    if (newZoom === zoom) return
    if (newZoom === 1) {
      setZoom(1)
      setPan({ x: 0, y: 0 })
      return
    }
    const cH = computedHRef.current
    setZoom(newZoom)
    setPan({
      x: W / 2 - (W / 2 - pan.x) / zoom * newZoom,
      y: cH / 2 - (cH / 2 - pan.y) / zoom * newZoom,
    })
  }

  function handleMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (zoom <= 1) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
    setIsDragging(true)
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!dragRef.current || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const scaleX = W / rect.width
    const scaleY = H / rect.height
    const dx = (e.clientX - dragRef.current.startX) * scaleX
    const dy = (e.clientY - dragRef.current.startY) * scaleY
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy })
  }

  function handleMouseUp() {
    dragRef.current = null
    setIsDragging(false)
  }

  const visibleMunis = (municipalGeo.features as any[]).filter((f: any) => {
    const coords = f.geometry.type === 'Polygon'
      ? f.geometry.coordinates[0]
      : f.geometry.coordinates[0][0]
    const [lng, lat] = coords[0]
    return (
      lng >= b.minLng - 0.05 && lng <= b.maxLng + 0.05 &&
      lat >= b.minLat - 0.05 && lat <= b.maxLat + 0.05
    )
  })

  const districtPath = featureToPath(districtFeature, project)

  return (
    <div className="border border-[#c8c8c8] rounded-lg overflow-hidden bg-white">
      <div className="px-4 py-2 bg-[#f2f2f2] border-b border-[#c8c8c8]">
        <h2 className="text-sm font-semibold text-[#444444]">
          Election Map · District {districtNum}
        </h2>
      </div>

      <div className="relative" style={{ height: DISPLAY_H }}>
        {/* Zoom controls */}
        <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button style={{ ...BTN, opacity: zoom >= MAX_ZOOM ? 0.35 : 1 }} onClick={() => handleZoom(ZOOM_STEP)} disabled={zoom >= MAX_ZOOM} title="Zoom in">+</button>
          <button style={{ ...BTN, opacity: zoom <= MIN_ZOOM ? 0.35 : 1 }} onClick={() => handleZoom(-ZOOM_STEP)} disabled={zoom <= MIN_ZOOM} title="Zoom out">−</button>
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: '100%', display: 'block', cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            {visibleMunis.map((f: any) => {
              const name: string = f.properties?.municipality ?? ''
              const result = townResults[name] ?? null
              return (
                <path
                  key={name}
                  d={featureToPath(f, project)}
                  fill={result?.color ?? '#e8e8e8'}
                  fillOpacity={result ? 0.88 : 0.7}
                  stroke="#fff"
                  strokeWidth={0.5}
                  className="cursor-default"
                  onMouseEnter={e => setTooltip({ clientX: e.clientX, clientY: e.clientY, name, result })}
                  onMouseMove={e => setTooltip(t => t ? { ...t, clientX: e.clientX, clientY: e.clientY } : t)}
                  onMouseLeave={() => setTooltip(null)}
                />
              )
            })}
            <path d={districtPath} fill="none" stroke="#1a1a1a" strokeWidth={2} strokeLinejoin="round" style={{ pointerEvents: 'none' }} />
          </g>

        </svg>

        {tooltip && (
          <div style={{
            position: 'fixed',
            left: tooltip.clientX + 14,
            top: tooltip.clientY - 10,
            background: 'rgba(17,17,17,0.92)',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            lineHeight: '1.6',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 9999,
          }}>
            <div style={{ fontWeight: 700, marginBottom: '3px' }}>{tooltip.name}</div>
            {tooltip.result
              ? tooltip.result.allResults.filter(r => r.pct > 0).map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', backgroundColor: r.color, flexShrink: 0 }} />
                    <span>{r.lastName}</span>
                    <span style={{ marginLeft: 'auto', paddingLeft: '12px', fontVariantNumeric: 'tabular-nums' }}>{r.pct.toFixed(1)}%</span>
                  </div>
                ))
              : <div style={{ color: '#aaa' }}>No results yet</div>
            }
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-[#f2f2f2] flex flex-wrap gap-x-4 gap-y-1">
        {candidates.filter(c => colorMap[c.cand_id] !== OTHER_COLOR).map(c => (
          <div key={c.cand_id} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: colorMap[c.cand_id] }} />
            <span className="text-xs text-[#444444]">{c.last_name}</span>
          </div>
        ))}
        {candidates.some(c => colorMap[c.cand_id] === OTHER_COLOR) && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: OTHER_COLOR }} />
            <span className="text-xs text-[#767676]">Other</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: '#e8e8e8' }} />
          <span className="text-xs text-[#767676]">No results</span>
        </div>
      </div>
    </div>
  )
}
