import fs from 'node:fs';
import path from 'node:path';
import { createHighlighter } from 'shiki';
import { pen_dark, pen_light } from '../pen-theme.js';

// The site lives in `<repo>/site`, and builds run from that directory, so the
// study repo (notes, scratch experiments, compiled outputs) is one level up.
const REPO_ROOT = path.resolve(process.cwd(), '..');

/** @type {Promise<import('shiki').Highlighter> | undefined} */
let highlighter;

function get_highlighter() {
	highlighter ??= createHighlighter({
		themes: [pen_light, pen_dark],
		langs: ['svelte', 'javascript', 'html']
	});
	return highlighter;
}

/** @param {string} file */
function lang_of(file) {
	if (file.endsWith('.svelte')) return 'svelte';
	if (file.endsWith('.html')) return 'html';
	return 'javascript';
}

// svelte@5.0.0 as published (the `svelte-5.0.0` alias) ships its sources, so the site can
// cite the exact 5.0.0 runtime without depending on the state of the `svelte/` checkout.
const SVELTE_SRC = path.resolve(process.cwd(), 'node_modules/svelte-5.0.0/src');

/**
 * Reads a file from the study repo and returns it highlighted, one HTML string per line.
 * @param {string} file path relative to the repo root, e.g. `scratch/compiled/09-anchors.compiled.js`
 * @returns {Promise<import('#lib/types.js').CodeFile>}
 */
export async function load_code(file) {
	const source = fs.readFileSync(path.join(REPO_ROOT, file), 'utf-8');
	return { file, lines: await highlight(source, lang_of(file)) };
}

/**
 * Reads a svelte@5.0.0 source file. Line numbers match `svelte/packages/svelte/src/...` at the
 * `svelte@5.0.0` tag.
 * @param {string} file path relative to `src/`, e.g. `internal/client/dom/template.js`
 * @returns {Promise<import('#lib/types.js').CodeFile>}
 */
export async function load_svelte_source(file) {
	const source = fs.readFileSync(path.join(SVELTE_SRC, file), 'utf-8');
	return { file: `src/${file}`, lines: await highlight(source, lang_of(file)) };
}

/**
 * Highlights source text, one HTML string per line.
 * @param {string} source
 * @param {'svelte' | 'javascript' | 'html'} lang
 * @returns {Promise<string[]>}
 */
export async function highlight(source, lang) {
	const hl = await get_highlighter();

	/** @type {string[]} */
	const lines = [];

	hl.codeToHtml(source.replace(/\n$/, ''), {
		lang,
		themes: { light: 'pen-light', dark: 'pen-dark' },
		defaultColor: false,
		transformers: [
			{
				line(node) {
					lines.push(hast_to_html(node));
				}
			}
		]
	});

	return lines;
}

/**
 * Minimal HAST serializer for the token spans Shiki produces inside one line.
 * @param {any} node
 * @returns {string}
 */
function hast_to_html(node) {
	if (node.type === 'text') return escape(node.value);
	const children = (node.children ?? []).map(hast_to_html).join('');
	if (node.type !== 'element') return children;
	if (node.tagName === 'span' && node.properties?.class === 'line') return children;
	const style = node.properties?.style ? ` style="${escape(String(node.properties.style))}"` : '';
	return `<span${style}>${children}</span>`;
}

/** @param {string} str */
function escape(str) {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
