#!/usr/bin/env node
// Mount a component in jsdom and watch exactly which DOM operations each update causes.
//
//   node tools/mount.mjs playground/Counter.svelte
//   node tools/mount.mjs playground/Counter.svelte --props '{"initial": 3}'
//   node tools/mount.mjs playground/Counter.svelte --script labs/03-dom/counter.steps.mjs
//
// A steps script default-exports `async (t) => { ... }` and drives the component:
//   await t.step('increment', () => t.click('button'));
//   await t.step('type', () => t.input('input', 'hello'));
//   t.$('selector'), t.target, t.html(), t.flushSync
// After every step the script prints the DOM mutations that the step caused.
import path from 'node:path';
import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { SVELTE_REPO } from './paths.mjs';

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		props: { type: 'string' },
		script: { type: 'string' },
		quiet: { type: 'boolean', short: 'q' }
	}
});

if (!positionals[0]) {
	console.error('usage: node tools/mount.mjs <Component.svelte> [--props <json>] [--script <steps.mjs>]');
	process.exit(1);
}

// 1. install a jsdom window as the global environment (must happen before the runtime loads)
const { JSDOM } = createRequire(path.join(SVELTE_REPO, 'package.json'))('jsdom');
const dom = new JSDOM('<!doctype html><html><head></head><body><main id="app"></main></body></html>', {
	url: 'http://localhost/',
	pretendToBeVisual: true
});
const force = ['window', 'document', 'navigator', 'Event', 'EventTarget', 'CustomEvent', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle'];
for (const key of Object.getOwnPropertyNames(dom.window)) {
	if (key in globalThis && !force.includes(key)) continue;
	let value;
	try {
		value = key === 'window' ? dom.window : dom.window[key];
	} catch {
		continue;
	}
	Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
}

// 2. compile .svelte files on import, then load the runtime
await import('./loader.mjs');
const { mount, unmount, flushSync } = await import('svelte');
const { default: Component } = await import(pathToFileURL(path.resolve(positionals[0])).href);

// 3. record DOM mutations
const target = document.getElementById('app');
const records = [];
const observer = new MutationObserver((list) => records.push(...list));
observer.observe(target, { subtree: true, childList: true, characterData: true, characterDataOldValue: true, attributes: true, attributeOldValue: true });

const show = (node) => {
	if (node.nodeType === 3) return JSON.stringify(node.data);
	if (node.nodeType === 8) return `<!--${node.data}-->`;
	return node.outerHTML ?? node.nodeName;
};
const where = (node) => {
	if (node === target) return '#app';
	if (node.nodeType !== 1) return node.nodeName;
	return node.nodeName.toLowerCase() + (node.id ? `#${node.id}` : '') + (node.className ? `.${String(node.className).split(' ').join('.')}` : '');
};

function report(label) {
	records.push(...observer.takeRecords());
	console.log(`\n── ${label} ─────────────────────────────`);
	if (records.length === 0) console.log('  (no DOM mutations)');
	for (const r of records) {
		if (r.type === 'characterData') {
			console.log(`  text      ${JSON.stringify(r.oldValue)} → ${JSON.stringify(r.target.data)}  (in ${where(r.target.parentNode)})`);
		} else if (r.type === 'attributes') {
			console.log(`  attribute ${where(r.target)} [${r.attributeName}] ${JSON.stringify(r.oldValue)} → ${JSON.stringify(r.target.getAttribute(r.attributeName))}`);
		} else {
			for (const n of r.removedNodes) console.log(`  remove    ${show(n)}  (from ${where(r.target)})`);
			for (const n of r.addedNodes) console.log(`  insert    ${show(n)}  (into ${where(r.target)})`);
		}
	}
	records.length = 0;
	console.log(`  html: ${target.innerHTML}`);
}

const instance = mount(Component, { target, props: values.props ? JSON.parse(values.props) : {} });
flushSync();
if (values.quiet) records.length = 0;
report('mount');

if (values.script) {
	const { default: steps } = await import(pathToFileURL(path.resolve(values.script)).href);
	const $ = (selector) => {
		const el = target.querySelector(selector);
		if (!el) throw new Error(`no element matches ${selector}`);
		return el;
	};
	await steps({
		target,
		instance,
		flushSync,
		$,
		html: () => target.innerHTML,
		click: (selector) => $(selector).dispatchEvent(new MouseEvent('click', { bubbles: true })),
		input: (selector, value) => {
			const el = $(selector);
			el.value = value;
			el.dispatchEvent(new Event('input', { bubbles: true }));
		},
		async step(label, fn) {
			await fn();
			flushSync();
			await Promise.resolve();
			report(label);
		}
	});
}

unmount(instance);
report('unmount');
observer.disconnect();
