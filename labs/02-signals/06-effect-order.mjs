// Q2.15 — In which order do effects run?
// `effect` = what `$effect` compiles to (deferred), `render_effect` = what
// `$effect.pre` and template expressions use (runs synchronously on creation).
// Write down the full log you expect for each phase BEFORE running.
// Run: node labs/02-signals/06-effect-order.mjs
import { state, effect, render_effect, get, set, flushSync, root } from '../lib/signals.mjs';

const n = state(0);
const log = (message) => console.log(message, get(n));

const destroy = root(() => {
	effect(() => log('A  effect'));
	render_effect(() => log('B  render_effect'));
	effect(() => {
		log('C  effect');
		render_effect(() => log('   C.1 render_effect (child of C)'));
		effect(() => log('   C.2 effect (child of C)'));
	});
	render_effect(() => {
		log('D  render_effect');
		effect(() => log('   D.1 effect (child of D)'));
		render_effect(() => log('   D.2 render_effect (child of D)'));
	});
	console.log('--- end of root fn');
});

console.log('\n=== phase 1: first flushSync() ===');
flushSync();

console.log('\n=== phase 2: flushSync(() => set(n, 1)) ===');
flushSync(() => set(n, 1));

destroy();
