#!/usr/bin/env node
// Bumps patch version in package.json + changelog.ts, then commits & pushes.
// Usage: npm run release
import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const [major, minor, patch] = pkg.version.split('.').map(Number)
const newVersion = `${major}.${minor}.${patch + 1}`
pkg.version = newVersion
writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
console.log(`✓ package.json: ${major}.${minor}.${patch} → ${newVersion}`)

// Update the version field in the first CHANGELOG entry
let changelog = readFileSync('src/lib/changelog.ts', 'utf8')
changelog = changelog.replace(/version: ['"][^'"]+['"]/, `version: '${newVersion}'`)
const today = new Date()
const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
changelog = changelog.replace(/date: ['"][^'"]+['"]/, `date: '${dateStr}'`)
writeFileSync('src/lib/changelog.ts', changelog)
console.log(`✓ changelog.ts version → ${newVersion}, date → ${dateStr}`)

execSync('git add package.json src/lib/changelog.ts', { stdio: 'inherit' })
execSync(`git commit -m "chore: release v${newVersion}"`, { stdio: 'inherit' })
execSync('git push origin main', { stdio: 'inherit' })
console.log(`\n✓ Released v${newVersion} — Vercel deploying…`)
console.log(`  → Vergiss nicht, in changelog.ts einzutragen was neu ist!`)
