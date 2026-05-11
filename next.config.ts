import type { NextConfig } from "next";
import { execSync } from 'child_process'
import { readFileSync } from 'fs'

// Build ID for update detection — must be unique per deploy.
// Uses VERCEL_GIT_COMMIT_SHA on Vercel, local git count as fallback.
const buildId = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)
  ?? (() => {
    try {
      return execSync('git rev-list --count HEAD', { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim()
    } catch {
      return String(Date.now())
    }
  })()

// Human-readable release version from package.json — bump with `npm run release`.
const { version: releaseVersion } = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string }

// Human-readable build date shown in the sidebar footer next to the version.
// Format: "10.05.26" — auto-updates on every deploy, no manual work needed.
const now = new Date()
const BUILD_DATE = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getFullYear()).slice(2)}`

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse'],
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
    NEXT_PUBLIC_APP_VERSION: buildId,
    NEXT_PUBLIC_RELEASE_VERSION: releaseVersion,
    NEXT_PUBLIC_BUILD_DATE: BUILD_DATE,
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
