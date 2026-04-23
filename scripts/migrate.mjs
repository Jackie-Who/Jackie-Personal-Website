// scripts/migrate.mjs
// Apply every .sql file in ../migrations/ to the libSQL database
// named by TURSO_DATABASE_URL. Works for both remote (libsql://…)
// and local (file:./local.db) URLs — the client is the same.
//
// Usage:
//   # Env-var flow (prod)
//   TURSO_DATABASE_URL=libsql://…  TURSO_AUTH_TOKEN=…  node scripts/migrate.mjs
//
//   # Or read from site/.env (auto-detected)
//   node scripts/migrate.mjs
//
//   # Or pass the URL + token inline
//   node scripts/migrate.mjs <url> <auth-token>
//
// Windows PowerShell doesn't like inline env vars — use the .env
// file or the positional-arg form on PowerShell.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(here, '..', 'migrations');
const envPath = resolve(here, '..', '.env');

// --- Collect credentials: CLI args > env vars > .env file ---
let [, , argUrl, argToken] = process.argv;
let url = argUrl ?? process.env.TURSO_DATABASE_URL;
let authToken = argToken ?? process.env.TURSO_AUTH_TOKEN;

if (!url) {
  // Fall back to reading site/.env manually (zero-dep).
  try {
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key === 'TURSO_DATABASE_URL' && !url) url = val;
      if (key === 'TURSO_AUTH_TOKEN' && !authToken) authToken = val;
    }
  } catch {
    /* .env doesn't exist; that's fine */
  }
}

if (!url) {
  console.error(
    'error: no TURSO_DATABASE_URL.\n' +
      'Set it in site/.env, export it in your shell, or pass it as the first argument.',
  );
  process.exit(1);
}

const isFile = url.startsWith('file:');
const client = createClient({
  url,
  ...(authToken && !isFile ? { authToken } : {}),
});

// --- Read all *.sql from migrations/ and run each sequentially ---
let files;
try {
  files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
} catch (err) {
  console.error(`error: can't read ${migrationsDir}:`, err?.message ?? err);
  process.exit(1);
}

if (files.length === 0) {
  console.log('no migration files found');
  process.exit(0);
}

console.log(`target: ${url}`);
console.log(`found ${files.length} migration file(s)\n`);

for (const f of files) {
  const path = join(migrationsDir, f);
  const sql = readFileSync(path, 'utf8');
  // Strip `-- ...` line comments first, then split on semicolons
  // that end a statement. Crude but fine for the statements we ship
  // — no procedural blocks or embedded `;` strings.
  const stripped = sql.replace(/--.*$/gm, '');
  const statements = stripped
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  process.stdout.write(`→ ${f}  (${statements.length} stmt${statements.length === 1 ? '' : 's'})  `);
  try {
    for (const stmt of statements) {
      await client.execute(stmt);
    }
    console.log('ok');
  } catch (err) {
    console.log('fail');
    console.error('    ', err?.message ?? err);
    process.exit(1);
  }
}

console.log('\nall migrations applied.');
process.exit(0);
