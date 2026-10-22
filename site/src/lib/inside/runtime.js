/**
 * Runs pieces of the real svelte@5.0.0 runtime in the page, so every value an explainer shows
 * comes from executing 5.0.0 rather than from a drawing.
 *
 * Experiments write their component by hand in the same shape the compiler emits
 * (`var fragment = root(); …; $.append($$anchor, fragment)`), mount it with 5.0.0's `mount`,
 * and watch the DOM calls the runtime makes while it runs.
 */

import * as runtime from 'svelte-5.0.0/internal/client';
import { mount, unmount } from 'svelte-5.0.0';

/** svelte@5.0.0's `svelte/internal/client`, what compiled code imports as `$` */
export { runtime };

/**
 * @typedef {object} Outline
 * @property {string} label e.g. `<button>`, `#text " "`, `#fragment`
 * @property {'element' | 'text' | 'comment' | 'fragment'} type
 * @property {Outline[]} children
 */

/**
 * Mounts a hand-written component body into `target`.
 * @param {HTMLElement} target
 * @param {(anchor: Node) => void} body
 * @returns {() => void} unmounts it
 */
export function run(target, body) {
	const instance = mount(body, { target });
	return () => unmount(instance);
}

/**
 * @typedef {object} Probe
 * @property {HTMLTemplateElement[]} parsed `<template>` elements created, i.e. HTML parses (`reconciler.js:3`)
 * @property {('cloneNode' | 'importNode')[]} copies how nodes were copied (`template.js:52`)
 */

/**
 * Calls `fn` while counting the DOM calls `template()` makes. Only top-level copies are
 * counted: `cloneNode(true)` recurses natively, so it is one call per template.
 * @template T
 * @param {() => T} fn
 * @returns {{ result: T } & Probe}
 */
export function probe(fn) {
	/** @type {Probe} */
	const seen = { parsed: [], copies: [] };
	const create_element = document.createElement;
	const import_node = document.importNode;
	const clone_node = Node.prototype.cloneNode;

	document.createElement = /** @type {typeof document.createElement} */ (
		function (/** @type {string} */ tag, /** @type {any} */ options) {
			const element = create_element.call(document, tag, options);
			if (tag === 'template') seen.parsed.push(/** @type {HTMLTemplateElement} */ (element));
			return element;
		}
	);
	document.importNode = /** @type {typeof document.importNode} */ (
		function (/** @type {Node} */ node, /** @type {boolean} */ deep) {
			seen.copies.push('importNode');
			return import_node.call(document, node, deep);
		}
	);
	Node.prototype.cloneNode = function (/** @type {boolean | undefined} */ deep) {
		seen.copies.push('cloneNode');
		return clone_node.call(this, deep);
	};

	try {
		return { result: fn(), ...seen };
	} finally {
		document.createElement = create_element;
		document.importNode = import_node;
		Node.prototype.cloneNode = clone_node;
	}
}

/**
 * @param {Node} node
 * @returns {Outline}
 */
export function outline(node) {
	return {
		label: label_of(node),
		type: type_of(node),
		children: [...node.childNodes].map(outline)
	};
}

/** @param {Node} node */
export function label_of(node) {
	if (node.nodeType === 11) return '#fragment';
	if (node.nodeType === 3) return `#text ${JSON.stringify(node.nodeValue)}`;
	if (node.nodeType === 8) return `<!--${node.nodeValue}-->`;
	return `<${/** @type {Element} */ (node).localName}>`;
}

/**
 * @param {Node} node
 * @returns {Outline['type']}
 */
function type_of(node) {
	if (node.nodeType === 11) return 'fragment';
	if (node.nodeType === 3) return 'text';
	if (node.nodeType === 8) return 'comment';
	return 'element';
}
