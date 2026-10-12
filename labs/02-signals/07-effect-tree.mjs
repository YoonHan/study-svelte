// Q2.16, Q2.17 — The effect tree, teardown, and re-creation of children.
// Predict the order of "run" / "teardown" lines for the `set` and for `destroy()`.
// Run: node labs/02-signals/07-effect-tree.mjs
import { state, effect, get, set, flushSync, root, flags } from '../lib/signals.mjs';

/** Walk an effect subtree through first/next pointers and print it */
function print_tree(effect, depth = 0) {
	console.log(`${'  '.repeat(depth)}- ${effect.fn?.name || '(anonymous)'} [${flags(effect).join(' | ')}]`);
	for (let child = effect.first; child !== null; child = child.next) {
		print_tree(child, depth + 1);
	}
}

const n = state(0);
let parent_effect;

const destroy = root(() => {
	parent_effect = effect(function parent() {
		const v = get(n);
		console.log(`parent run (n=${v})`);

		effect(function child() {
			console.log(`  child run (n=${v})`);
			return () => console.log(`  child teardown (n=${v})`);
		});

		effect(function once() {
			console.log(`  once run`);
		});

		return () => console.log(`parent teardown (n=${v})`);
	});
});

flushSync();
console.log('\n--- tree after the first flush (starting from the root effect) ---');
print_tree(parent_effect.parent);

console.log('\n--- set(n, 1) ---');
const old_child = parent_effect.first;
flushSync(() => set(n, 1));
console.log('is the child the same object as before?', parent_effect.first === old_child);
console.log('flags of the old child:', flags(old_child).join(' | '));

console.log('\n--- destroy() ---');
destroy();
