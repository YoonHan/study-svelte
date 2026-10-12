// Used with playground/01-compiled-output/08-blocks.svelte
// Watch which nodes are inserted/removed and where the anchor comments sit.
//   node tools/mount.mjs playground/01-compiled-output/08-blocks.svelte --script labs/01-compiled-output/blocks.steps.mjs
export default async (t) => {
	await t.step('toggle → show = false', () => t.click('button'));
	await t.step('toggle → show = true', () => t.click('button'));
};
