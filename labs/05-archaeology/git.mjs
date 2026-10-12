// Small helpers shared by the archaeology scripts. All git commands run against
// the checked-out Svelte repo (../../svelte) without touching its working tree.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../svelte');
export const CHANGELOG = 'packages/svelte/CHANGELOG.md';
export const PR_URL = (n) => `https://github.com/sveltejs/svelte/pull/${n}`;

/** Run git in the Svelte repo and return stdout ('' on failure unless `strict`) */
export function git(args, { strict = false } = {}) {
	try {
		return execFileSync('git', ['-C', REPO, ...args], {
			encoding: 'utf-8',
			maxBuffer: 256 * 1024 * 1024,
			stdio: ['ignore', 'pipe', 'pipe']
		});
	} catch (e) {
		if (strict) throw e;
		return '';
	}
}

/** Read a file as it exists at `ref` */
export const show = (ref, file) => git(['show', `${ref}:${file}`]);

/**
 * Parse CHANGELOG.md into entries: { version, line, text, prs[] }.
 * Entries span multiple lines until the next blank line.
 */
export function changelog_entries(ref = 'main') {
	const lines = show(ref, CHANGELOG).split('\n');
	const entries = [];
	let version = null;
	for (let i = 0; i < lines.length; i++) {
		const heading = /^## (\S+)/.exec(lines[i]);
		if (heading) {
			version = heading[1];
			continue;
		}
		if (lines[i].startsWith('- ')) {
			let text = lines[i];
			let j = i + 1;
			while (j < lines.length && lines[j].trim() !== '' && !lines[j].startsWith('- ') && !lines[j].startsWith('#')) {
				text += ' ' + lines[j].trim();
				j++;
			}
			const prs = [...text.matchAll(/\/pull\/(\d+)/g)].map((m) => m[1]);
			entries.push({ version, line: i + 1, text, prs });
		}
	}
	return entries;
}

/**
 * The earliest `svelte@...` tag that contains `commit`.
 * With `prerelease: false` (default) only stable `x.y.z` tags count;
 * with `prerelease: true` tags like `5.0.0-next.153` count too.
 */
export function first_release(commit, { prerelease = false } = {}) {
	const re = prerelease ? /^svelte@\d+\.\d+\.\d+(-next\.\d+)?$/ : /^svelte@\d+\.\d+\.\d+$/;
	const tags = git(['tag', '--contains', commit, '--list', 'svelte@*'])
		.split('\n')
		.filter((t) => re.test(t));
	const parse = (t) => {
		const [, a, b, c, next] = /^svelte@(\d+)\.(\d+)\.(\d+)(?:-next\.(\d+))?$/.exec(t);
		// a prerelease sorts before its release
		return [+a, +b, +c, next === undefined ? Infinity : +next];
	};
	tags.sort((a, b) => {
		const [x, y] = [parse(a), parse(b)];
		return x[0] - y[0] || x[1] - y[1] || x[2] - y[2] || x[3] - y[3];
	});
	return tags[0] ?? null;
}
