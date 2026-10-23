/**
 * The site's mark, the Svelte logo with a magnifying glass over its lower right, written out
 * as the two icons the site uses:
 *
 * - src/lib/assets/favicon.svg: the browser tab's icon, on no background
 * - static/apple-touch-icon.png: the icon a phone shows when the site is added to its home
 *   screen, 180 x 180, the mark on an orange square (the phone rounds the corners itself)
 *
 * The logo comes from the official file (scripts/svelte-logo.svg). The glass is only a ring and
 * a handle laid over the logo: through the lens the logo shows as it is. An ink outline goes
 * round the logo and the glass, so they stand apart from each other and from any background.
 *
 * Run after changing anything here: node scripts/icons.mjs
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

export const ORANGE = '#ff3e00';
export const INK = '#2a1208';

const logo = fs.readFileSync(new URL('svelte-logo.svg', import.meta.url), 'utf8');
const [BLOB, S] = [...logo.matchAll(/<path d="([^"]+)"/g)].map((match) => match[1]);

/**
 * The mark on a 32 x 32 grid.
 * @param {{ blob: string, s: string, glass: string, line: string }} colours
 *   the logo's body, its S, the glass's ring and handle, and the outline
 */
export function mark({ blob, s, glass, line }) {
	// the logo (107 x 128) fitted in the grid; its outline is the body's stroke drawn under
	// its fill, so only the outer half shows: about 1.1 grid units
	const scale = 0.238;
	const outline = (2 * 1.1) / scale;
	// the whole shrunk a little, so the outline (which reaches past the logo and the handle's
	// end) stays inside the grid
	return [
		`<g transform="translate(1.3 1.3) scale(.92)">`,
		`<g transform="translate(2.6 .6) scale(${scale})">`,
		`<path d="${BLOB}" fill="${blob}" stroke="${line}" stroke-width="${outline.toFixed(2)}" stroke-linejoin="round" paint-order="stroke"/>`,
		`<path d="${S}" fill="${s}"/>`,
		`</g>`,
		// the glass: its outline first (wider), then the ring and handle on top
		`<path d="M26.4 26.4 29.8 29.8" stroke="${line}" stroke-width="5.4" stroke-linecap="round"/>`,
		`<circle cx="22.4" cy="22.4" r="5.4" fill="none" stroke="${line}" stroke-width="4.4"/>`,
		`<path d="M26.4 26.4 29.8 29.8" stroke="${glass}" stroke-width="3.2" stroke-linecap="round"/>`,
		`<circle cx="22.4" cy="22.4" r="5.4" fill="none" stroke="${glass}" stroke-width="2.2"/>`,
		`</g>`
	].join('');
}

/**
 * Both icons' colours: a white body with the S and the outline in ink, the same in the tab
 * and on the orange square (an orange body would sink into the square).
 */
export const COLOURS = { blob: '#fff', s: INK, glass: '#fff', line: INK };

/** @param {Parameters<typeof mark>[0]} colours */
export function favicon(colours) {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><title>Svelte 대백과: a magnifying glass over the Svelte logo</title>${mark(colours)}</svg>\n`;
}

/**
 * The app icon as PNG bytes: drawn at four times the size and scaled down, for smooth edges.
 * @param {import('@playwright/test').Page} page
 * @param {Parameters<typeof mark>[0]} colours
 */
export async function app_icon(page, colours, size = 180) {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size * 4}" height="${size * 4}"><rect width="32" height="32" fill="${ORANGE}"/><g transform="translate(4.7 4.7) scale(.707)">${mark(colours)}</g></svg>`;
	const png = await page.evaluate(async ([svg, size]) => {
		const image = new Image();
		image.src = 'data:image/svg+xml,' + encodeURIComponent(svg);
		await image.decode();
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = size;
		const context = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
		context.imageSmoothingQuality = 'high';
		context.drawImage(image, 0, 0, size, size);
		return canvas.toDataURL('image/png').split(',')[1];
	}, /** @type {[string, number]} */ ([svg, size]));
	return Buffer.from(png, 'base64');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	fs.writeFileSync('src/lib/assets/favicon.svg', favicon(COLOURS));
	const browser = await chromium.launch();
	const page = await browser.newPage();
	fs.writeFileSync('static/apple-touch-icon.png', await app_icon(page, COLOURS));
	await browser.close();
}
