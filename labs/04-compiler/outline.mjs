// Print the template AST produced by phase 1 as an indented tree, with source offsets.
// Easier to scan than `tools/compile.mjs --ast` when you only care about the shape.
//
//   node labs/04-compiler/outline.mjs playground/04-compiler/Parse.svelte
//   node labs/04-compiler/outline.mjs <file> --js     also descend into JS expressions
import fs from 'node:fs';
import path from 'node:path';
import { state, parse } from './_internals.mjs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
if (!file) {
	console.error('usage: node labs/04-compiler/outline.mjs <file.svelte> [--js]');
	process.exit(1);
}
const show_js = args.includes('--js');

const filename = path.resolve(file);
const source = fs.readFileSync(filename, 'utf-8');
state.reset(source, { filename });
const ast = parse(source);

const snippet = (n) =>
	typeof n.start === 'number' ? JSON.stringify(source.slice(n.start, n.end)).slice(0, 50) : '';

/** template node types that own child fragments, and where those live */
const FRAGMENT_KEYS = ['fragment', 'consequent', 'alternate', 'body', 'fallback', 'pending', 'then', 'catch'];

function print(node, depth) {
	const pad = '  '.repeat(depth);
	const name = node.name ? ` <${node.name}>` : '';
	console.log(`${pad}${node.type}${name}  [${node.start}-${node.end}] ${snippet(node)}`);

	if (show_js && node.expression) print_js(node.expression, depth + 1);

	for (const key of FRAGMENT_KEYS) {
		const child = node[key];
		if (child?.type === 'Fragment') {
			console.log(`${pad}  .${key}:`);
			for (const n of child.nodes) print(n, depth + 2);
		}
	}
}

function print_js(node, depth) {
	console.log(`${'  '.repeat(depth)}(js) ${node.type}  [${node.start}-${node.end}] ${snippet(node)}`);
}

console.log(`instance script: ${ast.instance ? `Program with ${ast.instance.content.body.length} statements` : 'none'}`);
console.log(`module script:   ${ast.module ? 'yes' : 'none'}`);
console.log(`style:           ${ast.css ? 'yes' : 'none'}`);
console.log('template:');
for (const n of ast.fragment.nodes) print(n, 1);
