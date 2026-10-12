// Q2.18, Q2.19, Q2.20 — Who owns a derived, and when is it connected to the graph?
// Predict `reactions` / flags at every checkpoint before running.
// Run: node labs/02-signals/08-derived-ownership.mjs
import { state, derived, render_effect, get, set, flushSync, root, inspect, label } from '../lib/signals.mjs';

console.log('===== Part 1: an unowned derived (created outside any effect) =====');
{
	const count = label(state(0), 'count');
	const d = label(
		derived(() => get(count) * 2),
		'd'
	);

	console.log('\n[1] read once outside any effect:', get(d));
	inspect(count);
	inspect(d);

	set(count, 1);
	console.log('\n[2] after set(count, 1), read again:', get(d));
	inspect(d);

	const destroy = root(() => {
		label(
			render_effect(() => {
				get(d);
			}),
			'fx'
		);
	});
	console.log('\n[3] while an effect reads it');
	inspect(count);
	inspect(d);

	destroy();
	console.log('\n[4] after the effect is destroyed');
	inspect(count);
	inspect(d);
}

console.log('\n===== Part 2: an owned derived that loses its last reader =====');
{
	const s = label(state(0), 's');
	const show = label(state(true), 'show');
	let d;

	const destroy = root(() => {
		d = label(
			derived(() => get(s) + 100),
			'owned'
		);
		label(
			render_effect(() => {
				if (get(show)) get(d);
			}),
			'fx'
		);
	});

	console.log('\n[5] while the effect reads it');
	inspect(s);
	inspect(d);

	flushSync(() => set(show, false));
	console.log('\n[6] after the effect stops reading it');
	inspect(s);
	inspect(d);

	set(s, 5);
	console.log('\n[7] s changed while disconnected; reading d gives', get(d));
	inspect(s);
	inspect(d);

	destroy();
}
