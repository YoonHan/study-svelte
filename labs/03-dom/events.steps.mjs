// Event delegation experiments for Events.svelte.
//
//   node tools/mount.mjs playground/03-dom/Events.svelte --script labs/03-dom/events.steps.mjs -q
//   node tools/mount.mjs playground/03-dom/Events.svelte --script labs/03-dom/events.steps.mjs -q --props '{"mode":"on"}'
//
// The handlers print with console.log; read those lines, not the mutation log.
// Lines printed during a step appear ABOVE that step's ── header.
export default async (t) => {
	const where = (sel) => console.log(`\n  click ${sel}`);

	await t.step('who owns the listeners?', () => {
		for (const sel of ['button.hoisted', 'button.plain', 'input.field', 'button.item']) {
			const el = t.$(sel);
			const own = Object.keys(el).filter((k) => k.startsWith('__'));
			console.log(`  ${sel}: own __ properties = ${JSON.stringify(own)}, __click is ${Array.isArray(el.__click) ? 'an array' : typeof el.__click}`);
		}
	});

	await t.step('click: plain button', () => {
		where('button.plain');
		t.click('button.plain');
	});

	await t.step('click: stop button', () => {
		where('button.stop');
		t.click('button.stop');
	});

	await t.step('click: item y', () => {
		where('button.item (2nd)');
		t.target.querySelectorAll('button.item')[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
	});

	await t.step('focus: input (focus does not bubble)', () => {
		console.log('\n  focus input.field');
		t.$('input.field').dispatchEvent(new FocusEvent('focus'));
	});

};
