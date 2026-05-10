import type { NextConfig } from "next";
import { execSync } from 'child_process'

// Build ID: unique per deploy for update detection.
// Uses VERCEL_GIT_COMMIT_SHA (always available in Vercel builds),
// falls back to local git commit count, then timestamp.
const buildId = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)
  ?? (() => {
    try {
      return execSync('git rev-list --count HEAD', { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim()
    } catch {
      return String(Date.now())
    }
  })()
const APP_VERSION = `1.0.${buildId}`

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse'],
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
    NEXT_PUBLIC_APP_VERSION: APP_VERSION,
  },
  turbopack: {
    resolveAlias: {
      '@': './src',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ]
  },
};

export default nextConfig;
