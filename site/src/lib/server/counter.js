import { compile } from 'svelte-5.0.0/compiler';
import { highlight } from './code.js';
import { COUNTER_SOURCE, door_of } from '#lib/counter.js';

/**
 * The counter and its svelte@5.0.0 compiled output, highlighted, with the chapter that opens
 * each compiled line.
 */
export async function load_counter() {
	const compiled = compile(COUNTER_SOURCE, {
		filename: 'Counter.svelte',
		generate: 'client',
		dev: false
	}).js.code;

	return {
		counter: { file: 'Counter.svelte', lines: await highlight(COUNTER_SOURCE, 'svelte') },
		compiled: {
			file: 'Counter.js',
			lines: await highlight(compiled, 'javascript')
		},
		doors: /** @type {string} */ (compiled)
			.replace(/\n$/, '')
			.split('\n')
			.map((line) => door_of(line) ?? null)
	};
}
