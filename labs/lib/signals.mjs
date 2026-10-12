// Thin wrapper around Svelte's internal reactivity so that labs can poke at
// signals directly, without the compiler or the DOM.
//
//   import { state, derived, effect, get, set, flushSync, root, inspect } from '../lib/signals.mjs';
//
// Every import below points at the checked-out Svelte source, so you can add
// console.log / debugger statements inside the runtime and see them here.
import * as runtime from '../../svelte/packages/svelte/src/internal/client/runtime.js';
import * as C from '../../svelte/packages/svelte/src/internal/client/constants.js';

export { get, untrack, push, pop } from '../../svelte/packages/svelte/src/internal/client/runtime.js';
export { state, mutable_source, set } from '../../svelte/packages/svelte/src/internal/client/reactivity/sources.js';
export { derived } from '../../svelte/packages/svelte/src/internal/client/reactivity/deriveds.js';
export {
	effect,
	user_effect,
	render_effect,
	template_effect,
	effect_root
} from '../../svelte/packages/svelte/src/internal/client/reactivity/effects.js';
export { proxy } from '../../svelte/packages/svelte/src/internal/client/proxy.js';
export { flushSync, tick } from '../../svelte/packages/svelte/src/index-client.js';

import { effect_root } from '../../svelte/packages/svelte/src/internal/client/reactivity/effects.js';

/**
 * Run `fn` the way a runes-mode component would: inside a component context and
 * an effect root. Returns a function that destroys everything `fn` created.
 * @param {() => void} fn
 */
export function root(fn) {
	runtime.push({}, true);
	const destroy = effect_root(fn);
	runtime.pop();
	return destroy;
}

const FLAG_NAMES = Object.entries(C)
	.filter(([, v]) => typeof v === 'number')
	.sort(([, a], [, b]) => a - b);

/** Decode a signal's `f` bitmask into flag names, e.g. ['DERIVED', 'DIRTY'] */
export function flags(signal) {
	return FLAG_NAMES.filter(([, bit]) => (signal.f & bit) !== 0).map(([name]) => name);
}

/** Give signals human-readable labels for `inspect` output */
const labels = new WeakMap();
export function label(signal, name) {
	labels.set(signal, name);
	return signal;
}
const name_of = (s) => labels.get(s) ?? (s.fn ? 'fn:' + (s.fn.name || 'anonymous') : 'source');

/** Print a signal's flags, version, value, and its edges in the dependency graph */
export function inspect(signal, title = name_of(signal)) {
	const row = {
		flags: flags(signal).join(' | ') || '(none)',
		version: signal.version
	};
	if ('v' in signal) row.value = signal.v;
	if ('deps' in signal) row.deps = signal.deps?.map(name_of) ?? null;
	if ('reactions' in signal) row.reactions = signal.reactions?.map(name_of) ?? null;
	console.log(`[${title}]`, row);
}
