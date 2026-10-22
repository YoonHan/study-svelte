/**
 * Escapes text and turns `backticked` spans into <code>, for short labels written as strings.
 * @param {string} text
 */
export function inline_code(text) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/`([^`]+)`/g, '<code>$1</code>');
}

/** @param {string} s */
const decode = (s) =>
	s
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, '&');

/** @param {string} s */
const encode = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Wraps the part of a highlighted line that reads exactly `text` in `<span class={cls}>`, so
 * a note can mark just that part (a line is a flat run of token spans).
 * @param {string} html
 * @param {string} text
 * @param {string} cls
 */
export function mark_text(html, text, cls) {
	const parts = [...html.matchAll(/<span([^>]*)>([^<]*)<\/span>|([^<]+)/g)].map((m) => ({
		attrs: m[1] ?? null,
		text: decode(m[2] ?? m[3] ?? '')
	}));
	const plain = parts.map((p) => p.text).join('');
	const start = plain.indexOf(text);
	if (start === -1) return html;
	const end = start + text.length;
	let pos = 0;
	let out = '';
	for (const part of parts) {
		const from = pos;
		pos += part.text.length;
		const cut = (/** @type {number} */ at) => Math.min(Math.max(at - from, 0), part.text.length);
		/** @type {{ text: string, inside: boolean }[]} */
		const pieces = [
			{ text: part.text.slice(0, cut(start)), inside: false },
			{ text: part.text.slice(cut(start), cut(end)), inside: true },
			{ text: part.text.slice(cut(end)), inside: false }
		];
		for (const piece of pieces) {
			if (!piece.text) continue;
			const token =
				part.attrs === null
					? encode(piece.text)
					: `<span${part.attrs}>${encode(piece.text)}</span>`;
			out += piece.inside ? `<span class="${cls}">${token}</span>` : token;
		}
	}
	return out;
}

/**
 * Marks whole-word occurrences of `words` in a highlighted line (outside its tags) as
 * `<span class="recall" data-recall="word">`, so pointing at one can remind the reader what
 * it is.
 * @param {string} html
 * @param {string[]} words
 */
export function mark_words(html, words) {
	if (words.length === 0) return html;
	const pattern = new RegExp(
		`(?<![\\w$])(${words.map((w) => w.replace(/[$]/g, '\\$')).join('|')})(?![\\w$])`,
		'g'
	);
	return html.replace(
		/>([^<]+)</g,
		(_, text) =>
			`>${text.replace(pattern, '<span class="recall" data-recall="$1" tabindex="0">$1</span>')}<`
	);
}
