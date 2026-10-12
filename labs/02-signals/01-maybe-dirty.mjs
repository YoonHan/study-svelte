// Q2.4 — A derived whose value does not change.
// `parity` only depends on whether `count` is odd or even, and the effect only reads `parity`.
// Predict before running:
//   1. the flags of `parity` and `fx` right after `set(count, 2)` (before flushSync)
//   2. how many times the effect runs in total, and how many times `parity` is computed
// Run: node labs/02-signals/01-maybe-dirty.mjs
import { state, derived, effect, get, set, flushSync, root, inspect, label } from '../lib/signals.mjs';

const count = label(state(0), 'count');
let parity;
let fx;
let effect_runs = 0;
let parity_computations = 0;

const destroy = root(() => {
	parity = label(
		derived(() => {
			parity_computations++;
			return get(count) % 2;
		}),
		'parity'
	);
	fx = label(
		effect(() => {
			effect_runs++;
			get(parity);
		}),
		'fx'
	);
});

flushSync();
console.log('--- after the first flush ---');
inspect(count);
inspect(parity);
inspect(fx);

set(count, 2);
console.log('\n--- after set(count, 2), before flushSync() ---');
inspect(count);
inspect(parity);
inspect(fx);

flushSync();
console.log('\n--- after flushSync() ---');
inspect(parity);
inspect(fx);
console.log({ effect_runs, parity_computations });

// Try this next: change `set(count, 2)` to `set(count, 3)` and compare.
destroy();
