// Drive Await.svelte through the pending / then / catch states.
//
//   node tools/mount.mjs playground/03-dom/Await.svelte --script labs/03-dom/await.steps.mjs -q
//
// NOTE: tools/mount.mjs calls flushSync() after every step, and flushSync() also runs
// Svelte's queued micro tasks synchronously. To observe the *natural* browser timing,
// the steps below wait for a macrotask (setTimeout) before the step ends, so by the
// time flushSync() runs everything has already settled on its own.
import { pending } from '../../playground/03-dom/deferred.js';

const settle = () => new Promise((r) => setTimeout(r, 0));

export default async (t) => {
	await t.step('resolve the first promise', async () => {
		pending[0].resolve('first');
		await settle();
	});

	await t.step('new deferred promise (natural timing)', async () => {
		t.click('button.deferred');
		await settle();
	});

	await t.step('reject it', async () => {
		pending.at(-1).reject('boom');
		await settle();
	});

	await t.step('already-resolved promise (natural timing)', async () => {
		t.click('button.resolved');
		await settle();
	});

	await t.step('already-resolved promise again (flushSync timing: no settle)', () => {
		t.click('button.resolved');
	});

	await t.step('non-promise value', async () => {
		t.click('button.plain');
		await settle();
	});
};
