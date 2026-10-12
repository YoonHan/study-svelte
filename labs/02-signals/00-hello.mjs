// The smallest possible signal graph: one source, one derived, one effect.
// Run: node labs/02-signals/00-hello.mjs
import { state, derived, effect, get, set, flushSync, root, inspect, label } from '../lib/signals.mjs';

const count = label(state(0), 'count');
const double = label(derived(() => get(count) * 2), 'double');
let fx;

const destroy = root(() => {
	fx = label(
		effect(() => console.log(`effect ran: count=${get(count)} double=${get(double)}`)),
		'effect'
	);
});

console.log('\n--- after root() (has the effect run yet?) ---');
inspect(count);
inspect(double);
inspect(fx);

flushSync();
console.log('\n--- after first flushSync() ---');
inspect(count);
inspect(double);
inspect(fx);

set(count, 1);
console.log('\n--- after set(count, 1), before flushSync() ---');
inspect(count);
inspect(double);
inspect(fx);

flushSync();
console.log('\n--- after flushSync() ---');
inspect(double);

destroy();
