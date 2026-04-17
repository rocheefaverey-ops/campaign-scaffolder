#!/usr/bin/env node

/**
 * cli/teardown.js
 *
 * Delete scaffolded test projects from the workspace.
 * Only removes directories that contain a .scaffolded marker file
 * written by scaffold.js — never touches real projects.
 *
 * Usage:
 *   node cli/teardown.js           — interactive picker
 *   node cli/teardown.js --all     — delete all scaffolded projects (with confirm)
 *   node cli/teardown.js --list    — list only, no deletion
 */

import { createInterface } from 'readline';
import { existsSync, readdirSync, statSync, readFileSync, rmSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const SCAFFOLDER_ROOT = resolve(__dirname, '..');
const WORKSPACE_ROOT  = resolve(SCAFFOLDER_ROOT, '..');

const c = {
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
};

function findScaffoldedProjects() {
  const entries = readdirSync(WORKSPACE_ROOT);
  const projects = [];
  for (const entry of entries) {
    const dir    = join(WORKSPACE_ROOT, entry);
    const marker = join(dir, '.scaffolded');
    if (!statSync(dir).isDirectory()) continue;
    if (!existsSync(marker)) continue;
    let meta = { name: entry, stack: '?', createdAt: null };
    try { meta = { ...meta, ...JSON.parse(readFileSync(marker, 'utf8')) }; } catch { /* corrupt marker — still list it */ }
    projects.push({ dir, entry, meta });
  }
  return projects;
}

function formatDate(iso) {
  if (!iso) return c.dim('unknown date');
  const d = new Date(iso);
  return c.dim(`${d.toLocaleDateString()} ${d.toLocaleTimeString()}`);
}

function deleteProject(dir, entry) {
  rmSync(dir, { recursive: true, force: true });
  console.log(`  ${c.green('✔')} Deleted ${c.cyan(entry)}`);
}

async function main() {
  const argv    = process.argv.slice(2);
  const listOnly = argv.includes('--list');
  const deleteAll = argv.includes('--all');

  const projects = findScaffoldedProjects();

  console.log('');
  console.log(c.bold('  ┌──────────────────────────────────────────────┐'));
  console.log(c.bold('  │   Livewall Scaffolded Project Cleaner        │'));
  console.log(c.bold('  └──────────────────────────────────────────────┘'));
  console.log('');

  if (projects.length === 0) {
    console.log(`  ${c.dim('No scaffolded projects found in')} ${WORKSPACE_ROOT}\n`);
    return;
  }

  console.log(`  Found ${c.cyan(String(projects.length))} scaffolded project(s) in ${c.dim(WORKSPACE_ROOT)}:\n`);
  projects.forEach((p, i) => {
    const stack = p.meta.stack === 'tanstack' ? 'TanStack' : 'Next.js';
    console.log(`    ${c.dim(`${i + 1})`)} ${c.cyan(p.entry)}  ${c.dim(`[${stack}]`)}  ${formatDate(p.meta.createdAt)}`);
  });
  console.log('');

  if (listOnly) return;

  const rl  = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, res));

  if (deleteAll) {
    const confirm = (await ask(`  ${c.red('Delete ALL')} ${projects.length} project(s)? ${c.dim('[y/N]')}: `)).trim().toLowerCase();
    rl.close();
    if (confirm !== 'y' && confirm !== 'yes') { console.log('\n  Aborted.\n'); return; }
    console.log('');
    for (const p of projects) deleteProject(p.dir, p.entry);
    console.log('');
    return;
  }

  // Interactive picker
  console.log(`  ${c.dim('Enter numbers to delete (comma-separated), "a" for all, or Enter to cancel:')}`);
  const input = (await ask(`  ${c.cyan('Select')}: `)).trim().toLowerCase();
  rl.close();

  if (!input) { console.log('\n  Nothing deleted.\n'); return; }

  let toDelete = [];
  if (input === 'a' || input === 'all') {
    toDelete = projects;
  } else {
    toDelete = input.split(',').map(s => {
      const n = parseInt(s.trim(), 10);
      return (n >= 1 && n <= projects.length) ? projects[n - 1] : null;
    }).filter(Boolean);
  }

  if (toDelete.length === 0) { console.log('\n  Nothing to delete.\n'); return; }

  console.log('');
  console.log(`  About to delete:`);
  for (const p of toDelete) console.log(`    ${c.red('✘')} ${p.entry}`);
  const confirm = (await new Promise((res) => {
    const rl2 = createInterface({ input: process.stdin, output: process.stdout });
    rl2.question(`\n  Confirm? ${c.dim('[y/N]')}: `, (a) => { rl2.close(); res(a); });
  })).trim().toLowerCase();

  if (confirm !== 'y' && confirm !== 'yes') { console.log('\n  Aborted.\n'); return; }

  console.log('');
  for (const p of toDelete) deleteProject(p.dir, p.entry);
  console.log('');
}

main().catch((err) => {
  console.error(`\n  ${c.red('Error:')} ${err.message}\n`);
  process.exit(1);
});
