// Helper for steps scripts: wraps `t.step` so that, in addition to the mutation
// log printed by tools/mount.mjs, each step prints a one-line summary:
//
//   [stats] records 2 | inserted 1 | removed 1 | text 0 | attr 0
//   [nodes] <li>: kept 5 (same position 1), created 0, removed 0
//
// "records" is the number of MutationRecords, i.e. roughly how many separate DOM
// operations touched the live document. Moving a node shows up as remove + insert.

/**
 * @param {any} t the object passed to a steps script
 * @param {string} [track] CSS selector of the nodes whose identity you want to track
 */
export function with_stats(t, track) {
	const observer = new MutationObserver(() => {});
	observer.observe(t.target, { subtree: true, childList: true, characterData: true, attributes: true });

	const snapshot = () => (track ? [...t.target.querySelectorAll(track)] : []);

	return async (label, fn) => {
		observer.takeRecords();
		const before = snapshot();

		let records = [];
		await t.step(label, async () => {
			await fn();
			t.flushSync();
			records = observer.takeRecords();
		});
		records.push(...observer.takeRecords());

		const count = (type) => records.filter((r) => r.type === type).length;
		const nodes = (key) => records.reduce((n, r) => n + (r.type === 'childList' ? r[key].length : 0), 0);
		console.log(
			`  [stats] records ${records.length} | inserted ${nodes('addedNodes')} | removed ${nodes('removedNodes')} | text ${count('characterData')} | attr ${count('attributes')}`
		);

		if (track) {
			const after = snapshot();
			const kept = after.filter((n) => before.includes(n));
			const same_pos = after.filter((n, i) => before[i] === n).length;
			console.log(
				`  [nodes] ${track}: kept ${kept.length} (same position ${same_pos}), created ${after.length - kept.length}, removed ${before.filter((n) => !after.includes(n)).length}`
			);
		}
	};
}
