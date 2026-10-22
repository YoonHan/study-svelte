/**
 * Defines (once) a custom element with a `label` setter that remembers what it received,
 * so an experiment can tell whether Svelte set the property or fell back to an attribute.
 * @param {string} tag
 * @returns {CustomElementConstructor}
 */
export function define_widget(tag) {
	const existing = customElements.get(tag);
	if (existing) return existing;

	class Widget extends HTMLElement {
		/** @type {unknown} */
		received = undefined;
		has_received = false;

		/** @param {unknown} value */
		set label(value) {
			this.received = value;
			this.has_received = true;
		}

		get label() {
			return this.received;
		}
	}

	customElements.define(tag, Widget);
	return Widget;
}
