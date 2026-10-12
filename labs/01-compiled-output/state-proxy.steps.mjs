// Used with playground/01-compiled-output/04-state-proxy.svelte
//   node tools/mount.mjs playground/01-compiled-output/04-state-proxy.svelte --script labs/01-compiled-output/state-proxy.steps.mjs
export default async (t) => {
	const [reassign, mutate] = t.target.querySelectorAll('button');
	await t.step('mutate (b.n += 1, c.push(4), e.n += 1)', () => mutate.click());
	await t.step('reassign (d = 1, e = {n: 1}, f = {n: 1})', () => reassign.click());
	await t.step('mutate again', () => mutate.click());
};
