/**
 * Compile a component with svelte@5.0.0 in the browser, run it with an instrumented runtime,
 * and record every runtime call the compiled code makes.
 *
 * The compiled code reaches the runtime only through `import * as $ from
 * "svelte/internal/client"`, so swapping `$` for a wrapper that logs each call is enough to
 * see everything the compiled code does. Calls the runtime makes internally (for example an
 * effect re-running its callback) are not logged themselves, but the `$.*` calls inside that
 * callback are, because the callback is compiled code.
 *
 * @typedef {'create' | 'walk' | 'insert' | 'effect' | 'text' | 'signal' | 'event' | 'other'} Kind
 *
 * @typedef {object} TreeNode
 * @property {number} id
 * @property {string} label
 * @property {'element' | 'text' | 'comment' | 'fragment'} type
 * @property {TreeNode[]} children
 *
 * @typedef {object} TraceEvent
 * @property {number} id
 * @property {number} depth nesting under other recorded calls
 * @property {string} name e.g. `sibling`, or `root()` for a template clone
 * @property {Kind} kind
 * @property {string[]} args short descriptions of the arguments
 * @property {string} [result] short description of the return value
 * @property {number[]} nodes ids of the DOM nodes this call touched (arguments and result)
 * @property {number | null} line line in the compiled code that made the call
 * @property {string} phase what the user was doing: `마운트`, `클릭 1`, …
 * @property {TreeNode[]} snapshot the DOM right after the call returned
 */

import { compile } from 'svelte-5.0.0/compiler';
import * as runtime from 'svelte-5.0.0/internal/client';
import { mount, unmount, flushSync } from 'svelte-5.0.0';

const SOURCE_URL = 'compiled-component.js';

/** @type {Record<string, Kind>} */
const KINDS = {
	template: 'create',
	'root()': 'create',
	'effect 실행': 'effect',
	comment: 'create',
	text: 'create',
	first_child: 'walk',
	child: 'walk',
	sibling: 'walk',
	next: 'walk',
	reset: 'walk',
	append: 'insert',
	template_effect: 'effect',
	set_text: 'text',
	state: 'signal',
	get: 'signal',
	set: 'signal',
	update: 'signal',
	delegate: 'event'
};

/**
 * Turn compiled ES module code into a function body that takes `$` as a parameter and
 * returns the component. Lines are kept one-for-one so stack traces map back to the
 * compiled code as displayed.
 * @param {string} code
 */
