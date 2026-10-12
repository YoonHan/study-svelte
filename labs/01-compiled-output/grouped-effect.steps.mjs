// Used with playground/01-compiled-output/12-grouped-effect.svelte
// Before running, predict: when only `a` changes, which set_text calls run,
// which DOM text nodes are written, and is expensive() evaluated?
//   node tools/mount.mjs playground/01-compiled-output/12-grouped-effect.svelte --script labs/01-compiled-output/grouped-effect.steps.mjs
export default async (t) => {
	await t.step('a++', () => t.click('button.a'));
	await t.step('b++', () => t.click('button.b'));
};
