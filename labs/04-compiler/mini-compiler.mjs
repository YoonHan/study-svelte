// A ~60-line toy version of what phase 2 + phase 3 do for `$state`, built with the
// same three libraries Svelte uses: acorn (parse), zimmerframe (walk), esrap (print).
//
//   node labs/04-compiler/mini-compiler.mjs
//
// It already handles:  `let x = $state(v)`  ->  `let x = $.state(v)`
//                      reads of `x`         ->  `$.get(x)`
// Your job (Q4.17) is to extend it. See the TODOs below.
import * as acorn from '../../svelte/packages/svelte/node_modules/acorn/dist/acorn.mjs';
import { walk } from '../../svelte/packages/svelte/node_modules/zimmerframe/src/walk.js';
import { print } from '../../svelte/packages/svelte/node_modules/esrap/src/index.js';

const input = `
let count = $state(0);
let other = 1;

console.log(count, other);

function log(count) {
	// this \`count\` is a parameter, not the state above
	console.log(count);
}

count = count + 1;
count++;
`;

const ast = acorn.parse(input, { ecmaVersion: 'latest', sourceType: 'module' });

// ---- "analyze": find state declarations (top-level only, no real scopes) -------------
/** @type {Set<string>} */
const state_names = new Set();
for (const node of ast.body) {
	if (node.type !== 'VariableDeclaration') continue;
	for (const d of node.declarations) {
		if (d.init?.type === 'CallExpression' && d.init.callee.type === 'Identifier' && d.init.callee.name === '$state') {
			state_names.add(d.id.name);
		}
	}
}

// ---- "transform" ---------------------------------------------------------------------
const call = (name, ...args) => ({
	type: 'CallExpression',
	callee: { type: 'Identifier', name },
	arguments: args,
	optional: false
});

const output = walk(ast, { declared_here: null }, {
	VariableDeclarator(node, { visit }) {
		if (node.id.type === 'Identifier' && state_names.has(node.id.name)) {
			// keep the declared identifier as-is; wrap the initial value
			return { ...node, init: call('$.state', ...node.init.arguments.map((a) => visit(a))) };
		}
	},
	Identifier(node, { path }) {
		const parent = path.at(-1);
		// skip property keys like `console.log`'s `log`
		if (parent?.type === 'MemberExpression' && parent.property === node && !parent.computed) return;
		if (state_names.has(node.name)) {
			return call('$.get', node);
		}
	}
	// TODO 1: AssignmentExpression  `count = v`  ->  `$.set(count, v)`
	//         (careful: the left side must NOT become `$.get(count)`)
	// TODO 2: UpdateExpression      `count++`    ->  `$.update(count)`
	// TODO 3: shadowing: inside `function log(count)`, `count` is a parameter and must
	//         not be transformed. Svelte solves this with Scope objects (phases/scope.js)
	//         and by deleting entries from `state.transform` in the client `_` visitor.
});

console.log(print(output).code);
