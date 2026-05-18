import type { NextConfig } from 'next'

const config: NextConfig = {
  outputFileTracingIncludes: {
    '/api/towns': ['./data/*.json'],
    '/api/race/[slug]': ['./data/*.json'],
    '/api/race/[slug]/auto-updates': ['./data/*.json'],
    '/api/race/[slug]/events': ['./data/*.json'],
  },
}

export default config
