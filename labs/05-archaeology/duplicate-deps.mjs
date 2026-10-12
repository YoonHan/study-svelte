// How many times does a source appear in `deps` when one reaction reads it repeatedly?
// Run against the checked-out 5.0.0 runtime, then find the commit that changed this behaviour.
// Run: node labs/05-archaeology/duplicate-deps.mjs
import { state, derived, effect, get, set, flushSync, root, inspect, label } from '../lib/signals.mjs';

const count = label(state(1), 'count');
const other = label(state(10), 'other');

// a derived that reads `count` three times and `other` once
const sum = label(
	derived(() => get(count) + get(count) + get(other) + get(count)),
	'sum'
);
let fx;

const destroy = root(() => {
	fx = label(
		effect(() => {
			// the effect reads `sum` twice
			get(sum);
			get(sum);
		}),
		'effect'
	);
});

flushSync();
inspect(sum);
inspect(fx);
inspect(count);

set(count, 2);
flushSync();
console.log('\n--- after set(count, 2) ---');
inspect(sum);
inspect(count);

destroy();
