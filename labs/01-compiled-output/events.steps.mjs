// Used with playground/01-compiled-output/07-events.svelte
// Inspect how handlers are attached before and after clicking.
//   node tools/mount.mjs playground/01-compiled-output/07-events.svelte --script labs/01-compiled-output/events.steps.mjs
export default async (t) => {
	const buttons = [...t.target.querySelectorAll('button')];

	console.log('\n[handlers stored on the elements]');
	for (const [i, button] of buttons.entries()) {
		const handler = button.__click;
		const shape = Array.isArray(handler)
			? `[${handler.map((x) => (typeof x === 'function' ? `fn ${x.name || '(anonymous)'}` : typeof x)).join(', ')}]`
			: typeof handler;
		console.log(`  button #${i} (${button.textContent}): __click = ${shape}`);
	}

	await t.step('click "referenced handler"', () => buttons[0].click());
	await t.step('click "mutates a plain let"', () => buttons[3].click());
	await t.step('click "inline arrow"', () => buttons[1].click());
};
