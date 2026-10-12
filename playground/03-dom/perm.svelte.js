// Shared reactive state for Perm.svelte. Because this is a `.svelte.js` module,
// runes work here, and a steps script can import it to drive the component.
export const list = $state({ order: ['A', 'B', 'C', 'D', 'E'] });
