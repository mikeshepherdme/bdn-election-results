'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  towns: string[]
}

export default function TownSearch({ towns }: Props) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  function slugify(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    const match = towns.find(
      (town) => town.toLowerCase() === trimmed.toLowerCase()
    )
    if (!match) {
      setError(true)
      return
    }
    setError(false)
    router.push('/towns/' + slugify(match))
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value)
    if (error) setError(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          list="town-list"
          value={value}
          onChange={handleChange}
          placeholder="Enter town name..."
          aria-label="Town name"
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '1rem',
            backgroundColor: '#ffffff',
            border: error ? '2px solid #cc0000' : '2px solid #cccccc',
            borderRadius: '4px',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => {
            if (!error) e.currentTarget.style.borderColor = '#2e6b3e'
          }}
          onBlur={(e) => {
            if (!error) e.currentTarget.style.borderColor = '#cccccc'
          }}
        />
        <datalist id="town-list">
          {towns.map((town) => (
            <option key={town} value={town} />
          ))}
        </datalist>
        <button
          type="submit"
          style={{
            padding: '8px 18px',
            fontSize: '1rem',
            fontWeight: 600,
            backgroundColor: '#2e6b3e',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#245424'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#2e6b3e'
          }}
        >
          Go
        </button>
      </div>
      {error && (
        <span style={{ color: '#cc0000', fontSize: '0.875rem' }}>
          Town not found
        </span>
      )}
    </form>
  )
}
