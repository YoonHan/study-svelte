// Used with playground/01-compiled-output/13-delegation-order.svelte
// Predict the order of the two console lines BEFORE running.
// (console output from a step is printed above that step's report)
//   node tools/mount.mjs playground/01-compiled-output/13-delegation-order.svelte --script labs/01-compiled-output/delegation-order.steps.mjs
export default async (t) => {
	await t.step('click the button', () => t.click('button'));
};
