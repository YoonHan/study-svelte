import { createContext } from 'svelte';

/**
 * Progress through one chapter. Steps unlock one at a time: a step's question is
 * visible once every earlier step's explanation has been revealed.
 */
export class ChapterState {
	/** scene id of each step, in document order */
	scenes = $state(/** @type {string[]} */ ([]));

	/** number of steps whose explanation has been revealed */
	progress = $state(0);

	/** index of the step the reader is looking at; drives the right-hand panel */
	active = $state(0);

	/** @param {string} key localStorage key used to remember progress */
	constructor(key) {
		this.key = key;
	}

	/**
	 * @param {string} scene
	 * @returns {number} the step's index
	 */
	register(scene) {
		this.scenes.push(scene);
		return this.scenes.length - 1;
	}

	/** @param {number} index */
	is_unlocked(index) {
		return index <= this.progress;
	}

	/** @param {number} index */
	is_revealed(index) {
		return index < this.progress;
	}

	/** @param {number} index */
	reveal(index) {
		this.progress = Math.max(this.progress, index + 1);
		this.active = index;
		this.save();
	}

	reset() {
		this.progress = 0;
		this.active = 0;
		this.save();
	}

	restore() {
		try {
			const saved = Number(localStorage.getItem(this.key));
			if (Number.isInteger(saved) && saved > 0) {
				this.progress = Math.min(saved, this.scenes.length);
			}
		} catch {
			// storage can be unavailable (private mode, blocked site data); progress just isn't kept
		}
	}

	save() {
		try {
			localStorage.setItem(this.key, String(this.progress));
		} catch {
			// see restore()
		}
	}
}

export const [get_chapter, set_chapter] = createContext();

/** @typedef {{ index: number, chapter: ChapterState }} StepContext */
export const [get_step, set_step] = createContext();
