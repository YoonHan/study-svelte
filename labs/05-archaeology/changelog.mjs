#!/usr/bin/env node
// Search packages/svelte/CHANGELOG.md for a keyword or a PR number.
//
//   node labs/05-archaeology/changelog.mjs batch
//   node labs/05-archaeology/changelog.mjs "experimental.async"
//   node labs/05-archaeology/changelog.mjs '#15844'
//   node labs/05-archaeology/changelog.mjs derived --since 5.20.0 --until 5.30.0
//   node labs/05-archaeology/changelog.mjs derived --ref svelte@5.0.0   (CHANGELOG as of another ref)
import { parseArgs } from 'node:util';
import { changelog_entries, PR_URL } from './git.mjs';

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		ref: { type: 'string', default: 'main' },
		since: { type: 'string' },
		until: { type: 'string' },
		prerelease: { type: 'boolean' }
	}
});

const query = positionals.join(' ');
if (!query) {
	console.error('usage: node labs/05-archaeology/changelog.mjs <keyword | #PR> [--since x.y.z] [--until x.y.z] [--ref <git ref>] [--prerelease]');
	process.exit(1);
}

const version_key = (v) => {
	const m = /^(\d+)\.(\d+)\.(\d+)(?:-next\.(\d+))?$/.exec(v ?? '');
	// prereleases sort before their release
	return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? Infinity : +m[4]] : null;
};
const cmp = (a, b) => {
	for (let i = 0; i < 4; i++) if (a[i] !== b[i]) return a[i] - b[i];
	return 0;
};

const pr = /^#?(\d+)$/.exec(query)?.[1];
const needle = query.toLowerCase();

const hits = changelog_entries(values.ref).filter((e) => {
	const key = version_key(e.version);
	if (!key) return false;
	if (!values.prerelease && key[3] !== Infinity) return false;
	if (values.since && cmp(key, version_key(values.since)) < 0) return false;
	if (values.until && cmp(key, version_key(values.until)) > 0) return false;
	return pr ? e.prs.includes(pr) : e.text.toLowerCase().includes(needle);
});

for (const e of hits.reverse()) {
	const text = e.text.replace(/^- /, '').replace(/\s*\(\[#\d+\]\([^)]*\)(?:,\s*\[#\d+\]\([^)]*\))*\)\s*$/, '');
	console.log(`${e.version.padEnd(10)} ${text}`);
	for (const n of e.prs) console.log(`${''.padEnd(10)} ↳ ${PR_URL(n)}`);
}
console.error(`\n${hits.length} entr${hits.length === 1 ? 'y' : 'ies'} (oldest first, CHANGELOG at ${values.ref})`);
