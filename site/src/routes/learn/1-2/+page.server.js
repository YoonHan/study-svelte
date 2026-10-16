import { load_code } from '#lib/server/code.js';

export async function load() {
	return {
		source: await load_code('playground/01-compiled-output/09-anchors.svelte'),
		compiled: await load_code('scratch/compiled/09-anchors.compiled.js')
	};
}
