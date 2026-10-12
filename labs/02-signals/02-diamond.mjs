// Q2.5 — The diamond problem.
//
//        a
//       / \
//      b   c        b = a * 2, c = a * 3
//       \ /
//      effect       logs `${b}+${c}`
//
// A naive push-based system would run the effect once for b's change and once for
// c's change, and one of those runs would see an inconsistent pair ("glitch").
// Predict the `seen` array and the computation counts before running.
// Run: node labs/02-signals/02-diamond.mjs
import { state, derived, effect, get, set, flushSync, root } from '../lib/signals.mjs';

const a = state(1);
const seen = [];
const computations = { b: 0, c: 0 };

const destroy = root(() => {
	const b = derived(() => {
		computations.b++;
		return get(a) * 2;
	});
	const c = derived(() => {
		computations.c++;
		return get(a) * 3;
	});
	effect(() => {
		seen.push(`${get(b)}+${get(c)}`);
	});
});

flushSync();
flushSync(() => set(a, 2));
flushSync(() => set(a, 3));

console.log({ seen, computations });

// Try this next: add a third derived `e = b + c` and make the effect read only `e`.
// Does anything about the counts change? Why?
destroy();
