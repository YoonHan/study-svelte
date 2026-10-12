// Print what phase 2 (analyze) learned about every declared name.
//
//   node labs/04-compiler/bindings.mjs playground/04-compiler/StateKinds.svelte
//   node labs/04-compiler/bindings.mjs <file> --all      also show template scopes ({#each}, snippets, ...)
//   node labs/04-compiler/bindings.mjs <file> --legacy   force runes: false
import { run_phases } from './_internals.mjs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
if (!file) {
	console.error('usage: node labs/04-compiler/bindings.mjs <file.svelte> [--all] [--legacy]');
	process.exit(1);
}

const { analysis, warnings } = run_phases(file, args.includes('--legacy') ? { runes: false } : {});

console.log('analysis.runes      =', analysis.runes);
console.log('analysis.immutable  =', analysis.immutable);
console.log('analysis.needs_props=', analysis.needs_props);
console.log('analysis.css.hash   =', JSON.stringify(analysis.css.hash));

/** @param {string} title @param {any} scope */
function print_scope(title, scope) {
	const rows = [];
	for (const [name, b] of scope.declarations) {
		rows.push({
			name,
			kind: b.kind,
			declaration_kind: b.declaration_kind,
			reassigned: b.reassigned,
			mutated: b.mutated,
			references: b.references.length,
			initial: b.initial?.type ?? null
		});
	}
	console.log(`\n=== ${title} (function_depth=${scope.function_depth}) ===`);
	if (rows.length) console.table(rows);
	else console.log('(no declarations)');
}

print_scope('module scope', analysis.module.scope);
print_scope('instance scope', analysis.instance.scope);

if (args.includes('--all')) {
	const seen = new Set([analysis.module.scope, analysis.instance.scope]);
	for (const [node, scope] of analysis.template.scopes) {
		if (seen.has(scope) || scope.declarations.size === 0) continue;
		seen.add(scope);
		print_scope(`template scope created by <${node.type}>`, scope);
	}
}

if (warnings.length) {
	console.log('\n=== warnings ===');
	for (const w of warnings) console.log(`${w.code}: ${w.message}`);
}
