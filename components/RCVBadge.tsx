'use client'

import { useState, useRef } from 'react'

const DISCLAIMER =
  `This race is being decided by ranked-choice voting. Clerks only report first-round choices on election night. If no candidate wins an outright majority, the race will be decided by examining voters' second choices. That count is likely to happen the week after Election Day. We will not call a race until it is clear a candidate will win a majority.`

const TOOLTIP_W = 300

export default function RCVBadge() {
  const [open, setOpen] = useState(false)
  const emojiRef = useRef<HTMLSpanElement>(null)

  const getTooltipStyle = (): React.CSSProperties => {
    if (!emojiRef.current) return { display: 'none' }
    const r = emojiRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom
    const spaceAbove = r.top
    const below = spaceBelow >= 160 || spaceBelow >= spaceAbove

    // Clamp left so it doesn't bleed off either edge
    const idealLeft = r.left
    const left = Math.max(8, Math.min(idealLeft, window.innerWidth - TOOLTIP_W - 8))

    return {
      position: 'fixed',
      top: below ? r.bottom + 6 : undefined,
      bottom: below ? undefined : window.innerHeight - r.top + 6,
      left,
      width: TOOLTIP_W,
      backgroundColor: '#1a1a1a',
      color: '#fff',
      padding: '10px 12px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      fontSize: '13px',
      lineHeight: '1.5',
      zIndex: 9999,
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="text-xs font-semibold px-2 py-0.5 rounded-full select-none"
        style={{ backgroundColor: '#d6ead9', color: '#2e6b3e' }}
      >
        Ranked-Choice Voting
      </span>
      <span
        ref={emojiRef}
        className="cursor-help select-none"
        style={{ fontSize: '12px' }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        tabIndex={0}
        role="note"
        aria-label={DISCLAIMER}
      >📝</span>
      {open && (
        <div style={getTooltipStyle()}>
          {DISCLAIMER}
        </div>
      )}
    </span>
  )
}
