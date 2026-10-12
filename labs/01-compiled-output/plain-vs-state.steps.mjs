// Used with playground/01-compiled-output/04b-plain-vs-state.svelte
// Predict the output of each step BEFORE running:
//   node tools/mount.mjs playground/01-compiled-output/04b-plain-vs-state.svelte --script labs/01-compiled-output/plain-vs-state.steps.mjs
export default async (t) => {
	await t.step('click "both +1"', () => t.click('button'));
	await t.step('click "both +1" again', () => t.click('button'));
};
