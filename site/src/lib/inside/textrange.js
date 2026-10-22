/** Where runs of text are drawn on the page, per visual line (long lines wrap). */

/**
 * Boxes of a run of text, one per visual line (a long code line wraps).
 * @param {DOMRectList | DOMRect[]} rects
 */
export function per_line(rects) {
	/** @type {Map<number, { top: number, bottom: number, left: number, right: number }>} */
	const lines = new Map();
	for (const r of rects) {
		if (r.width === 0) continue;
		const key = Math.round(r.top);
		const line = lines.get(key);
		if (line) {
			line.left = Math.min(line.left, r.left);
			line.right = Math.max(line.right, r.right);
			line.bottom = Math.max(line.bottom, r.bottom);
		} else lines.set(key, { top: r.top, bottom: r.bottom, left: r.left, right: r.right });
	}
	return [...lines.values()].sort((a, b) => a.top - b.top);
}

/**
 * Where the first occurrence of `text` is drawn inside `root`, per visual line.
 * @param {Element} root
 * @param {string} text
 */
export function text_boxes(root, text) {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	/** @type {[Text, number][]} */
	const nodes = [];
	let all = '';
	while (walker.nextNode()) {
		const node = /** @type {Text} */ (walker.currentNode);
		nodes.push([node, all.length]);
		all += node.data;
	}
	const at = all.indexOf(text);
	if (at === -1 || text === '') return [];
	/** @param {number} pos @param {boolean} end */
	const find = (pos, end) => {
		for (const [node, from] of nodes) {
			const to = from + node.data.length;
			if (end ? pos <= to : pos < to) return /** @type {[Text, number]} */ ([node, pos - from]);
		}
		const [node] = nodes[nodes.length - 1];
		return /** @type {[Text, number]} */ ([node, node.data.length]);
	};
	const range = document.createRange();
	range.setStart(...find(at, false));
	range.setEnd(...find(at + text.length, true));
	return per_line(range.getClientRects());
}
