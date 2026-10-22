/**
 * Shiki in the browser, for code that only exists at runtime (what the reader types, what
 * svelte@5.0.0 compiles it into). Loaded on first use; build-time code uses `server/code.js`.
 */

/** @type {Promise<import('shiki/core').HighlighterCore> | undefined} */
let highlighter;

function get_highlighter() {
	highlighter ??= Promise.all([
		import('shiki/core'),
		import('shiki/engine/javascript'),
		import('shiki/langs/svelte.mjs'),
		import('shiki/langs/javascript.mjs'),
		import('../pen-theme.js')
	]).then(([core, engine, svelte, javascript, pens]) =>
		core.createHighlighterCore({
			engine: engine.createJavaScriptRegexEngine(),
			langs: [svelte.default, javascript.default],
			themes: [pens.pen_light, pens.pen_dark]
		})
	);
	return highlighter;
}

/**
 * Highlighted HTML for the inside of a `<code>`: one `<span class="line">` per line, tokens
 * colored through `--shiki-light` / `--shiki-dark` (see `app.css`).
 * @param {string} code
 * @param {'svelte' | 'javascript'} lang
 */
export async function highlight(code, lang) {
	const hl = await get_highlighter();
	const html = hl.codeToHtml(code, {
		lang,
		themes: { light: 'pen-light', dark: 'pen-dark' },
		defaultColor: false
	});
	return html.match(/<code>([\s\S]*)<\/code>/)?.[1] ?? '';
}

/** @param {string} text */
export function escape_html(text) {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
