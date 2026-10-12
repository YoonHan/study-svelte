// Q2.24 — Reactive arrays and `length`.
// Predict which effects re-run at each step before running.
// Run: node labs/02-signals/11-proxy-array.mjs
import { effect, flushSync, root, proxy } from '../lib/signals.mjs';

const arr = proxy([1, 2]);
const runs = { reads_length: 0, reads_first: 0, reads_last: 0 };

const destroy = root(() => {
	effect(() => {
		runs.reads_length++;
		arr.length;
	});
	effect(() => {
		runs.reads_first++;
		arr[0];
	});
	effect(() => {
		runs.reads_last++;
		arr[arr.length - 1];
	});
});
flushSync();

const step = (label, fn) => {
	flushSync(fn);
	console.log(label.padEnd(22), JSON.stringify(runs), '→', JSON.stringify(arr));
};

step('initial', () => {});
step('arr.push(3)', () => arr.push(3));
step('arr[0] = 1 (same)', () => (arr[0] = 1));
step('arr[5] = 6 (hole)', () => (arr[5] = 6));
step('arr.length = 0', () => (arr.length = 0));

destroy();
