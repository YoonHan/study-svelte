// How many DOM moves does the keyed each block need to turn one order into another?
// Compares Svelte 5.0.0's reconcile() against the theoretical minimum (n - LIS).
//
//   node tools/mount.mjs playground/03-dom/Perm.svelte --script labs/03-dom/each-moves.steps.mjs -q
//
// Try a single permutation:
//   TO=E,B,C,D,A node tools/mount.mjs playground/03-dom/Perm.svelte --script labs/03-dom/each-moves.steps.mjs -q
import { list } from '../../playground/03-dom/perm.svelte.js';

const START = ['A', 'B', 'C', 'D', 'E'];

/** length of the longest increasing subsequence of `to` measured in `from` positions */
function lis_length(from, to) {
	const seq = to.map((k) => from.indexOf(k));
	const tails = [];
	for (const x of seq) {
		let lo = 0;
		let hi = tails.length;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (tails[mid] < x) lo = mid + 1;
			else hi = mid;
		}
		tails[lo] = x;
	}
	return tails.length;
}

function* permutations(items) {
	if (items.length <= 1) return yield items;
	for (let i = 0; i < items.length; i++) {
		for (const rest of permutations([...items.slice(0, i), ...items.slice(i + 1)])) {
			yield [items[i], ...rest];
		}
	}
}

export default async (t) => {
	const observer = new MutationObserver(() => {});
	observer.observe(t.target, { subtree: true, childList: true });

	/** reorder and return the number of nodes Svelte moved */
	const moves_for = (to) => {
		list.order = START;
		t.flushSync();
		observer.takeRecords();

		list.order = to;
		t.flushSync();
		const records = observer.takeRecords();
		const actual = [...t.target.querySelectorAll('li')].map((li) => li.textContent);
		if (actual.join() !== to.join()) throw new Error(`wrong order: ${actual} (expected ${to})`);
		return records.reduce((n, r) => n + r.addedNodes.length, 0);
	};

	if (process.env.TO) {
		const to = process.env.TO.split(',');
		console.log(`${START.join('')} → ${to.join('')}: svelte moved ${moves_for(to)}, minimum ${START.length - lis_length(START, to)}`);
		return;
	}

	let total = 0;
	let optimal = 0;
	const worst = [];

	for (const to of permutations(START)) {
		const moves = moves_for(to);
		const minimum = START.length - lis_length(START, to);
		total++;
		if (moves === minimum) optimal++;
		else worst.push({ to: to.join(''), moves, minimum });
	}

	console.log(`\npermutations of ${START.join('')}: ${total}`);
	console.log(`svelte used the minimum number of moves in ${optimal} of them`);
	worst.sort((a, b) => b.moves - b.minimum - (a.moves - a.minimum));
	console.log('examples where it moved more than necessary:');
	console.table(worst.slice(0, 8));
};
