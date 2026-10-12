// Q2.22, Q2.23 — Deeply reactive objects (`$state({...})` compiles to `proxy(...)`).
// Predict every line of output before running.
// Run: node labs/02-signals/10-proxy-object.mjs
import { effect, flushSync, root, proxy } from '../lib/signals.mjs';
import { STATE_SYMBOL } from '../../svelte/packages/svelte/src/internal/client/constants.js';

const raw = { a: 1, nested: { b: 2 } };
const p = proxy(raw);

p.a = 10;
console.log('raw.a =', raw.a, '/ p.a =', p.a);
console.log('p.nested === raw.nested ?', p.nested === raw.nested);
console.log('proxy(p) === p ?', proxy(p) === p);
console.log('p[STATE_SYMBOL] === raw ?', p[STATE_SYMBOL] === raw);

const runs = { reads_a: 0, reads_nested_b: 0, reads_keys: 0 };

const destroy = root(() => {
	effect(() => {
		runs.reads_a++;
		p.a;
	});
	effect(() => {
		runs.reads_nested_b++;
		p.nested.b;
	});
	effect(() => {
		runs.reads_keys++;
		Object.keys(p);
	});
});
flushSync();

const step = (label, fn) => {
	flushSync(fn);
	console.log(label.padEnd(26), JSON.stringify(runs));
};

console.log();
step('initial', () => {});
step('p.nested.b = 3', () => (p.nested.b = 3));
step('p.c = 1 (new key)', () => (p.c = 1));
step('p.a = 10 (same value)', () => (p.a = 10));
step('p.nested = { b: 3 }', () => (p.nested = { b: 3 }));
step('delete p.c', () => delete p.c);

destroy();
