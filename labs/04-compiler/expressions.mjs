// For every `{expression}` / attribute expression in the template, print the metadata
// that phase 2 attached to it. Phase 3 uses exactly these flags to decide whether an
// expression is set once, grouped into the shared template_effect, or given its own effect.
//
//   node labs/04-compiler/expressions.mjs playground/04-compiler/TextGrouping.svelte
import { walk } from '../../svelte/packages/svelte/node_modules/zimmerframe/src/walk.js';
import { run_phases } from './_internals.mjs';

const file = process.argv[2];
if (!file) {
	console.error('usage: node labs/04-compiler/expressions.mjs <file.svelte>');
	process.exit(1);
}

const { source, analysis } = run_phases(file);
const rows = [];

walk(analysis.template.ast, null, {
	_(node, { next, path }) {
		const meta = node.metadata?.expression;
		if (meta && (node.type === 'ExpressionTag' || node.type === 'Attribute')) {
			rows.push({
				node: node.type + (node.type === 'Attribute' ? `[${node.name}]` : ''),
				in: path.findLast((n) => n.type === 'RegularElement')?.name ?? '(root)',
				code: source.slice(node.start, node.end).replace(/\s+/g, ' ').slice(0, 40),
				has_state: meta.has_state,
				has_call: meta.has_call,
				dependencies: [...meta.dependencies].map((b) => `${b.node.name}:${b.kind}`).join(', ')
			});
		}
		next();
	}
});

console.table(rows);
