/**
 * Fold a trace to the depth the reader has reached.
 *
 * Kinds of calls the reader hasn't learned yet are folded into closed boxes, and anything a
 * closed call does inside stays in its box. The same recording reads as a short story early
 * on and opens into more detail chapter by chapter.
 *
 * @typedef {import('./engine.js').TraceEvent} TraceEvent
 * @typedef {import('./engine.js').Kind} Kind
 *
 * @typedef {{ type: 'phase', key: string, label: string }} PhaseRow
 * @typedef {{ type: 'event', key: string, depth: number, event: TraceEvent }} EventRow
 * @typedef {{ type: 'box', key: string, depth: number, label: string, kinds: Set<Kind>, events: TraceEvent[] }} BoxRow
 * @typedef {PhaseRow | EventRow | BoxRow} Row
 *
 * @typedef {object} Level
 * @property {string} id
 * @property {string} label
 * @property {Kind[]} open kinds of calls shown one by one at this depth
 */

/** @type {Level[]} */
export const LEVELS = [
	{ id: 'dom', label: '1-1 ~ 1-3 · 만들고, 찾고, 넣기', open: ['create', 'walk', 'insert'] },
	{
		id: 'update',
		label: '1-4 ~ 1-6 · 값을 쓰고 갱신하기',
		open: ['create', 'walk', 'insert', 'effect', 'text', 'event']
	},
	{
		id: 'all',
		label: '전체 · 모든 호출',
		open: ['create', 'walk', 'insert', 'effect', 'text', 'event', 'signal', 'other']
	}
];

/** @type {Record<Kind, string>} */
const BOX_LABELS = {
	create: '템플릿을 만드는 일',
	walk: '노드를 찾아가는 일',
	insert: '문서에 넣는 일',
	effect: '값을 화면에 쓰는 일',
	text: '값을 화면에 쓰는 일',
	signal: '상태(signal)를 읽고 바꾸는 일',
	event: '이벤트를 연결하는 일',
	other: '그 밖의 내부 동작'
};

/**
 * What a closed box is about, in words the reader already has.
 * @param {Set<Kind>} kinds
 */
function box_label(kinds) {
	if (kinds.has('signal') && (kinds.has('text') || kinds.has('effect'))) {
		return '상태가 바뀌고, 화면이 갱신되는 일';
	}
	const labels = [...new Set([...kinds].map((kind) => BOX_LABELS[kind]))];
	return labels.join(' · ');
}

/**
 * @param {TraceEvent[]} events
 * @param {Level} level
 * @returns {Row[]}
 */
export function fold(events, level) {
	const open = new Set(level.open);
	/** @type {Row[]} */
	const rows = [];
	/** @type {(EventRow | BoxRow)[]} what each depth currently belongs to */
	const owners = [];
	let phase = '';

	for (const event of events) {
		if (event.phase !== phase) {
			phase = event.phase;
			rows.push({ type: 'phase', key: `phase-${event.id}`, label: phase });
			owners.length = 0;
		}

		owners.length = event.depth;
		const closed = owners.findLast((owner) => owner?.type === 'box');

		if (closed && closed.type === 'box') {
			// inside a closed call: stays in that call's box
			closed.events.push(event);
			owners[event.depth] = closed;
			continue;
		}

		if (!open.has(event.kind)) {
			// consecutive closed calls at the same depth are one box: one thing happening
			const last = rows.at(-1);
			if (last?.type === 'box' && last.depth === event.depth) {
				last.events.push(event);
				last.kinds.add(event.kind);
				last.label = box_label(last.kinds);
				owners[event.depth] = last;
			} else {
				/** @type {BoxRow} */
				const box = {
					type: 'box',
					key: `box-${event.id}`,
					depth: event.depth,
					label: box_label(new Set([event.kind])),
					kinds: new Set([event.kind]),
					events: [event]
				};
				rows.push(box);
				owners[event.depth] = box;
			}
			continue;
		}

		/** @type {EventRow} */
		const row = { type: 'event', key: `event-${event.id}`, depth: event.depth, event };
		rows.push(row);
		owners[event.depth] = row;
	}

	return rows;
}

/**
 * The call a row stands for when the reader steps onto it: a box stands for its last call
 * (so the DOM shown is the state after everything in the box has happened).
 * @param {Row} row
 */
export function representative(row) {
	if (row.type === 'event') return row.event;
	if (row.type === 'box') return row.events.at(-1);
	return undefined;
}
