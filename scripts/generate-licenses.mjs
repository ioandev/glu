#!/usr/bin/env node
// Generate a third-party LICENSES manifest for GLU (ADR 23).
//
//   node scripts/generate-licenses.mjs --scope web     --out web/LICENSES
//   node scripts/generate-licenses.mjs --scope backend --out backend/LICENSES
//   node scripts/generate-licenses.mjs --scope all     --out LICENSES
//
// GLU is two independent npm packages with their own lockfiles and no root
// manifest (ADR 22), so each scope is one package's installed tree and `all` is
// their union, deduped by name@version. The collector is `npm query '*' --json`
// — npm's own view of the tree `npm ci` produced — so there is nothing extra to
// install. A package whose node_modules is missing degrades to a warning and is
// skipped rather than silently truncating the manifest.
//
// Every manifest embeds GLU's own NOTICE and the full Apache-2.0 text ahead of
// the third-party section. That is deliberate: `web/` and `backend/` are their
// own Docker build contexts (ADR 22), so the root LICENSE/NOTICE cannot be
// copied into an image — the manifest carries the whole obligation in one file.
//
// Output is deterministic (sorted, no timestamps) so re-running only produces a
// diff when the dependency set actually changes. Do not edit the output by
// hand — run `just license`.

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// The two packages, and the first-party name each one must exclude from its own
// manifest (GLU does not attribute GLU).
const PACKAGES = {
  web: { dir: 'web', firstParty: 'glu-web', label: 'web (glu-web)' },
  backend: { dir: 'backend', firstParty: 'glu-backend', label: 'backend (glu-backend)' },
}
const SOURCES = Object.keys(PACKAGES)

// ---- args --------------------------------------------------------------------
const argv = process.argv.slice(2)
const optionValue = (name, fallback) => {
  const i = argv.indexOf(name)
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : fallback
}
const scope = optionValue('--scope', 'all')
if (!['all', ...SOURCES].includes(scope)) {
  console.error(`unknown --scope "${scope}" (expected "all", "web", or "backend")`)
  process.exit(2)
}
const DEFAULT_OUT = { web: 'web/LICENSES', backend: 'backend/LICENSES', all: 'LICENSES' }
const outPath = resolve(ROOT, optionValue('--out', DEFAULT_OUT[scope]))
const scopeSources = scope === 'all' ? SOURCES : [scope]

const warn = (msg) => console.warn(`  ! ${msg}`)

// ---- shared: read bundled license text from a package directory --------------
const LICENSE_FILE_RE =
  /^(LICEN[CS]E|COPYING|COPYRIGHT|UNLICEN[CS]E|NOTICE|MIT-LICENSE|LICENSE-MIT|LICENSE-APACHE)([.-].*)?$/i

function readLicenseTextFromDir(dir) {
  if (!dir || !existsSync(dir)) return ''
  let files
  try {
    files = readdirSync(dir)
  } catch {
    return ''
  }
  const picks = files.filter((f) => LICENSE_FILE_RE.test(f)).sort()
  const texts = []
  for (const f of picks) {
    try {
      const p = join(dir, f)
      if (!statSync(p).isFile()) continue
      const t = readFileSync(p, 'utf8').trim()
      if (t) texts.push(t)
    } catch {
      /* unreadable file — skip */
    }
  }
  return texts.join('\n\n---\n\n')
}

// ---- npm collector -----------------------------------------------------------
// npm's `license` field is a string in practice, but the legacy forms — an
// object `{type, url}` and an array of either — are still in the wild.
function normaliseSpdx(license) {
  if (!license) return ''
  if (typeof license === 'string') return license
  if (Array.isArray(license)) {
    const parts = license.map(normaliseSpdx).filter(Boolean)
    return parts.length > 1 ? `(${parts.join(' OR ')})` : parts[0] || ''
  }
  if (typeof license === 'object') return license.type || license.name || ''
  return ''
}

// Fall back to the repository when a package declares no homepage; strip the
// `git+…​.git` clone-URL decoration so the column stays readable.
function normaliseHomepage(p) {
  const raw = p.homepage || (typeof p.repository === 'string' ? p.repository : p.repository?.url) || ''
  return raw
    .replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/\.git$/, '')
}

