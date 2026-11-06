/**
 * The site's theme, light or dark. app.html sets `data-theme` on <html> before the first paint
 * (the reader's saved choice, else the system's); every dark rule keys off it. Choosing here
 * (the theme tab in a chapter) saves the choice for the whole site. Until the reader chooses,
 * the page follows the system as it changes.
 */

const KEY = 'svelte-inside:theme';

export const theme = $state({ dark: false });

/** @returns {string | null} */
function saved() {
	try {
		return localStorage.getItem(KEY);
	} catch {
		return null;
	}
}

/** @param {boolean} dark */
function apply(dark) {
	const root = document.documentElement;
	const swap = () => {
		root.dataset.theme = dark ? 'dark' : 'light';
		theme.dark = dark;
	};
	// the page cross-fades from one theme to the other (app.css, ::view-transition): the
	// browser keeps a picture of the old colors and fades it into the new ones. Things with a
	// color transition of their own hold it meanwhile, or they would fade twice. Where the
	// browser cannot, or the reader asks for less motion, the colors change at once.
	const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
	root.classList.add('theme-switching');
	const done = () => root.classList.remove('theme-switching');
	if (!document.startViewTransition || reduce) {
		swap();
		requestAnimationFrame(() => requestAnimationFrame(done));
		return;
	}
	document.startViewTransition(swap).finished.finally(done);
}

/** Reads the theme app.html chose, and follows the system until the reader chooses. */
export function start_theme() {
	theme.dark = document.documentElement.dataset.theme === 'dark';
	const system = matchMedia('(prefers-color-scheme: dark)');
	/** @param {MediaQueryListEvent} event */
	const follow = (event) => {
		if (!saved()) apply(event.matches);
	};
	system.addEventListener('change', follow);
	return () => system.removeEventListener('change', follow);
}

export function toggle_theme() {
	const dark = !theme.dark;
	apply(dark);
	try {
		localStorage.setItem(KEY, dark ? 'dark' : 'light');
	} catch {
		// not saved (private window): the choice holds until the page is left
	}
}
