#!/usr/bin/env node
// Clone the Svelte repository (full history) next to this file's parent directory,
// check out the study branch at svelte@5.0.0, and install its dependencies.
//   node tools/setup.mjs
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { SVELTE_REPO } from './paths.mjs';

const TAG = 'svelte@5.0.0';
const BRANCH = 'study/5.0.0';
const run = (cmd, cwd) => {
	console.log(`$ ${cmd}`);
	execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' } });
};

if (!fs.existsSync(SVELTE_REPO)) {
	run(`git clone https://github.com/sveltejs/svelte.git ${JSON.stringify(SVELTE_REPO)}`);
}

const branches = execSync('git branch --list', { cwd: SVELTE_REPO }).toString();
if (!branches.includes(BRANCH)) run(`git switch -c ${BRANCH} ${TAG}`, SVELTE_REPO);

// Svelte 5.0.0 pins pnpm 9 via "packageManager"
run('npx -y pnpm@9.4.0 install --frozen-lockfile', SVELTE_REPO);
run('npx -y pnpm@9.4.0 test signals', SVELTE_REPO);
console.log('\nready. start with curriculum/00-overview.md');
