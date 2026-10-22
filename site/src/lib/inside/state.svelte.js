import { createContext, getContext, setContext, untrack } from 'svelte';
import { write_status } from './progress.js';

/**
 * @typedef {object} Closed
 * @property {number} from first line of a part of the function not opened yet
 * @property {number} to last line
 * @property {string} label what is inside, and where it is opened
 *
 * @typedef {object} File
 * @property {string} key how beats refer to it, e.g. `compiled`
 * @property {string} [title] caption above the listing
 * @property {import('#lib/types.js').CodeFile} code
 * @property {[number, number]} [range]
 * @property {Closed[]} [closed]
 * @property {{ line: number, text: string, point?: string, closed?: number }[]} [notes]
 * @property {Record<number, { text: string, current?: boolean, href?: string }>} [marks]
 * @property {{ key: string, label: string }} [from] the file this one is made from (shown as an arrow when both are on stage)
 *
 * @typedef {{ line: number, text?: string, point?: string, content?: import('svelte').Snippet }} Bubble a note on the code: a short `text`, or (older beats) the beat's own words; `point` is the text in the line its arrow points at
 *
 * @typedef {object} Recall a name the reader met earlier, and what to remind them of; or a
 *   variable on the code and the value it holds when the example runs
 * @property {string} text one sentence; `backticks` for code
 * @property {string} on the file it comes from
 * @property {[number, number]} [lines] the lines it comes from
 * @property {string} [value] for a variable: the value it holds, as code
 * @property {string} [word] for a variable: its name
 * @property {string} [when] for a variable: when it gets that value
 * @property {string} [since] id of the beat that introduces it: the code marks it only from then on
 *
 * @typedef {object} BeatInfo
 * @property {string[] | undefined} view files on the stage, top to bottom; beats without one keep the previous beat's
 * @property {string | undefined} on the file the beat talks about (default: the last file on the stage)
 * @property {Record<string, number[]>} lit lines to light, by file
 * @property {number[]} stress lines of the `on` file to highlight inside a long lit passage
 * @property {boolean} own whether the beat says what to light (else it keeps the previous beat's lit lines)
 * @property {number | null} bubble line of the `on` file the beat's note hangs under as a speech bubble
 * @property {string | undefined} note the short note written on the code (the beat's words stay in the flow)
 * @property {string | undefined} point the text in the line the note's arrow points at
 * @property {boolean} marks whether the compiled code shows which chapter opens each line
 * @property {string | undefined} cue label of the button that reveals this beat
 * @property {string | undefined} whole a file the beat talks about as a whole ("이 코드"): the stage frames all of it
 * @property {string | undefined} id
 */

/**
 * Progress through one chapter. A chapter is a sequence of beats (a sentence, a question, a
 * prediction, an experiment, one paragraph of an explanation) revealed one at a time when the
 * reader asks for the next one. Revealed beats stay on the page, faded; the focused beat
 * decides what the code stage shows.
 */
export class ChapterState {
	/** @type {BeatInfo[]} */
	beats = $state([]);

	/** number of beats revealed */
	progress = $state(1);

	/** the beat whose code, lit lines and bubble the stage shows */
	focus = $state(0);

	/** the reader's prediction for each predicting beat, by option index */
	predictions = $state(/** @type {Record<number, number>} */ ({}));

	/**
	 * Lines of the focused beat's file an experiment just executed, replacing its own lines.
	 * @type {{ beat: number, lines: number[] } | null}
	 */
	running = $state(null);

	/** beat to bring into view after it was revealed */
	scroll_to = $state(-1);

	/** the beat the reader just revealed; only it plays its entrance (not restored beats) */
	arrived = $state(-1);

	/**
	 * The hint the reader opened last, shown on the code while its beat has focus.
	 * @type {{ beat: number, on: string, line: number | null, lines: number[], text?: string, point?: string, content: import('svelte').Snippet } | null}
	 */
	hint = $state(null);

