const GAP = 8;
const EDGE = 12;

/**
 * Where a card fits next to the words it belongs to: above them when there is room, else
 * below, and moved sideways to stay inside the window. A card too tall for either goes to the
 * left of the words, if it fits there, level with them and kept inside the window (in the
 * chapter that is over the code stage, not over the text being read). Only if none of these
 * has room does it take the larger of above and below, and scroll (`room` is then its height
 * limit).
 *
 * @param {DOMRect} anchor the words, in window coordinates
 * @param {HTMLElement} card laid out (it may be invisible)
 * @returns {{ side: 'above' | 'below' | 'left', left: number, top: number, room: number | undefined }}
 *   `left`/`top` in window coordinates
 */
export function fit(anchor, card) {
	const width = card.offsetWidth;
	const height = card.offsetHeight;
	const above = anchor.top - GAP - EDGE;
	const below = innerHeight - anchor.bottom - GAP - EDGE;
	const beside = anchor.left - GAP - EDGE;
	const tall = innerHeight - EDGE * 2;
	if (height > above && height > below && width <= beside && height <= tall) {
		const middle = (anchor.top + anchor.bottom) / 2 - height / 2;
		const top = Math.max(EDGE, Math.min(middle, innerHeight - EDGE - height));
		return { side: 'left', left: anchor.left - GAP - width, top, room: undefined };
	}
	/** @type {'above' | 'below'} */
	let side = 'above';
	/** @type {number | undefined} */
	let room;
	if (height <= above) side = 'above';
	else if (height <= below) side = 'below';
	else {
		side = above > below ? 'above' : 'below';
		room = Math.max(above, below);
	}
	const shown = Math.min(height, room ?? height);
	const left = Math.max(EDGE, Math.min(anchor.left, innerWidth - EDGE - width));
	const top = side === 'above' ? anchor.top - GAP - shown : anchor.bottom + GAP;
	return { side, left, top, room };
}
