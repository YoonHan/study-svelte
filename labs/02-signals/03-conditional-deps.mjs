// Q2.7, Q2.8 — Dependencies are re-collected on every run.
// Part 1: the effect reads `a` or `b` depending on `flag`.
// Part 2: the effect reads the same signal twice.
// Predict `deps` / `reactions` at each checkpoint before running.
// Run: node labs/02-signals/03-conditional-deps.mjs
import { state, effect, get, set, flushSync, root, inspect, label } from '../lib/signals.mjs';

console.log('===== Part 1: conditional dependencies =====');
{
	const flag = label(state(true), 'flag');
	const a = label(state('a0'), 'a');
	const b = label(state('b0'), 'b');
	let fx;
	let runs = 0;

	const destroy = root(() => {
		fx = label(
			effect(() => {
				runs++;
				get(flag) ? get(a) : get(b);
			}),
			'fx'
		);
	});

	flushSync();
	console.log('\n[checkpoint 1] after the first run');
	inspect(fx);
	inspect(a);
	inspect(b);

	flushSync(() => set(b, 'b1'));
	console.log('\n[checkpoint 2] after set(b)  runs =', runs);

	flushSync(() => set(flag, false));
	console.log('\n[checkpoint 3] after set(flag, false)');
	inspect(fx);
	inspect(a);
	inspect(b);

	flushSync(() => set(a, 'a1'));
	console.log('\n[checkpoint 4] after set(a)  runs =', runs);

	destroy();
}

console.log('\n===== Part 2: reading the same signal twice =====');
{
	const count = label(state(0), 'count');
	let fx;

	const destroy = root(() => {
		fx = label(
			effect(() => {
				get(count);
				get(count);
			}),
			'fx'
		);
	});

	flushSync();
	inspect(count);
	inspect(fx);

	flushSync(() => set(count, 1));
	inspect(count);
	inspect(fx);

	destroy();
}
