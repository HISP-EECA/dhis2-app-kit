/**
 * Compile JSX to plain ESM.
 *
 * The kit ships compiled rather than as source. A consumer's build does
 * not transpile node_modules, so shipping .jsx would make every app add
 * an exception to its bundler config - and the first app to forget would
 * get an error with no obvious cause.
 *
 * Peers are left external: React, @dhis2/ui and the runtime belong to the
 * app, and bundling a second copy of React is the classic way to produce
 * "invalid hook call".
 */
import { build } from 'esbuild'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const entries = []
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.jsx?$/.test(f)) entries.push(p)
  }
}
walk('src')

await build({
  entryPoints: entries,
  outdir: 'dist',
  outbase: 'src',
  format: 'esm',
  target: 'es2020',
  jsx: 'automatic',
  platform: 'browser',
  bundle: false,
  loader: { '.js': 'jsx' },
  logLevel: 'info',
})

// esbuild compiles x.jsx to x.js but leaves the specifier alone, so the
// emitted `from './context.jsx'` points at a file dist does not contain.
// In bundle mode this never surfaces; shipping unbundled, it is fatal and
// only shows up in the consuming app.
const { readFileSync, writeFileSync } = await import('node:fs')
let fixed = 0
const rewrite = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) { rewrite(p); continue }
    if (!p.endsWith('.js')) continue
    const before = readFileSync(p, 'utf8')
    const after = before.replace(/(from\s+['"]\.{1,2}\/[^'"]+)\.jsx(['"])/g, '$1.js$2')
    if (after !== before) { writeFileSync(p, after); fixed++ }
  }
}
rewrite('dist')

console.log(`compiled ${entries.length} files, rewrote specifiers in ${fixed}`)
