#!/usr/bin/env node
// Find a function (or class method) in two versions of the Svelte source and
// summarise how it moved: file, line, length, and the commits that touched it in between.
//
//   node labs/05-archaeology/compare-fn.mjs get
//   node labs/05-archaeology/compare-fn.mjs flush_queued_root_effects
//   node labs/05-archaeology/compare-fn.mjs is_dirty --from svelte@5.0.0 --to main
//
// If a name exists only on one side, it was probably renamed, inlined or moved
// into a class. Try `git -C svelte log --oneline -S '<name>' svelte@5.0.0..main`.
import { parseArgs } from 'node:util';
import { git, show } from './git.mjs';

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		from: { type: 'string', default: 'svelte@5.0.0' },
		to: { type: 'string', default: 'main' },
		path: { type: 'string', default: 'packages/svelte/src' }
	}
});

const name = positionals[0];
if (!name) {
	console.error('usage: node labs/05-archaeology/compare-fn.mjs <name> [--from ref] [--to ref] [--path dir]');
	process.exit(1);
}

const escaped = name.replace(/^#/, '').replace(/[$]/g, '\\$&');
// `function name(`, `export function name(`, or a class method `  name(...) {` / `  #name(...) {`
const pattern = `^(export )?(async )?function\\*? ${escaped}\\(|^[[:space:]]+(static )?(async )?#?${escaped}\\(.*\\) \\{$`;

/** @returns {{ file: string, line: number, length: number }[]} */
function locate(ref) {
	const out = git(['grep', '-n', '-E', pattern, ref, '--', values.path]);
	return out
		.split('\n')
		.filter(Boolean)
		.filter((l) => !l.includes('.d.ts:') && !l.includes('.test.'))
		.map((l) => {
			const [, file, line] = /^[^:]+:([^:]+):(\d+):/.exec(l);
			const lines = show(ref, file).split('\n');
			const start = Number(line) - 1;
			const indent = /^\s*/.exec(lines[start])[0];
			let end = start;
			while (end < lines.length && lines[end] !== `${indent}}`) end++;
			return { file, line: Number(line), length: end - start + 1 };
		});
}

for (const ref of [values.from, values.to]) {
	const hits = locate(ref);
	console.log(`\n${ref}`);
	if (hits.length === 0) console.log('  (not found as a function or method)');
	for (const h of hits) console.log(`  ${h.file}:${h.line}  (${h.length} lines)`);
}

const commits = git(['log', '--oneline', '-S', name, `${values.from}..${values.to}`, '--', values.path])
	.split('\n')
	.filter(Boolean);
console.log(`\ncommits between ${values.from} and ${values.to} that add/remove the string "${name}" (git log -S): ${commits.length}`);
for (const c of commits.slice(0, 20)) console.log(`  ${c}`);
if (commits.length > 20) console.log(`  ... and ${commits.length - 20} more`);

const to_hits = locate(values.to);
if (to_hits.length === 1) {
	const { file, line, length } = to_hits[0];
	const touched = git(['log', '--format=%h %s', `-L${line},${line + length - 1}:${file}`, `${values.from}..${values.to}`, '--no-patch']).split('\n').filter(Boolean);
	console.log(`\ncommits that changed the current body (git log -L ${line},${line + length - 1}:${file}): ${touched.length}`);
	for (const c of touched.slice(0, 20)) console.log(`  ${c}`);
	if (touched.length > 20) console.log(`  ... and ${touched.length - 20} more`);
}