function to_function_body(code) {
	let name = 'Component';
	const body = code
		.split('\n')
		.map((line) => {
			if (/^import\s+["']svelte\/internal\/disclose-version["'];?$/.test(line)) return '';
			if (/^import\s+\*\s+as\s+\$\s+from\s+["']svelte\/internal\/client["'];?$/.test(line))
				return '';
			const match = line.match(/^export default function (\w+)/);
			if (match) {
				name = match[1];
				return line.replace('export default ', '');
			}
			return line;
		})
		.join('\n');
	return `${body}\nreturn ${name};\n//# sourceURL=${SOURCE_URL}`;
}

/** @param {string} source */
export function compile_component(source) {
	const result = compile(source, { filename: 'Counter.svelte', generate: 'client', dev: false });
	return result.js.code;
}

/**
 * Compile, instrument and mount a component into `target`.
 * @param {string} source `.svelte` source
 * @param {HTMLElement} target where to mount
 */
export function run(source, target) {
	const code = compile_component(source);

	/** @type {TraceEvent[]} */
	const events = [];
	let depth = 0;
	let phase = '마운트';
	let clicks = 0;
	let next_id = 0;

	/** fragments created by `root()` that are not in the document yet */
	const loose = new Set();

	/** @type {WeakMap<Node, number>} */
	const node_ids = new WeakMap();
	let next_node = 1;
	/** @param {Node} node */
	const node_id = (node) => {
		let id = node_ids.get(node);
		if (!id) node_ids.set(node, (id = next_node++));
		return id;
	};

	/**
	 * @param {unknown} value
	 * @param {number[]} nodes collects the ids of DOM nodes mentioned
	 * @returns {string}
	 */
	function describe(value, nodes) {
		if (value instanceof Node) {
			nodes.push(node_id(value));
			return describe_node(value);
		}
		if (typeof value === 'function') return 'ƒ';
		if (value && typeof value === 'object' && 'f' in value) {
			// runtime objects: sources and deriveds carry a value `v`, effects carry `fn` but no `v`
			const v = /** @type {any} */ (value);
			if ('fn' in v && 'v' in v) return `derived(${describe(v.v, [])})`;
			if ('v' in v) return `signal(${describe(v.v, [])})`;
			if ('fn' in v) return 'effect';
		}
		if (Array.isArray(value)) return `[${value.map((v) => describe(v, nodes)).join(', ')}]`;
		if (typeof value === 'string')
			return JSON.stringify(value.length > 40 ? value.slice(0, 40) + '…' : value);
		return String(value);
	}

	/** the line in the compiled code that called into the runtime */
	function caller_line() {
		const stack = new Error().stack ?? '';
		const match = stack.match(new RegExp(`${SOURCE_URL.replace('.', '\\.')}:(\\d+):\\d+`));
		// `new Function` adds a two-line header before the body
		return match ? Number(match[1]) - 2 : null;
	}

	function snapshot() {
		/** @type {TreeNode[]} */
		const roots = [tree(target, true)];
		for (const fragment of loose) {
			if (fragment.childNodes.length === 0) loose.delete(fragment);
			else roots.push(tree(fragment));
		}
		return roots;
	}

	/** @param {Node} node @param {boolean} [is_target] @returns {TreeNode} */
	function tree(node, is_target = false) {
		return {
			id: node_id(node),
			label: is_target ? '#target' : describe_node(node),
			type: node_type(node),
			children: Array.from(node.childNodes, (child) => tree(child))
		};
	}

	/**
	 * @param {string} name
	 * @param {unknown[]} args
	 * @param {(...args: any[]) => any} fn
	 * @param {any} self
	 * @returns {any}
	 */
	function call(name, args, fn, self) {
		/** @type {number[]} */
		const nodes = [];
		/** @type {TraceEvent} */
		const event = {
			id: next_id++,
			depth,
			name,
			kind: KINDS[name] ?? 'other',
			args: args.map((a) => describe(a, nodes)),
			nodes,
			line: caller_line(),
			phase,
			snapshot: []
		};
		events.push(event);
		depth++;
		try {
			// the runtime re-runs an effect by calling its callback directly, not through `$`;
			// wrap the callback so every run (the first one and each re-run) is recorded
			if (name === 'template_effect' && typeof args[0] === 'function') {
				args = [trace_effect_run(/** @type {(...a: any[]) => any} */ (args[0])), ...args.slice(1)];
			}
			let result = fn.apply(self, args);
			if (name === 'template' && typeof result === 'function') result = trace_clone(result);
			if (name === 'root()' && result instanceof DocumentFragment) loose.add(result);
			if (result !== undefined) event.result = describe(result, nodes);
			return result;
		} finally {
			depth--;
			event.snapshot = snapshot();
		}
	}

	/**
	 * `$.template(...)` returns the function the component calls to clone the template
	 * (`root()` in the compiled code); trace those calls too.
	 * @param {(...args: any[]) => any} clone
	 */
	function trace_clone(clone) {
		/** @this {any} @param {unknown[]} args */
		return function (...args) {
			return call('root()', args, clone, this);
		};
	}

	/**
	 * @param {(...args: any[]) => any} callback the function passed to `$.template_effect`
	 */
	function trace_effect_run(callback) {
		/** @this {any} @param {unknown[]} args */
		return function (...args) {
			return call('effect 실행', args, callback, this);
		};
	}

	/** @type {Record<string, unknown>} */
	const traced = {};
	for (const [key, value] of Object.entries(runtime)) {
		traced[key] =
			typeof value === 'function'
				? /** @this {any} @param {unknown[]} args */
					function (...args) {
						return call(key, args, /** @type {any} */ (value), this);
					}
				: value;
	}

	const Component = new Function('$', to_function_body(code))(traced);

	// the 5.0.0 runtime delegates events to `target`; stop them there so the site's own
	// (newer) Svelte runtime, which delegates at the page root, never sees them
	const stop = (/** @type {Event} */ e) => e.stopPropagation();
	target.addEventListener('click', stop);

	const instance = mount(Component, { target });
	flushSync();

	return {
		code,
		events,
		/**
		 * Click the n-th button of the mounted component and record what happens, including
		 * the effects that run afterwards.
		 * @param {number} index
		 */
		click(index) {
			const button = target.querySelectorAll('button')[index];
			if (!button) return;
			clicks += 1;
			phase = `클릭 ${clicks}`;
			button.click();
			flushSync();
		},
		destroy() {
			target.removeEventListener('click', stop);
			unmount(instance);
		}
	};
}

/** @param {Node} node */
function node_type(node) {
	if (node.nodeType === 1) return 'element';
	if (node.nodeType === 3) return 'text';
	if (node.nodeType === 8) return 'comment';
	return 'fragment';
}

/** @param {Node} node */
export function describe_node(node) {
	if (node.nodeType === 1) return `<${/** @type {Element} */ (node).tagName.toLowerCase()}>`;
	if (node.nodeType === 3) return `#text "${node.nodeValue}"`;
	if (node.nodeType === 8) return `<!--${node.nodeValue}-->`;
	return '#fragment';
}
