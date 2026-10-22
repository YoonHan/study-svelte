import { highlight, load_svelte_source } from '#lib/server/code.js';
import { load_counter } from '#lib/server/counter.js';
import { VANILLA_SOURCE } from '#lib/counter.js';

export async function load() {
	const [events, render] = await Promise.all([
		load_svelte_source('internal/client/dom/elements/events.js'),
		load_svelte_source('internal/client/render.js')
	]);
	return {
		...(await load_counter()),
		vanilla: {
			file: 'vanilla-counter.js',
			lines: await highlight(VANILLA_SOURCE.replace(/\n$/, ''), 'javascript')
		},
		// sources shown when the reader points at a cited name (see Ref.svelte)
		refs: { events, render }
	};
}