	/**
	 * Speech bubbles a beat puts on the code with `<Say>`, by beat: one beat can say several
	 * things, each under the line it is about.
	 * @type {Record<number, { id: number, on: string, line: number, spot?: string, strike?: boolean, point?: string, text?: string, content?: import('svelte').Snippet }[]>}
	 */
	says = $state({});

	#say_id = 0;

	/**
	 * A note on the code and its words in the flow, lit together while the reader points at
	 * one of them; `from` is the side being pointed at, which stays as it is.
	 * @type {{ on: string, line: number, from: 'text' | 'code' } | null}
	 */
	linked = $state(null);

	/**
	 * @param {string} on
	 * @param {number} line
	 * @param {'text' | 'code'} from
	 */
	link(on, line, from) {
		this.linked = { on, line, from };
	}

	unlink() {
		this.linked = null;
	}

	/**
	 * A part of the code the words point at ("줄 옆의 표시"), marked on the stage while the
	 * reader points at those words.
	 * @type {{ on: string, part: 'marks' | 'closed', from?: number } | null}
	 */
	pointing = $state(null);

	/**
	 * A name on the code the reader is pointing at, whose reminder the stage shows.
	 * @type {{ word: string, on: string, rect: DOMRect } | null}
	 */
	recalling = $state(null);

	/** the file the focused beat talks about as a whole, if any */
	get whole() {
		return this.beats[this.focus]?.whole;
	}

	/** @type {Map<number, import('svelte').Snippet>} bubble content, by beat */
	snippets = new Map();

	steps = 0;

	/**
	 * @param {string} id the chapter, e.g. `1-1`; marks it started or finished in the contents
	 * @param {string} key localStorage key used to remember progress
	 * @param {File[]} files the listings the stage can show
	 * @param {Record<string, Recall>} [recalls] names to remind the reader of, by name
	 */
	constructor(id, key, files, recalls = {}) {
		this.id = id;
		this.key = key;
		this.files = files;
		this.recalls = recalls;
	}

	/**
	 * Variables of a file and the values they hold when the example runs, by `file:name`
	 * (see template/trace.js). Pointing at one on the code shows its value.
	 * @type {Record<string, Recall>}
	 */
	values = $state({});

	/**
	 * @param {string} on
	 * @param {{ word: string, value: string, text: string, when: string, since?: string, lines?: [number, number] }[]} list
	 */
	set_values(on, list) {
		this.values = {
			...this.values,
			...Object.fromEntries(list.map((v) => [`${on}:${v.word}`, { ...v, on }]))
		};
	}

	/**
	 * What to show for a name on the code: its value if it is a variable with one, else the
	 * reminder of what it is.
	 * @param {string} on
	 * @param {string} word
	 * @returns {Recall | undefined}
	 */
	lookup(on, word) {
		const recall = this.values[`${on}:${word}`] ?? this.recalls[word];
		return recall?.on === on ? recall : undefined;
	}

	/**
	 * Names in a file that can be pointed at for a reminder or a value, once the beat that
	 * introduces them has been read.
	 * @param {string} key
	 */
	recall_words(key) {
		const all = [
			...Object.entries(this.recalls).map(([word, recall]) => ({ word, recall })),
			...Object.values(this.values).map((recall) => ({ word: recall.word ?? '', recall }))
		];
		return (
			all
				// only names can be found on the code (not reminders of passages, like "q1-variable")
				.filter(({ word }) => /^[\w$]+$/.test(word))
				.filter(
					({ recall }) => recall.on === key && (!recall.since || this.is_revealed_id(recall.since))
				)
				.map(({ word }) => word)
		);
	}

	/**
	 * @param {BeatInfo} info
	 * @param {import('svelte').Snippet} content
	 */
	register(info, content) {
		this.beats.push(info);
		const index = this.beats.length - 1;
		this.snippets.set(index, content);
		return index;
	}

	/** @param {string} key */
	file(key) {
		return this.files.find((f) => f.key === key);
	}

	/** @param {number} index files on the stage at a beat, inherited from earlier beats */
	view_of(index) {
		for (let i = index; i >= 0; i -= 1) {
			const view = this.beats[i]?.view;
			if (view) return view;
		}
		return [this.files[0].key];
	}

