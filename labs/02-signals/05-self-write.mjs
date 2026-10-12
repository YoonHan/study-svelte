// Q2.13, Q2.14 — Effects that write to state.
// Predict the number of runs in each case before running.
// Run: node labs/02-signals/05-self-write.mjs
// Tip: `node --conditions=development labs/02-signals/05-self-write.mjs` turns on Svelte's
//      DEV mode, which prints longer error messages.
import { state, effect, get, set, flushSync, root } from '../lib/signals.mjs';

console.log('===== Case 1: read, then write, with a guard =====');
{
	const n = state(0);
	let runs = 0;
	const destroy = root(() => {
		effect(() => {
			runs++;
			if (get(n) < 3) set(n, get(n) + 1);
		});
	});
	flushSync();
	console.log({ runs, n: get(n) });
	destroy();
}

console.log('\n===== Case 2: read, then write, without a guard =====');
{
	const n = state(0);
	let runs = 0;
	const destroy = root(() => {
		effect(() => {
			runs++;
			set(n, get(n) + 1);
		});
	});
	try {
		flushSync();
	} catch (error) {
		console.log('threw:', error.message.split('\n')[0]);
	}
	// Is this number what you expected from reading `infinite_loop_guard`?
	console.log({ runs });
	destroy();
}

console.log('\n===== Case 3: write a constant first, then read =====');
{
	const n = state(0);
	let runs = 0;
	const destroy = root(() => {
		effect(() => {
			runs++;
			if (runs > 10) return; // safety net
			set(n, 5);
			get(n);
		});
	});
	flushSync();
	console.log({ runs });
	destroy();
}
