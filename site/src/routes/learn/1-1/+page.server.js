import { load_svelte_source } from '#lib/server/code.js';
import { load_counter } from '#lib/server/counter.js';

export async function load() {
	const [template, constants, reconciler, attributes, regular_element, fragment] =
		await Promise.all([
			load_svelte_source('internal/client/dom/template.js'),
			load_svelte_source('constants.js'),
			load_svelte_source('internal/client/dom/reconciler.js'),
			load_svelte_source('internal/client/dom/elements/attributes.js'),
			load_svelte_source('compiler/phases/3-transform/client/visitors/RegularElement.js'),
			load_svelte_source('compiler/phases/3-transform/client/visitors/Fragment.js')
		]);
	return {
		...(await load_counter()),
		template,
		// sources shown when the reader points at a cited name (see Ref.svelte)
		refs: { constants, reconciler, attributes, regular_element, fragment }
	};
}