	/** @param {number} index the file a beat talks about */
	on_of(index) {
		return this.beats[index]?.on ?? /** @type {string} */ (this.view_of(index).at(-1));
	}

	/** files on the stage now */
	get view() {
		return this.view_of(this.focus);
	}

	/** the open hint of the focused beat, if any */
	get open_hint() {
		return this.hint?.beat === this.focus ? this.hint : null;
	}

	/**
	 * The beat whose lit lines show now. A beat that doesn't say what to light (a prediction,
	 * a follow-up sentence) keeps the previous beat's, as long as the stage hasn't changed, so
	 * choosing an answer doesn't make the code lose its marks.
	 */
	get lit_beat() {
		let i = this.focus;
		const view = this.view_of(i).join();
		while (i > 0) {
			const beat = this.beats[i];
			if (beat.own || beat.bubble != null || (this.says[i]?.length ?? 0) > 0) break;
			if (this.view_of(i - 1).join() !== view) break;
			i -= 1;
		}
		return i;
	}

	/** @param {string} key lines of a file to light now */
	lit(key) {
		const beat = this.beats[this.focus];
		if (!beat) return [];
		if (this.running?.beat === this.focus && key === this.on_of(this.focus)) {
			return this.running.lines;
		}
		const source = this.lit_beat;
		const lines = new Set(this.beats[source].lit[key] ?? []);
		for (const say of this.says[source] ?? []) {
			if (say.on === key) lines.add(say.line);
		}
		const hint = this.open_hint;
		if (hint && hint.on === key) for (const line of hint.lines) lines.add(line);
		return [...lines];
	}

	/** @param {string} key lines of a file to stress (highlight) inside a long lit passage now */
	stress(key) {
		if (!this.beats[this.focus] || this.running?.beat === this.focus) return [];
		const source = this.lit_beat;
		return key === this.on_of(source) ? this.beats[source].stress : [];
	}

	/** @param {string} key parts of lines a note stresses now, by line */
	spots(key) {
		return (this.says[this.lit_beat] ?? [])
			.filter((say) => say.on === key && say.spot)
			.map((say) => ({
				line: say.line,
				text: /** @type {string} */ (say.spot),
				strike: say.strike
			}));
	}

	/**
	 * @param {string} key the speech bubbles to show in a file now, in the order they are said
	 * @returns {Bubble[]}
	 */
	bubbles(key) {
		const hint = this.open_hint;
		if (hint && hint.line !== null) {
			return hint.on === key
				? [
						hint.text
							? { line: hint.line, text: hint.text, point: hint.point }
							: { line: hint.line, content: hint.content }
					]
				: [];
		}
		/** @type {Bubble[]} */
		const result = [];
		const beat = this.beats[this.focus];
		const line = beat?.bubble;
		const content = this.snippets.get(this.focus);
		if (line != null && key === this.on_of(this.focus)) {
			if (beat.note) result.push({ line, text: beat.note, point: beat.point });
			else if (content) result.push({ line, content });
		}
		for (const say of this.says[this.focus] ?? []) {
			if (say.on === key) {
				result.push(
					say.text
						? { line: say.line, text: say.text, point: say.point }
						: { line: say.line, content: say.content }
				);
			}
		}
		return result;
	}

	/**
	 * @param {number} index
	 * @param {{ on: string, line: number, spot?: string, strike?: boolean, point?: string, text?: string, content?: import('svelte').Snippet }} say
	 */
	add_say(index, say) {
		const id = ++this.#say_id;
		// called from an effect: registering must not make that effect depend on `says`
		untrack(() => {
			this.says[index] = [...(this.says[index] ?? []), { id, ...say }];
		});
		return id;
	}

	/**
	 * @param {number} index
	 * @param {number} id
	 */
	remove_say(index, id) {
		untrack(() => {
			this.says[index] = (this.says[index] ?? []).filter((say) => say.id !== id);
		});
	}

