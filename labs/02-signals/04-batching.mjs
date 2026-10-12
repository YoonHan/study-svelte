// Q2.12 — Several writes, one flush.
// Predict before running:
//   1. how many times the effect runs for the three `set` calls
//   2. what `get(double)` returns before the microtask runs, and whether that
//      read computes the derived
// Run: node labs/02-signals/04-batching.mjs
import { state, derived, effect, get, set, tick, root } from '../lib/signals.mjs';

const n = state(0);
let effect_runs = 0;

const double = derived(() => {
	console.log('  (derived computed)');
	return get(n) * 2;
});

const destroy = root(() => {
	effect(() => {
		effect_runs++;
		console.log(`  effect sees n=${get(n)} double=${get(double)}`);
	});
});

await tick();
console.log('after the first tick: effect_runs =', effect_runs);

console.log('\nset(n, 1); set(n, 2); set(n, 3);');
set(n, 1);
set(n, 2);
set(n, 3);

console.log('synchronously after the sets: effect_runs =', effect_runs);
console.log('reading get(double) now...');
console.log('get(double) =', get(double));

await Promise.resolve();
console.log('after one microtask: effect_runs =', effect_runs);

destroy();
