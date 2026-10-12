// Q2.21 — Writing to state from inside a derived.
// Predict which of the three reads throws before running.
// Run: node labs/02-signals/09-unsafe-mutation.mjs
import { state, derived, effect, get, set, untrack, flushSync, root } from '../lib/signals.mjs';

const other = state(0);

const destroy = root(() => {
	const writes_outer_state = derived(() => {
		set(other, 1);
		return 'writes_outer_state';
	});

	const writes_local_state = derived(() => {
		const local = state(0);
		set(local, 5);
		return untrack(() => get(local));
	});

	const reads_local_state = derived(() => {
		const local = state(0);
		return get(local);
	});

	effect(() => {
		for (const d of [writes_outer_state, writes_local_state, reads_local_state]) {
			try {
				console.log('ok   :', get(d));
			} catch (error) {
				console.log('threw:', error.message.split('\n')[0]);
			}
		}
	});
});

flushSync();
destroy();

// Bonus: the same `writes_outer_state` derived, but read outside of root()/effects.
const outside = derived(() => {
	set(other, 2);
	return 'outside';
});
try {
	console.log('\nbonus ok   :', get(outside), '/ other =', get(other));
} catch (error) {
	console.log('\nbonus threw:', error.message.split('\n')[0]);
}