	/**
	 * Handwritten brackets a beat draws beside a few lines of code with `<Brace>`, by beat:
	 * "these lines are siblings".
	 * @type {Record<number, { id: number, on: string, from: number, to: number, text: string }[]>}
	 */
	brace_list = $state({});

	/**
	 * @param {number} index
	 * @param {{ on: string, from: number, to: number, text: string }} brace
	 */
	add_brace(index, brace) {
		const id = ++this.#say_id;
		// called from an effect: registering must not make that effect depend on the list
		untrack(() => {
			this.brace_list[index] = [...(this.brace_list[index] ?? []), { id, ...brace }];
		});
		return id;
	}

	/**
	 * @param {number} index
	 * @param {number} id
	 */
	remove_brace(index, id) {
		untrack(() => {
			this.brace_list[index] = (this.brace_list[index] ?? []).filter((b) => b.id !== id);
		});
	}

	/**
	 * The brackets to draw in a file now: the focused beat's.
	 * @param {string} key
	 */
	braces(key) {
		return (this.brace_list[this.focus] ?? []).filter((b) => b.on === key);
	}

	get marks() {
		return this.beats[this.focus]?.marks ?? false;
	}

	/** @param {number} index */
	is_revealed(index) {
		return index < this.progress;
	}

	/** @param {string} id */
	is_revealed_id(id) {
		const index = this.beats.findIndex((beat) => beat.id === id);
		return index !== -1 && this.is_revealed(index);
	}

	next() {
		if (this.progress >= this.beats.length) return;
		this.progress += 1;
		this.focus = this.progress - 1;
		this.running = null;
		this.scroll_to = this.focus;
		this.arrived = this.focus;
		this.save();
	}

	/** @param {number} index */
	show(index) {
		if (!this.is_revealed(index) || this.focus === index) return;
		this.focus = index;
		this.running = null;
	}

	/**
	 * @param {number} index
	 * @param {number} option
	 */
	predict(index, option) {
		this.predictions[index] = option;
		this.save();
	}

	/**
	 * @param {number} index
	 * @param {number[]} lines
	 */
	light(index, lines) {
		this.focus = index;
		this.running = { beat: index, lines };
	}

	reset() {
		this.progress = 1;
		this.focus = 0;
		this.predictions = {};
		this.running = null;
		this.hint = null;
		this.save();
		scrollTo({ top: 0 });
	}

	restore() {
		try {
			const saved = JSON.parse(localStorage.getItem(this.key) ?? 'null');
			if (!saved) return;
			if (Number.isInteger(saved.progress)) {
				this.progress = Math.min(Math.max(saved.progress, 1), this.beats.length);
				this.focus = this.progress - 1;
				this.scroll_to = this.focus;
			}
			if (saved.predictions && typeof saved.predictions === 'object') {
				this.predictions = saved.predictions;
			}
		} catch {
			// storage can be unavailable (private mode, blocked site data); progress just isn't kept
		}
	}

	save() {
		if (this.progress >= this.beats.length) write_status(this.id, 'done');
		else if (this.progress > 1) write_status(this.id, 'started');
		try {
			localStorage.setItem(
				this.key,
				JSON.stringify({ progress: this.progress, predictions: this.predictions })
			);
		} catch {
			// see restore()
		}
	}
}

/** @type {ReturnType<typeof createContext<ChapterState>>} */
export const [get_chapter, set_chapter] = createContext();

/**
 * The question a beat belongs to: its first and last beats, and the beat that starts its
 * explanation.
 * @typedef {{ number: number, first: number | null, last: number | null, answer: number | null }} StepContext
 */

const STEP = Symbol('step');

/** beats outside a question (the chapter's opening and closing) have no step */
export const get_step = () => /** @type {StepContext | undefined} */ (getContext(STEP));

/** @param {StepContext} step */
export const set_step = (step) => setContext(STEP, step);

/**
 * @typedef {object} BeatContext
 * @property {number} index
 * @property {ChapterState} chapter
 * @property {{ open: number }} hints how many of the beat's hints the reader has opened
 */

/** @type {ReturnType<typeof createContext<BeatContext>>} */
export const [get_beat, set_beat] = createContext();
