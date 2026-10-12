// Walk IfElse.svelte through its three branches.
//
//   node tools/mount.mjs playground/03-dom/IfElse.svelte --script labs/03-dom/if.steps.mjs -q
export default async (t) => {
	const first_zero = t.$('p.zero');

	await t.step('n: 0 → 1', () => t.click('button.inc'));
	await t.step('n: 1 → 2', () => t.click('button.inc'));
	await t.step('n: 2 → 1', () => t.click('button.dec'));
	await t.step('n: 1 → 0', () => t.click('button.dec'));
	console.log(`  is <p class="zero"> the same element as at mount? ${t.$('p.zero') === first_zero}`);
	await t.step('n: 0 → -1', () => t.click('button.dec'));
	await t.step('n: -1 → -2', () => t.click('button.dec'));
};
