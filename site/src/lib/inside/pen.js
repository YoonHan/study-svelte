/**
 * Pen strokes that look written, not plotted: a short line that bows a little and wavers
 * along the way, as the `d` of a path to be stroked (so it can be drawn with a dash, like the
 * other pen strokes on the site). The same `seed` gives the same stroke, so a stroke does not
 * change shape when the page draws it again.
 */

/**
 * A small seeded random number generator (mulberry32), returning numbers in [0, 1).
 * @param {number} seed
 */
function random(seed) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** @param {number} n */
const round = (n) => Math.round(n * 100) / 100;

/**
 * A stroke from `from` to `to`, in the coordinates of the SVG it is drawn in.
 *
 * @param {[number, number]} from
 * @param {[number, number]} to
 * @param {{ seed: number, bow?: number, waver?: number }} options `bow`: at most this far off
 *   the straight line in the middle; `waver`: how far the hand wanders on the way
 */
export function pen_line(from, to, { seed, bow: most = 0.8, waver: wander = 0.35 }) {
	const r = random(seed);
	const [x0, y0] = from;
	const dx = to[0] - x0;
	const dy = to[1] - y0;
	const length = Math.hypot(dx, dy);
	// across the line, to the left of its direction
	const nx = -dy / length;
	const ny = dx / length;

	const bow = (0.4 + r() * 0.6) * most * (r() < 0.5 ? -1 : 1);
	const steps = 6;
	/** @type {string[]} */
	const points = [];
	let waver = 0;
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		// the ends stay where the pen lands and lifts
		waver = i === 0 || i === steps ? 0 : waver * 0.6 + (r() - 0.5) * 2 * wander;
		const off = bow * Math.sin(Math.PI * t) + waver;
		points.push(`${round(x0 + dx * t + nx * off)} ${round(y0 + dy * t + ny * off)}`);
	}
	return `M${points.join('L')}`;
}

// the loose ring of the contents' stage numbers, in a 100 x 40 box: starts at the top, goes
// round to the left, and runs on past where it began, as a hand circles a word
const RING = [
	[58, 5],
	[30, 2, 5, 8, 4, 20],
	[3, 32, 28, 38, 54, 37],
	[80, 36, 97, 30, 96, 19],
	[95, 9, 74, 3, 40, 6]
];

/**
 * That ring laid out at `width` x `height` px, as the `d` of a path to be stroked. Drawn at its
 * own size rather than by stretching an SVG: a stretched SVG draws its dash to the wrong length.
 * @param {number} width
 * @param {number} height
 */
export function ring_path(width, height) {
	/** @param {number[]} p */
	const at = (p) => p.map((n, i) => round(i % 2 ? (n / 40) * height : (n / 100) * width)).join(' ');
	const [start, ...curves] = RING;
	return `M${at(start)}${curves.map((c) => `C${at(c)}`).join('')}`;
}

/**
 * The box to circle a run of text with: an ellipse curves in at its ends, so a longer run
 * needs more room at the sides. `within`: the left and right it must stay inside (a wide run
 * in a code block is circled up to the block's edges, not past them).
 * @param {{ left: number, top: number, right: number, bottom: number }} box
 * @param {[number, number]} [within]
 */
export function ring_box(box, within) {
	const width = box.right - box.left;
	const side = 9 + width * 0.06;
	const left = within ? Math.max(box.left - side, within[0]) : box.left - side;
	const right = within ? Math.min(box.right + side, within[1]) : box.right + side;
	return { left, top: box.top - 5, width: right - left, height: box.bottom - box.top + 10 };
}
