/**
 * Which chapters the reader has started or finished, kept in this browser only. Storage can
 * be unavailable (private mode, blocked site data); then nothing is marked.
 *
 * @typedef {'started' | 'done'} Status
 */

/** @param {string} id */
const key = (id) => `svelte-inside:chapter-status:${id}`;

/**
 * @param {string} id
 * @returns {Status | null}
 */
export function read_status(id) {
	try {
		const value = localStorage.getItem(key(id));
		return value === 'started' || value === 'done' ? value : null;
	} catch {
		return null;
	}
}

/**
 * Records progress; a finished chapter stays finished even if it is read again.
 * @param {string} id
 * @param {Status} status
 */
export function write_status(id, status) {
	try {
		if (status === 'started' && read_status(id) === 'done') return;
		localStorage.setItem(key(id), status);
	} catch {
		// see read_status
	}
}
