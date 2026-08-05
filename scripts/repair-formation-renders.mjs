#!/usr/bin/env node
/**
 * Re-render les pages formation dont la colonne render contient encore du MD brut.
 * Usage (depuis la racine du repo, conteneur wiki-dev-api ou host avec accès DB) :
 *   node scripts/repair-formation-renders.mjs
 *   node scripts/repair-formation-renders.mjs --concurrency 8
 *   node scripts/repair-formation-renders.mjs --dry-run --limit 20
 */
import childProcess from 'node:child_process'
import { createRequire } from 'node:module'
import { promisify } from 'node:util'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import knex from 'knex'

const require = createRequire(import.meta.url)
const { isStaleMarkdownRender } = require('../server/modules/redstone/domain/wiki-render.js')

const execFile = promisify(childProcess.execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const parseArgs = () => {
  const args = process.argv.slice(2)
  const readFlag = name => {
    const idx = args.indexOf(name)
    return idx >= 0 ? args[idx + 1] : null
  }
  return {
    concurrency: Math.max(1, Number(readFlag('--concurrency')) || 4),
    limit: readFlag('--limit') ? Math.max(1, Number(readFlag('--limit')) || 0) : null,
    dryRun: args.includes('--dry-run')
  }
}

const db = () =>
  knex({
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER || 'wikijs',
      password: process.env.DB_PASS || process.env.POSTGRES_PASSWORD || 'wikijs-local-test',
      database: process.env.DB_NAME || 'wiki'
    }
  })

const renderPage = async pageId =>
  execFile('node', ['server/core/worker.js', '--job=render-page', `--data=${pageId}`], {
    cwd: ROOT,
    timeout: 120_000
  })

const runPool = async (ids, concurrency) => {
  let index = 0
  let done = 0
  let failed = 0

  const worker = async () => {
    while (index < ids.length) {
      const current = index++
      const id = ids[current]
      try {
        await renderPage(id)
        done += 1
        if (done % 25 === 0 || done === ids.length) {
          process.stdout.write(`\r  ${done}/${ids.length} rendues (${failed} échecs)`)
        }
      } catch (err) {
        failed += 1
        console.error(`\n  WARN page ${id}: ${err.message}`)
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker))
  console.log('')
  return { done, failed }
}

const main = async () => {
  const { concurrency, limit, dryRun } = parseArgs()
  const k = db()
  let query = k('pages')
    .where('path', 'like', 'formations/%')
    .where('contentType', 'markdown')
    .whereNotNull('content')
    .where('content', '!=', '')
    .select('id', 'path', 'contentType', 'editorKey', 'content', 'render')

  const rows = await query
  const stale = rows.filter(isStaleMarkdownRender)
  const targets = limit ? stale.slice(0, limit) : stale

  console.log(`Pages formation stale: ${stale.length} / ${rows.length}${limit ? ` (limite ${limit})` : ''}`)

  if (!targets.length) {
    await k.destroy()
    return
  }

  if (dryRun) {
    targets.slice(0, 15).forEach(row => console.log(`  [dry-run] #${row.id} ${row.path}`))
    if (targets.length > 15) console.log(`  … et ${targets.length - 15} autres`)
    await k.destroy()
    return
  }

  const ids = targets.map(r => r.id)
  const { done, failed } = await runPool(ids, concurrency)
  console.log(`Terminé: ${done} rendues, ${failed} échecs`)
  await k.destroy()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