function normaliseAuthor(author) {
  if (!author) return ''
  if (typeof author === 'string') return author
  if (typeof author === 'object') {
    return [author.name, author.email && `<${author.email}>`].filter(Boolean).join(' ')
  }
  return ''
}

function collectPackage(key) {
  const { dir, firstParty } = PACKAGES[key]
  const cwd = join(ROOT, dir)
  if (!existsSync(join(cwd, 'node_modules'))) {
    warn(`no ${dir}/node_modules — run \`just ${key} install\` first; skipping its dependencies`)
    return []
  }
  let raw
  try {
    raw = execFileSync('npm', ['query', '*', '--json'], {
      cwd,
      encoding: 'utf8',
      maxBuffer: 1 << 28,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch (e) {
    // `npm query` can exit non-zero on a partially-installed tree while still
    // writing usable JSON to stdout — keep whatever we got.
    raw = e.stdout ? e.stdout.toString() : ''
  }
  if (!raw.trim()) {
    warn(`\`npm query\` produced no output in ${dir}/ — is \`npm ci\` up to date?`)
    return []
  }
  let data
  try {
    data = JSON.parse(raw)
  } catch {
    warn(`could not parse \`npm query '*' --json\` output for ${dir}/ — skipping`)
    return []
  }

  const entries = []
  for (const p of data) {
    // The queried package itself is in the result set with an empty location.
    if (!p.name || !p.version || !p.location) continue
    if (p.name === firstParty) continue
    entries.push({
      sources: [key],
      name: p.name,
      version: p.version,
      spdx: normaliseSpdx(p.license),
      author: normaliseAuthor(p.author),
      homepage: normaliseHomepage(p),
      // Per-package, not merged: the same dependency can be a dev tool in one
      // half and a runtime dependency in the other.
      devBySource: { [key]: p.dev === true },
      text: readLicenseTextFromDir(p.realpath || p.path),
    })
  }
  return entries
}

// Union across scopes, deduped by name@version. A package pulled by both halves
// is listed once, tagged with both sources; it counts as dev-only only when it
// is a dev dependency everywhere it appears.
function collect() {
  const merged = new Map()
  for (const key of scopeSources) {
    for (const e of collectPackage(key)) {
      const id = `${e.name}@${e.version}`
      const seen = merged.get(id)
      if (!seen) {
        merged.set(id, e)
        continue
      }
      if (!seen.sources.includes(e.sources[0])) seen.sources.push(e.sources[0])
      Object.assign(seen.devBySource, e.devBySource)
      if (!seen.text) seen.text = e.text
      if (!seen.spdx) seen.spdx = e.spdx
      if (!seen.homepage) seen.homepage = e.homepage
    }
  }
  return [...merged.values()]
}

// ---- license classification (compliance flagging) ----------------------------
// Sort every package into a compliance category so copyleft/unknown licenses are
// surfaced automatically on each run. Anything not recognised as clearly
// permissive is flagged for review (fail-closed).
const CATEGORY = {
  permissive: { rank: 0, label: 'Permissive', note: 'keep the copyright + license notice; no other obligation' },
  attribution: {
    rank: 1,
    label: 'Attribution (data/docs)',
    note: 'attribution required (CC-BY / OFL); usually build-time data',
  },
  weak: {
    rank: 2,
    label: 'Weak copyleft (file-level)',
    note: 'MPL/EPL/CDDL: keep notices; publish source of any file YOU modify',
  },
  lgpl: {
    rank: 3,
    label: 'LGPL',
    note: 'keep it a replaceable library + provide its source when you distribute a binary',
  },
  strong: {
    rank: 4,
    label: 'Strong copyleft (GPL/AGPL)',
    note: 'REVIEW: can force your combined work open — verify before shipping',
  },
  review: {
    rank: 5,
    label: 'Needs review (unrecognised)',
    note: 'REVIEW: license string not recognised — classify by hand',
  },
}
const rankToCategory = Object.fromEntries(Object.entries(CATEGORY).map(([k, v]) => [v.rank, k]))

// Whole-phrase free-text names (from npm `license` fields) → SPDX id. Ordered
// longest-first so specific phrases win. Applied before SPDX-expression parsing.
const FREETEXT = [
  ['Mozilla Public License 2.0 (MPL 2.0)', 'MPL-2.0'],
  ['GNU Lesser General Public License v3 or later (LGPLv3+)', 'LGPL-3.0-or-later'],
  ['GNU Lesser General Public License', 'LGPL-3.0'],
  ['GNU Affero General Public License', 'AGPL-3.0'],
  ['GNU General Public License', 'GPL-3.0'],
  ['Apache Software License', 'Apache-2.0'],
  ['Apache License 2.0', 'Apache-2.0'],
  ['The MIT License (MIT)', 'MIT'],
  ['MIT License', 'MIT'],
  ['BSD License', 'BSD-3-Clause'],
  ['ISC License', 'ISC'],
]
const PERMISSIVE = new Set([
  'MIT',
  'MIT-0',
  'ISC',
  'BSD-2-CLAUSE',
  'BSD-3-CLAUSE',
  'BSD-3-CLAUSE-CLEAR',
  '0BSD',
  'APACHE-2.0',
  'UNLICENSE',
  'BLUEOAK-1.0.0',
  'UNICODE-3.0',
  'UNICODE-DFS-2016',
  'ZLIB',
  'WTFPL',
  'PSF-2.0',
  'PYTHON-2.0',
  'NCSA',
  'BSL-1.0',
  'CC0-1.0',
  'BSD',
  'AFL-2.1',
  'MPL-2.0-NO-COPYLEFT-EXCEPTION',
])
const WEAK = new Set(['MPL-2.0', 'MPL-1.1', 'EPL-1.0', 'EPL-2.0', 'CDDL-1.0', 'CDDL-1.1', 'OSL-3.0'])

function classifyAtom(tokenRaw) {
  const t = (tokenRaw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+WITH\s+.*/i, '') // exceptions loosen; classify the base
  if (!t) return null
  if (t.startsWith('AGPL')) return 'strong'
  if (t.startsWith('LGPL')) return 'lgpl'
  if (t.startsWith('GPL')) return 'strong'
  if (t.startsWith('CC-BY-SA')) return 'weak' // share-alike
  if (t.startsWith('CC-BY') || t.startsWith('OFL')) return 'attribution'
  if (t.startsWith('CC0')) return 'permissive'
  if (WEAK.has(t)) return 'weak'
  if (PERMISSIVE.has(t)) return 'permissive'
  return 'review'
}

// Classify a full SPDX expression. AND = must satisfy all (max severity); OR and
// the `/` shorthand = pick the least restrictive (min severity). Handles parens.
function classifyLicense(spdxRaw) {
  let src = ` ${spdxRaw || ''} `
  for (const [phrase, id] of FREETEXT) {
    src = src.replace(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), id)
  }
  src = src.replace(/\//g, ' OR ').replace(/\s+WITH\s+[A-Za-z0-9.-]+/gi, '')
  const tokens = src.match(/\(|\)|\bOR\b|\bAND\b|[^()\s]+/gi) || []
  if (!tokens.length) return 'review'
  let i = 0
  const peek = () => tokens[i]
  const primary = () => {
    if (peek() === '(') {
      i++
      const v = orExpr()
      if (peek() === ')') i++
      return v
    }
    return CATEGORY[classifyAtom(tokens[i++]) || 'review'].rank
  }
  const andExpr = () => {
    let v = primary()
    while ((peek() || '').toUpperCase() === 'AND') {
      i++
      v = Math.max(v, primary())
    }
    return v
  }
  const orExpr = () => {
    let v = andExpr()
    while ((peek() || '').toUpperCase() === 'OR') {
      i++
      v = Math.min(v, andExpr())
    }
    return v
  }
  return rankToCategory[orExpr()]
}

function renderCompliance(entries) {
  const tally = new Map(Object.keys(CATEGORY).map((k) => [k, []]))
  for (const e of entries) tally.get(classifyLicense(e.spdx)).push(e)

  const summary = Object.keys(CATEGORY)
    .map((k) => `${CATEGORY[k].label}: ${tally.get(k).length}`)
    .join('\n  ')

  const flagged = tally.get('strong').length + tally.get('review').length
  const verdict =
    flagged > 0
      ? `⚠  ATTENTION: ${flagged} package(s) carry a strong-copyleft or unrecognised license — review before shipping.`
      : '✓  No strong-copyleft (GPL/AGPL) or unrecognised licenses detected.'

  const lines = [`  ${summary}`, '', verdict, '']
  // List every non-permissive package (the whole point: flag them up top).
  const flagOrder = ['strong', 'review', 'lgpl', 'weak', 'attribution']
  const anyFlagged = flagOrder.some((k) => tally.get(k).length)
  if (anyFlagged) {
    lines.push('Packages requiring attention (non-permissive):', '')
    for (const k of flagOrder) {
      const list = tally.get(k).slice().sort(byNameThenVersion)
      if (!list.length) continue
      lines.push(`  ▸ ${CATEGORY[k].label} — ${CATEGORY[k].note}`)
      for (const e of list) lines.push(`      ${packageKey(e)}  (${sourceTag(e)})  [${e.spdx || 'UNKNOWN'}]`)
      lines.push('')
    }
  }
  return lines.join('\n').replace(/\n+$/, '')
}

// ---- rendering ---------------------------------------------------------------
const byNameThenVersion = (a, b) =>
  a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || (a.version || '').localeCompare(b.version || '')

function packageKey(e) {
  return `${e.name}@${e.version}`
}

function sourceTag(e) {
  return e.sources.slice().sort().join(' + ')
}

function renderIndex(entries) {
  const lines = []
  for (const source of scopeSources) {
    const list = entries
      .filter((e) => e.sources.includes(source))
      .slice()
      .sort(byNameThenVersion)
    if (!list.length) continue
    const devCount = list.filter((e) => e.devBySource[source]).length
    lines.push(
      `### ${PACKAGES[source].label} — ${list.length} package${list.length === 1 ? '' : 's'}` +
        (devCount ? `  (${devCount} dev-only, marked [dev])` : ''),
      '',
    )
    const nameW = Math.min(48, Math.max(...list.map((e) => packageKey(e).length)))
    for (const e of list) {
      const id = packageKey(e).padEnd(nameW)
      const spdx = (e.spdx || 'UNKNOWN').padEnd(24)
      lines.push(`  ${id}  ${spdx}  ${e.devBySource[source] ? '[dev] ' : ''}${e.homepage || ''}`.trimEnd())
    }
    lines.push('')
  }
  return lines.join('\n')
}

function renderTexts(entries) {
  // Group packages that ship byte-identical license text.
  const byText = new Map()
  const noText = []
  for (const e of entries) {
    const t = (e.text || '').trim()
    if (!t) {
      noText.push(e)
      continue
    }
    if (!byText.has(t)) byText.set(t, [])
    byText.get(t).push(e)
  }

  // Deterministic order: sort groups by their first (sorted) member key.
  const groups = [...byText.entries()].map(([text, members]) => ({
    text,
    members: members.slice().sort(byNameThenVersion),
  }))
  groups.sort((a, b) => packageKey(a.members[0]).toLowerCase().localeCompare(packageKey(b.members[0]).toLowerCase()))

  const bar = '─'.repeat(78)
  const lines = []
  for (const g of groups) {
    lines.push(bar)
    for (const m of g.members) lines.push(`  ${packageKey(m)}  (${sourceTag(m)})`)
    lines.push(bar, '', g.text, '')
  }

  if (noText.length) {
    lines.push(bar)
    lines.push('  Packages with no bundled license text')
    lines.push('  (refer to the SPDX identifier and homepage in the index above)')
    lines.push(bar, '')
    for (const e of noText.slice().sort(byNameThenVersion)) {
      lines.push(`  ${packageKey(e)}  (${sourceTag(e)})  —  ${e.spdx || 'UNKNOWN'}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

// GLU's own terms, embedded so a single file satisfies Apache §4(a) and §4(d)
// inside an image built from web/ or backend/ (ADR 22 — the root LICENSE and
// NOTICE are outside both build contexts).
function readOwnLicense() {
  const read = (name) => {
    const p = join(ROOT, name)
    if (!existsSync(p)) {
      console.error(`missing ${name} at the repo root — GLU's own license must ship inside every manifest.`)
      process.exit(1)
    }
    // Trailing-only trim: the Apache text opens with a centred, space-indented
    // title, and a plain .trim() would left-align it.
    return readFileSync(p, 'utf8').replace(/^\n+/, '').replace(/\s+$/, '')
  }
  return { notice: read('NOTICE'), license: read('LICENSE') }
}

function render(entries) {
  const perSource = scopeSources
    .map((s) => `${s}: ${entries.filter((e) => e.sources.includes(s)).length}`)
    .join(' · ')

  // License summary (by SPDX id) — a quick skim of what obligations exist.
  const licenseCounts = new Map()
  for (const e of entries) {
    const key = e.spdx || 'UNKNOWN'
    licenseCounts.set(key, (licenseCounts.get(key) || 0) + 1)
  }
  const licenseSummary = [...licenseCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([lic, n]) => `  ${String(n).padStart(4)}  ${lic}`)
    .join('\n')

  const title = {
    web: 'GLU web (glu-web) — Licenses & Third-Party Notices',
    backend: 'GLU api (glu-backend) — Licenses & Third-Party Notices',
    all: 'GLU — Licenses & Third-Party Notices',
  }[scope]
  const scopeNote = {
    web: "Covers the npm dependency tree of GLU's Next.js app (runtime + dev).",
    backend: "Covers the npm dependency tree of GLU's Express Todoist proxy (runtime + dev).",
    all: 'Covers both packages of the GLU repo — web/ (the Next.js app) and\nbackend/ (the Express Todoist proxy) — deduped by name@version.',
  }[scope]

  const { notice, license } = readOwnLicense()

  return `${title}
${'='.repeat(title.length)}

GENERATED FILE — do not edit by hand. Regenerate with \`just license\`.

${scopeNote}

GLU's own source code is licensed under Apache-2.0 — reproduced in full below,
together with GLU's NOTICE. The third-party packages listed after it are
redistributed under their own licenses; this file reproduces those licenses and
notices.

Total third-party packages: ${entries.length}   (${perSource})

Licenses in use (package count):
${licenseSummary}


${'='.repeat(78)}
GLU'S OWN LICENSE
${'='.repeat(78)}

${notice}

${'─'.repeat(78)}
The repo's LICENSE file, reproduced in full:
${'─'.repeat(78)}

${license}


${'='.repeat(78)}
THIRD-PARTY LICENSE COMPLIANCE OVERVIEW
${'='.repeat(78)}

Category rollup (${entries.length} packages):
${renderCompliance(entries)}


${'='.repeat(78)}
THIRD-PARTY PACKAGE INDEX
${'='.repeat(78)}

Packages marked [dev] are build/test-time only and are not present in the
published images; they are attributed anyway because they are part of the
source distribution.

${renderIndex(entries)}
${'='.repeat(78)}
THIRD-PARTY LICENSE TEXTS
${'='.repeat(78)}

The texts below are the LICENSE / NOTICE / COPYING files bundled with each
package. Packages that ship byte-identical text are grouped together.

${renderTexts(entries)}`.replace(/[ \t]+\n/g, '\n')
}

// ---- main --------------------------------------------------------------------
console.log(`Generating ${scope} LICENSES -> ${outPath}`)
const entries = collect()
if (!entries.length) {
  console.error('No third-party packages found — refusing to overwrite with an empty file.')
  process.exit(1)
}
const output = render(entries).replace(/\n+$/, '\n')
writeFileSync(outPath, output)
const counts = scopeSources.map((s) => `${s} ${entries.filter((e) => e.sources.includes(s)).length}`).join(', ')
console.log(`Wrote ${outPath}: ${entries.length} packages (${counts})`)
