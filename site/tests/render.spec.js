import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { PNG } from 'pngjs';

/**
 * Rendering checks for the chapter page. Each one guards against a mistake that was made
 * once and is easy to make again: the page has to be drawn to see it.
 */

const CHAPTER = '/learn/1-1';
const KEY = 'svelte-inside:1-1:r4';

/** The chapters the shared checks run on: each page, and where it keeps the reader's progress. */
const CHAPTERS = [
	{ url: CHAPTER, key: KEY },
	{ url: '/learn/1-0', key: 'svelte-inside:1-0:r1' }
];

/**
 * Opens a chapter (1-1 by default) with `progress` beats revealed (all of them by default).
 * @param {import('@playwright/test').Page} page
 */
async function open(page, progress = 999, chapter = CHAPTERS[0]) {
	await page.addInitScript(
		([key, value]) => localStorage.setItem(key, value),
		[chapter.key, JSON.stringify({ progress })]
	);
	await page.goto(chapter.url);
	await page.waitForSelector('.beat');
	// the tests run side by side against a dev server that compiles on first request: wait
	// until the page has everything it asked for, not a fixed time
	await page.waitForLoadState('networkidle');
	await page.waitForTimeout(600);
}

/**
 * Colour of one pixel of a screenshot, in CSS pixels from its top left.
 * @param {Buffer} buffer
 * @param {number} x
 * @param {number} y
 */
function pixel(buffer, x, y) {
	const png = PNG.sync.read(buffer);
	const i = (png.width * Math.round(y) + Math.round(x)) * 4;
	return [png.data[i], png.data[i + 1], png.data[i + 2]];
}

/** @param {number[]} rgb */
const dark = (rgb) => rgb[0] + rgb[1] + rgb[2] < 3 * 90;

/*
 * The bug this guards against (the top-left corner left unfilled while the fill moved) showed
 * in a desktop browser but could not be reproduced in Playwright's Chromium, even with the old
 * code: this check holds the line for the new approach, it did not catch the old one.
 */
test('the next button fills its corners while the fill sweeps across', async ({ page }) => {
	await open(page, 1);
	const button = page.locator('button.next').last();
	await button.hover();

	// stop the sweep halfway and look at the part it has already passed
	const stopped = await page.evaluate(() => {
		const sweep = document
			.getAnimations()
			.find(
				(a) =>
					a.effect instanceof KeyframeEffect &&
					a.effect.pseudoElement === '::before' &&
					a.effect.target instanceof Element &&
					a.effect.target.classList.contains('next')
			);
		if (!sweep) return false;
		sweep.pause();
		sweep.currentTime = 40;
		return true;
	});
	expect(stopped, 'the fill runs as a transition').toBe(true);

	const box = await button.boundingBox();
	if (!box) throw new Error('no button');
	const shot = await button.screenshot({ scale: 'css' });
	// just inside the hand-drawn outline, near each left corner: already passed by the fill
	expect(dark(pixel(shot, 7, 6)), 'top-left corner filled').toBe(true);
	expect(dark(pixel(shot, 7, box.height - 6)), 'bottom-left corner filled').toBe(true);
	// the right edge: not reached yet
	expect(dark(pixel(shot, box.width - 7, box.height / 2)), 'right side not yet').toBe(false);
});

for (const ch of CHAPTERS) {
	test(`${ch.url}: every card opens fully inside the window, near its top and its bottom`, async ({
		page
	}) => {
		await open(page, 999, ch);
		const triggers = page.locator('.flow .popover');
		const count = await triggers.count();
		expect(count).toBeGreaterThan(0);

		for (let i = 0; i < count; i++) {
			for (const at of ['top', 'bottom']) {
				const trigger = triggers.nth(i);
				// put the words close to the top (or bottom) edge of the window
				await trigger.evaluate((el, edge) => {
					const rect = el.getBoundingClientRect();
					const target = edge === 'top' ? 40 : innerHeight - 40 - rect.height;
					scrollBy(0, rect.top - target);
				}, at);
				await page.mouse.move(0, 0);
				await trigger.hover();
				await page.waitForTimeout(220);
				const result = await trigger.evaluate((el) => {
					const card = /** @type {HTMLElement} */ (el.nextElementSibling);
					const r = card.getBoundingClientRect();
					const inside =
						r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth;
					// nothing drawn over its corners either (hit-testing needs it to take the pointer)
					card.style.pointerEvents = 'auto';
					const corners = [
						[r.left + 4, r.top + 4],
						[r.right - 4, r.top + 4],
						[r.left + 4, r.bottom - 4],
						[r.right - 4, r.bottom - 4]
					];
					const covered = corners.some(([x, y]) => !card.contains(document.elementFromPoint(x, y)));
					card.style.pointerEvents = '';
					return { inside, covered, text: el.textContent?.trim().slice(0, 40) };
				});
				expect(result.inside, `card of "${result.text}" inside the window (${at})`).toBe(true);
				// on a desktop-wide window, code in the card does not wrap
				const wrapped = await trigger.evaluate(
					(el) =>
						[...(el.nextElementSibling?.querySelectorAll('.line') ?? [])].filter((line) => {
							const height = parseFloat(getComputedStyle(line).lineHeight);
							return line.getBoundingClientRect().height > height * 1.5;
						}).length
				);
				expect(wrapped, `card of "${result.text}": wrapped code lines`).toBe(0);
				expect(result.covered, `card of "${result.text}" not covered (${at})`).toBe(false);
			}
		}
	});
}

for (const ch of CHAPTERS) {
	test(`${ch.url}: every card on the code (a reminder or a value) opens inside the window`, async ({
		page
	}) => {
		await open(page, 999, ch);
		const names = page.locator('.stage [data-recall]');
		const count = await names.count();
		test.skip(count === 0, `${ch.url} has no cards on its code`);
		for (let i = 0; i < count; i++) {
			const name = names.nth(i);
			if (!(await name.isVisible())) continue;
			await page.mouse.move(0, 0);
			await name.hover();
			await page.waitForTimeout(200);
			const result = await page.evaluate(() => {
				const card = document.querySelector('.recall-card.placed');
				if (!card) return { shown: false, inside: false };
				const r = card.getBoundingClientRect();
				return {
					shown: true,
					inside: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth
				};
			});
			const word = await name.getAttribute('data-recall');
			expect(result.shown, `card for "${word}" shown`).toBe(true);
			expect(result.inside, `card for "${word}" inside the window`).toBe(true);
		}
	});
}

for (const ch of CHAPTERS) {
	test(`${ch.url}: a pen stroke that is not drawn leaves no dot behind`, async ({ page }) => {
		await open(page, 999, ch);
		// every beat with notes, at rest (nothing pointed at)
		const beats = await page.locator('.beat').count();
		for (let i = 0; i < beats; i++) {
			await page.locator('.beat').nth(i).dispatchEvent('pointerdown');
			await page.mouse.move(0, 0);
			await page.waitForTimeout(400);
			const dots = await page.evaluate(() =>
				[...document.querySelectorAll('.pen path, .ring path, .cross path')].flatMap((path) => {
					const style = getComputedStyle(path);
					// an empty dash (offset = its length) with a round cap still paints a dot
					const hidden = parseFloat(style.strokeDashoffset) >= 0.99;
					return hidden && parseFloat(style.strokeOpacity) > 0
						? [path.closest('.bubble, .memo, .mark')?.textContent?.trim().slice(0, 20) ?? '?']
						: [];
				})
			);
			expect(dots, `beat ${i + 1}: undrawn strokes still painted`).toEqual([]);
		}
	});
}

for (const ch of CHAPTERS) {
	test(`${ch.url}: a hovered explanation is tinted right up to the pen line beside it`, async ({
		page
	}) => {
		await open(page, 999, ch);
		const beats = page.locator('.beat.explaining:has(.noted)');
		const count = await beats.count();
		expect(count).toBeGreaterThan(0);
		for (let i = 0; i < count; i++) {
			const beat = beats.nth(i);
			await beat.dispatchEvent('pointerdown');
			await page.waitForTimeout(200);
			await beat.locator('.noted').first().hover();
			await page.waitForTimeout(250);
			const gap = await beat.evaluate((el) => {
				const line =
					el.getBoundingClientRect().left + parseFloat(getComputedStyle(el, '::before').width);
				const noted = /** @type {HTMLElement} */ (el.querySelector('.noted'));
				const tint = getComputedStyle(noted, '::before');
				const left = noted.getBoundingClientRect().left + parseFloat(tint.left);
				return {
					gap: Math.round(left - line),
					painted: tint.backgroundColor !== 'rgba(0, 0, 0, 0)'
				};
			});
			expect(gap.painted, `explanation ${i + 1}: tinted on hover`).toBe(true);
			expect(
				Math.abs(gap.gap),
				`explanation ${i + 1}: tint starts at the pen line`
			).toBeLessThanOrEqual(1);
		}
	});
}

for (const ch of CHAPTERS) {
	test(`${ch.url}: a question flag is not cut off when its beat comes in`, async ({ page }) => {
		await open(page, 1, ch);
		// reveal beat by beat, as a reader does, so each beat plays its entrance
		for (let i = 0; i < 60; i++) {
			const next = page.locator('button.next').last();
			if ((await next.count()) === 0) break;
			await next.click();
			await page.waitForTimeout(120);
			const cut = await page.evaluate(() =>
				[...document.querySelectorAll('.beat.arrive .ask .flag')].flatMap((flag) => {
					// the part of the beat that is masked during its entrance must hold the flag
					let masked = flag.parentElement;
					while (masked && getComputedStyle(masked).maskImage === 'none')
						masked = masked.parentElement;
					if (!masked || masked.classList.contains('beat')) return [];
					const f = flag.getBoundingClientRect();
					const m = masked.getBoundingClientRect();
					return f.top < m.top - 1 ? [flag.textContent] : [];
				})
			);
			expect(cut, `after ${i + 2} beats: flags outside their masked part`).toEqual([]);
		}
	});
}

for (const ch of CHAPTERS) {
	test(`${ch.url}: words that point at code mark it when pointed at`, async ({ page }) => {
		await open(page, 999, ch);
		const words = page.locator('.flow .look, .flow .point');
		const count = await words.count();
		test.skip(count === 0, `${ch.url} has no words that point at code`);
		for (let i = 0; i < count; i++) {
			const word = words.nth(i);
			const what = (await word.textContent())?.trim().slice(0, 30);
			await word.evaluate((el) => {
				el.closest('.beat')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
				el.scrollIntoView({ block: 'center' });
			});
			await page.waitForTimeout(500);
			await page.mouse.move(0, 0);
			await word.hover();
			await page.waitForTimeout(250);
			const marked = await word.evaluate((el) => {
				if (el.classList.contains('look')) {
					const marks = [...document.querySelectorAll('.look-mark')];
					return (
						marks.length > 0 &&
						marks.every((m) => {
							const block = m.parentElement?.getBoundingClientRect();
							const r = m.getBoundingClientRect();
							// a circle around the code, a little past it (ring_box), inside its block
							return (
								block && r.left >= block.left - 16 && r.right <= block.right + 16 && r.width > 0
							);
						})
					);
				}
				// a part of the code stage: marks circled, or unknown parts tinted
				return (
					document.querySelectorAll('.stage .pointing-marks').length > 0 ||
					document.querySelectorAll('.stage .closed.pointed').length > 0
				);
			});
			expect(marked, `"${what}" marks its code`).toBe(true);
		}
	});
}

/**
 * Every control a reader can press answers the pointer: its look changes on hover. Compares
 * a screenshot of each control before and after the pointer moves onto it.
 * @param {import('@playwright/test').Page} page
 */
async function silent_controls(page) {
	const controls = page.locator(
		// a chosen option (a flag already picked, a bit already on) needs no hover of its own
		'button:not([disabled]):not([aria-checked="true"]):visible, a[href]:visible, [role="radio"]:not([aria-checked="true"]):visible'
	);
	const count = await controls.count();
	/** @type {string[]} */
	const silent = [];
	for (let i = 0; i < count; i++) {
		const control = controls.nth(i);
		// bring its beat into focus first, so a faded beat brightening does not count as hover
		await control.evaluate((el) => {
			el.closest('.beat')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
			el.scrollIntoView({ block: 'center', behavior: 'instant' });
		});
		await page.mouse.move(0, 0);
		await page.waitForTimeout(400);
		const name = await control.evaluate(
			(el) =>
				`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} "${el.textContent?.trim().slice(0, 24)}"`
		);
		const view = page.viewportSize() ?? { width: 0, height: 0 };
		let box = await control.boundingBox();
		if (box && (box.y < 0 || box.y + box.height > view.height)) {
			// a sticky or scrolled container may have moved it: try once more
			await control.scrollIntoViewIfNeeded();
			await page.waitForTimeout(300);
			box = await control.boundingBox();
		}
		if (!box || box.width < 2 || box.height < 2) continue;
		if (
			box.y < 0 ||
			box.x < 0 ||
			box.y + box.height > view.height ||
			box.x + box.width > view.width
		) {
			silent.push(`${name} (could not be brought into view)`);
			continue;
		}
		const clip = { x: box.x - 2, y: box.y - 2, width: box.width + 4, height: box.height + 4 };
		const before = await page.screenshot({ clip });
		await control.hover();
		await page.waitForTimeout(400);
		const after = await page.screenshot({ clip });
		if (before.equals(after)) silent.push(name);
	}
	return silent;
}

test('every button and link on the home page answers the pointer', async ({ page }) => {
	await page.goto('/');
	await page.waitForTimeout(3200);
	expect(await silent_controls(page)).toEqual([]);
});

for (const ch of CHAPTERS) {
	test(`${ch.url}: every button and link in the chapter answers the pointer`, async ({ page }) => {
		await open(page, 999, ch);
		expect(await silent_controls(page)).toEqual([]);
	});
}

test('the question marks on an unknown part visibly move', async ({ page }) => {
	await open(page, 12);
	const fog = page.locator('.stage .closed .box').first();
	await fog.scrollIntoViewIfNeeded();
	await page.mouse.move(0, 0);
	const box = await fog.boundingBox();
	if (!box) throw new Error('no unknown part on the stage');
	const clip = { x: box.x - 16, y: box.y - 6, width: box.width + 32, height: box.height + 12 };
	const first = await page.screenshot({ clip });
	await page.waitForTimeout(900);
	const later = await page.screenshot({ clip });
	expect(first.equals(later), 'the marks look the same 0.9s later').toBe(false);
});

for (const ch of CHAPTERS) {
	test(`${ch.url}: a source card for a name highlights the line with that name`, async ({
		page
	}) => {
		await open(page, 999, ch);
		const misses = await page.evaluate(() =>
			[...document.querySelectorAll('.flow .popover > .words')].flatMap((code) => {
				const card = code.parentElement?.nextElementSibling;
				if (!card?.querySelector('.line')) return []; // no code in this card
				// `$.set_custom_element_data` is `set_custom_element_data` in its own file
				const name = (code.textContent ?? '').trim().replace(/^\$\./, '').replace(/\(\)$/, '');
				const focus = [...card.querySelectorAll('.line.focus')];
				if (focus.length === 0) return [`"${name}": no highlighted line`];
				// a file and its lines ("src/constants.js:1-12"), or a passage ("질문 1의 해설"), only
				// needs a highlighted line; a name must be on it
				if (/[/:]/.test(name) || code.tagName !== 'CODE') return [];
				// `EACH_*` names a family: a highlighted line must start one of its names
				const part = name.endsWith('*') ? name.slice(0, -1) : name;
				return focus.some((line) => line.textContent?.includes(part))
					? []
					: [`"${name}": the highlighted line does not contain it`];
			})
		);
		expect(misses).toEqual([]);
	});
}

test('a chosen option keeps its colour when pointed at', async ({ page }) => {
	await open(page, 21);
	const option = page.locator('.beat:not(.past) .option').first();
	await option.click();
	await page.mouse.move(0, 0);
	await page.waitForTimeout(300);
	const before = await option.evaluate((el) => getComputedStyle(el).borderColor);
	await option.hover();
	await page.waitForTimeout(300);
	const after = await option.evaluate((el) => getComputedStyle(el).borderColor);
	expect(after).toBe(before);
});

for (const ch of CHAPTERS) {
	test(`${ch.url}: every note on the code points at what it is about`, async ({ page }) => {
		await open(page, 999, ch);
		const beats = await page.locator('.beat').count();
		for (let i = 0; i < beats; i++) {
			await page.locator('.beat').nth(i).dispatchEvent('pointerdown');
			await page.mouse.move(0, 0);
			await page.waitForTimeout(1600);
			const misses = await page.evaluate(() => {
				/** boxes of a run of text, one per visual line */
				const per_line = (/** @type {DOMRectList} */ rects) => {
					const lines = new Map();
					for (const r of rects) {
						if (r.width === 0) continue;
						const k = Math.round(r.top);
						const l = lines.get(k);
						if (l) {
							l.left = Math.min(l.left, r.left);
							l.right = Math.max(l.right, r.right);
							l.bottom = Math.max(l.bottom, r.bottom);
						} else lines.set(k, { top: r.top, bottom: r.bottom, left: r.left, right: r.right });
					}
					return [...lines.values()].sort((a, b) => a.top - b.top);
				};
				/** where `text` is drawn inside `root` */
				const find = (/** @type {Element} */ root, /** @type {string} */ text) => {
					const range = document.createRange();
					const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
					let all = '';
					const nodes = [];
					while (walker.nextNode()) {
						nodes.push([walker.currentNode, all.length]);
						all += walker.currentNode.nodeValue;
					}
					const at = all.indexOf(text);
					if (at === -1) return [];
					const locate = (/** @type {number} */ pos, /** @type {boolean} */ end) => {
						for (const [node, from] of nodes) {
							const to = from + node.nodeValue.length;
							if (end ? pos <= to : pos < to) return [node, pos - from];
						}
					};
					range.setStart(...locate(at, false));
					range.setEnd(...locate(at + text.length, true));
					return per_line(range.getClientRects());
				};

				const slots = [...document.querySelectorAll('.stage .bubble-slot')];
				return slots.flatMap((slot) => {
					const row = slot
						.closest('.listing')
						?.querySelector(`.row[data-line="${slot.getAttribute('data-line')}"]`);
					const arrow = slot.querySelector('.arrow');
					if (!row || !arrow) return [];
					const where = `line ${row.getAttribute('data-line')} "${slot.textContent?.trim()}"`;

					// every note names what it points at
					const spot = row.querySelector('.spot');
					const point = slot.getAttribute('data-point');
					const box = row.querySelector('.box');
					const targets = spot
						? per_line(spot.getClientRects())
						: point
							? find(row.querySelector('.ink'), point)
							: box
								? per_line(box.getClientRects())
								: [];
					if (targets.length === 0)
						return [`${where}: names no target (or its point is not in the line)`];

					// the tip lands on the target: on the last visual line from below, or on the first
					// visual line from above
					const lines = per_line((row.querySelector('.ink') ?? box).getClientRects());
					const near = (top) => (t) => Math.abs(t.top - top) < 4;
					const below = targets.find(near(lines[lines.length - 1].top));
					const over = targets.find(near(lines[0].top));
					// a note asked to hang over its line (`above`) points down at the first row
					const asked = slot.getAttribute('data-side') === 'above';
					const target = asked ? over : (below ?? over);
					if (!target) return [`${where}: target is on a middle visual line`];
					const above = slot.classList.contains('above');
					if (above !== (asked || !below)) return [`${where}: hangs on the wrong side of its line`];
					const a = arrow.getBoundingClientRect();
					const flipped = slot.hasAttribute('data-flip');
					const tip = {
						x: flipped ? a.right - 6 : a.left + 6,
						y: above ? a.bottom - 3 : a.top + 3
					};
					const edge = above ? target.top : target.bottom;
					const problems = [];
					if (tip.x < target.left || tip.x > target.right)
						problems.push(
							`${where}: tip x ${Math.round(tip.x)} outside ${Math.round(target.left)}-${Math.round(target.right)}`
						);
					if (Math.abs(tip.y - edge) > 5)
						problems.push(`${where}: tip y ${Math.round(tip.y)} not at ${Math.round(edge)}`);

					// and no arrow runs through another note's words
					for (const other of slots) {
						if (other === slot) continue;
						const words = other.querySelector('.t')?.getBoundingClientRect();
						if (!words) continue;
						const overlap =
							a.left + 4 < words.right &&
							a.right - 4 > words.left &&
							a.top + 4 < words.bottom &&
							a.bottom - 4 > words.top;
						if (overlap) problems.push(`${where}: arrow crosses "${other.textContent?.trim()}"`);
					}
					return problems;
				});
			});
			expect(misses, `beat ${i + 1}`).toEqual([]);
		}
	});
}

test('a node that is dropped is crossed out with a small X at its middle', async ({ page }) => {
	await open(page);
	const cut = page.locator('figure.cut');
	await cut.scrollIntoViewIfNeeded();
	// the beat being read (others are dimmed), then the cut plays again
	await page.locator('.beat:has(figure.cut)').dispatchEvent('pointerdown');
	await cut.locator('button.again').click();
	await page.mouse.move(0, 0);
	await page.waitForTimeout(3200);
	const gone = await cut.evaluate((figure) =>
		[...figure.querySelectorAll('.chip.gone')].map((chip) => {
			const name = /** @type {HTMLElement} */ (chip.querySelector('.name'));
			const strokes = [...chip.querySelectorAll('.cross path')];
			const c = chip.getBoundingClientRect();
			const x = /** @type {SVGElement} */ (chip.querySelector('.cross')).getBoundingClientRect();
			// within the node: the beat around it may be dimmed while it is not being read
			let faded = 1;
			for (
				let el = /** @type {Element | null} */ (strokes[0]);
				el && el !== chip.parentElement;
				el = el.parentElement
			)
				faded *= parseFloat(getComputedStyle(el).opacity);
			return {
				label: name.textContent,
				// the label itself is left as it is, not struck through
				through: [chip, name].some((el) =>
					getComputedStyle(el).textDecorationLine.includes('line-through')
				),
				strokes: strokes.length,
				drawn: strokes.every((path) => {
					const style = getComputedStyle(path);
					return parseFloat(style.strokeDashoffset) < 0.01 && style.strokeOpacity === '1';
				}),
				// small, and over the middle of the node
				small: x.width <= 18 && x.height <= 18,
				centred:
					Math.abs(x.left + x.width / 2 - (c.left + c.width / 2)) <= 1.5 &&
					Math.abs(x.top + x.height / 2 - (c.top + c.height / 2)) <= 1.5,
				faded
			};
		})
	);
	expect(gone.length).toBeGreaterThan(0);
	for (const node of gone) {
		expect(node.through, `${node.label}: label not struck through`).toBe(false);
		expect(node.strokes, `${node.label}: an X of two strokes`).toBe(2);
		expect(node.drawn, `${node.label}: both strokes written`).toBe(true);
		expect(node.small, `${node.label}: a small X`).toBe(true);
		expect(node.centred, `${node.label}: X over the middle`).toBe(true);
		expect(node.faded, `${node.label}: X in full colour`).toBe(1);
	}
});

/*
 * Fonts (scripts/fonts.mjs): text is drawn in its own font from the first paint, never in a
 * fallback first. That needs the fonts to come from this site, wait for them (block), be
 * fetched with the page when the first screen uses them, and hold every character shown.
 */

test('fonts come from this site and text waits for them', async ({ page }) => {
	/** @type {string[]} */
	const elsewhere = [];
	page.on('request', (request) => {
		if (request.resourceType() === 'font' && !request.url().startsWith('http://localhost'))
			elsewhere.push(request.url());
	});
	for (const url of ['/', ...CHAPTERS.map((c) => c.url)]) {
		await page.goto(url);
		await page.waitForTimeout(1500);
		const faces = await page.evaluate(() =>
			[...document.fonts].map((face) => `${face.family} ${face.weight} ${face.display}`)
		);
		expect(faces.length, `${url}: faces declared`).toBeGreaterThan(0);
		for (const face of faces) expect(face, `${url}: waits for its font`).toMatch(/ block$/);
	}
	expect(elsewhere, 'fonts fetched from another site').toEqual([]);
});

test('the fonts of the first screen are fetched with the page', async ({ page }) => {
	for (const url of ['/', ...CHAPTERS.map((c) => c.url)]) {
		// a first visit: nothing revealed yet
		await page.goto(url);
		await page.waitForTimeout(1500);
		const missing = await page.evaluate(() => {
			/** @type {{ family: string, weight: string, url: string }[]} */
			const faces = [];
			for (const sheet of document.styleSheets) {
				/** @type {CSSRuleList} */
				let rules;
				try {
					rules = sheet.cssRules;
				} catch {
					continue; // another site's stylesheet: its fonts are not preloaded here
				}
				for (const rule of rules)
					if (rule instanceof CSSFontFaceRule) {
						const style = rule.style;
						const src = style.getPropertyValue('src').match(/url\("?([^")]+)"?\)/)?.[1];
						faces.push({
							family: style.getPropertyValue('font-family').replace(/['"]/g, ''),
							weight: style.getPropertyValue('font-weight'),
							url: new URL(src ?? '', sheet.href ?? location.href).href
						});
					}
			}
			const preloaded = new Set(
				[...document.querySelectorAll('link[rel=preload][as=font]')].map(
					(link) => /** @type {HTMLLinkElement} */ (link).href
				)
			);

			/** @param {string} family @param {number} weight */
			const face_of = (family, weight) => {
				const mine = faces.filter((f) => f.family === family);
				if (mine.length <= 1) return mine[0];
				return mine.find((f) => {
					const [from, to = from] = f.weight.split(' ').map(Number);
					return weight >= from && weight <= to;
				});
			};

			/** @type {Set<string>} */
			const missing = new Set();
			const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
			for (let node = walker.nextNode(); node; node = walker.nextNode()) {
				const text = node.textContent ?? '';
				const element = node.parentElement;
				if (!text.trim() || !element || element.closest('script, style')) continue;
				const range = document.createRange();
				range.selectNodeContents(node);
				const box = range.getBoundingClientRect();
				// drawn, and on the first screen
				if (!box.width || box.bottom < 0 || box.top > innerHeight) continue;
				const style = getComputedStyle(element);
				if (style.visibility === 'hidden') continue;
				const family = style.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
				const face = face_of(family, Number(style.fontWeight));
				// Latin-only text does not reach the Korean code face behind the Latin one
				const korean = /[\u3131-\u318e\uac00-\ud7a3]/.test(text);
				const code_kr =
					family === 'Inside Mono' && korean ? face_of('Inside Code KR', 400) : undefined;
				// a face declared somewhere this page cannot read (another site's stylesheet)
				if (!face && [...document.fonts].some((f) => f.family.replace(/['"]/g, '') === family))
					missing.add(`${family}: from another site`);
				for (const f of [face, code_kr])
					if (f && !preloaded.has(f.url))
						missing.add(`${f.family} ${f.weight}: "${text.trim().slice(0, 20)}"`);
			}
			return [...missing];
		});
		expect(missing, `${url}: first-screen fonts not preloaded`).toEqual([]);
	}
});

test('every character a page shows is in the fonts', async ({ page }) => {
	const chars = new Set(fs.readFileSync('src/lib/fonts/chars.txt', 'utf-8'));
	for (const url of ['/', ...CHAPTERS.map((c) => c.url)]) {
		const chapter = CHAPTERS.find((c) => c.url === url);
		if (chapter) await open(page, 999, chapter);
		else await page.goto(url);
		await page.waitForTimeout(1500);
		// all text in the page, cards and other closed parts included
		const shown = await page.evaluate(() => {
			let all = '';
			const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
			for (let node = walker.nextNode(); node; node = walker.nextNode())
				if (!node.parentElement?.closest('script, style')) all += node.textContent;
			return all;
		});
		const outside = [...new Set(shown)].filter((c) => !/\s/.test(c) && !chars.has(c));
		expect(outside, `${url}: characters no font file has`).toEqual([]);
	}
});

test('a page stays hidden until the fonts of its first screen are in', async ({ page }) => {
	// fonts that take a while: the page must not show anything drawn without them
	await page.route(/\.woff2/, async (route) => {
		await new Promise((resolve) => setTimeout(resolve, 1500));
		await route.continue();
	});
	const cdp = await page.context().newCDPSession(page);
	for (const url of ['/', ...CHAPTERS.map((c) => c.url)]) {
		const start = Date.now();
		await page.goto(url, { waitUntil: 'commit' });
		while (Date.now() - start < 900) await page.waitForTimeout(20);
		// the browser's own capture: Playwright's screenshot would wait for the fonts first
		const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
		const png = PNG.sync.read(Buffer.from(data, 'base64'));
		const paper = [png.data[0], png.data[1], png.data[2]].join();
		let drawn = 0;
		for (let i = 0; i < png.data.length; i += 4)
			if ([png.data[i], png.data[i + 1], png.data[i + 2]].join() !== paper) drawn++;
		expect(drawn, `${url}: pixels drawn before the fonts came in`).toBe(0);
		// and it does show once they are in
		await page.waitForFunction(() => !document.documentElement.classList.contains('fonts-wait'));
	}
});

test('the cut plays in order: the statement, then the panel below, then the cut in it', async ({
	page
}) => {
	await open(page);
	const cut = page.locator('figure.cut');
	await cut.scrollIntoViewIfNeeded();
	await page.locator('.beat:has(figure.cut)').dispatchEvent('pointerdown');
	await cut.locator('button.again').click();
	await page.waitForTimeout(50);
	// replayed: the statement and the panel below are gone until their turn
	const hidden = await cut.evaluate((figure) =>
		['.step .code', '.result'].map(
			(s) => getComputedStyle(/** @type {Element} */ (figure.querySelector(s))).opacity
		)
	);
	expect(hidden, 'statement and result hidden at the start').toEqual(['0', '0']);

	await page.waitForTimeout(3200);
	const acts = await cut.evaluate((figure) => {
		/** @param {string} list */
		const ms = (list) =>
			list.split(',').map((t) => parseFloat(t) * (t.trim().endsWith('ms') ? 1 : 1000));
		/** @param {Element} el */
		const span = (el) => {
			const style = getComputedStyle(el);
			const delays = ms(style.transitionDelay);
			const durations = ms(style.transitionDuration);
			return {
				start: Math.min(...delays),
				end: Math.max(...durations.map((d, i) => d + delays[i % delays.length]))
			};
		};
		/** @param {string} selector */
		const all = (selector) => [...figure.querySelectorAll(selector)].map(span);
		const step = all('.step .down path, .step .code');
		const result = all('.result');
		const cutting = all('.result .chip.gone, .result .chip.gone .cross path');
		const tag = all('.result .tag');
		const top = /** @type {Element} */ (figure.querySelector('.panel:not(.result)'));
		return {
			step_end: Math.max(...step.map((s) => s.end)),
			result_start: Math.min(...result.map((s) => s.start)),
			result_end: Math.max(...result.map((s) => s.end)),
			cut_start: Math.min(...cutting.map((s) => s.start)),
			cut_end: Math.max(...cutting.map((s) => s.end)),
			tag_start: Math.min(...tag.map((s) => s.start)),
			// the parsed fragment above keeps all its children, untouched
			top: {
				children: top.querySelectorAll('.chip').length,
				struck: top.querySelectorAll('.gone, .cross').length
			},
			shown: ['.step .code', '.result', '.result .tag'].map(
				(s) => getComputedStyle(/** @type {Element} */ (figure.querySelector(s))).opacity
			)
		};
	});
	expect(acts.top, 'the fragment above is left whole').toEqual({ children: 5, struck: 0 });
	expect(acts.result_start, 'panel below after the statement').toBeGreaterThanOrEqual(
		acts.step_end
	);
	expect(acts.cut_start, 'cut after the panel below is in').toBeGreaterThanOrEqual(acts.result_end);
	expect(acts.tag_start, 'the words after the last X').toBeGreaterThanOrEqual(acts.cut_end);
	expect(acts.shown, 'all shown in the end').toEqual(['1', '1', '1']);
});

test('the value passed in the custom element experiment is circled, for either choice', async ({
	page
}) => {
	await open(page);
	const lab = page.locator('.beat:has(.table-wrap)');
	await lab.scrollIntoViewIfNeeded();
	await lab.dispatchEvent('pointerdown');
	const flags = lab.locator('.flag, [role=tab], button').filter({ hasText: /문자열|객체/ });
	for (const [choice, text] of [
		['문자열', '"hello"'],
		['객체', '{ items: [1, 2, 3] }']
	]) {
		await flags.filter({ hasText: choice }).first().click();
		await page.waitForTimeout(700);
		const fit = await lab.evaluate((beat, text) => {
			const pre = /** @type {HTMLElement} */ (beat.querySelector('pre.hl'));
			const ring = pre.querySelector('svg.ring path');
			if (!ring) return 'no circle';
			// where the value is drawn, from its text
			const walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
			let all = '';
			/** @type {[Text, number][]} */
			const nodes = [];
			while (walker.nextNode()) {
				const node = /** @type {Text} */ (walker.currentNode);
				nodes.push([node, all.length]);
				all += node.data;
			}
			const at = all.indexOf(text);
			/** @param {number} pos */
			const find = (pos) => {
				const [node, from] = /** @type {[Text, number]} */ (
					nodes.findLast(([, from]) => from <= pos)
				);
				return /** @type {[Text, number]} */ ([node, pos - from]);
			};
			const range = document.createRange();
			range.setStart(...find(at));
			range.setEnd(...find(at + text.length - 1));
			range.setEnd(range.endContainer, range.endOffset + 1);
			const t = range.getBoundingClientRect();
			const r = ring.getBoundingClientRect();
			const style = getComputedStyle(ring);
			if (parseFloat(style.strokeDashoffset) > 0.01) return 'not drawn';
			// around the value: the letters at both ends (their glyphs, about the middle 45% of the
			// line's height) inside the ring as drawn, so its curve does not cut through them
			const svg = /** @type {SVGPathElement} */ (ring);
			const to_ring = /** @type {DOMMatrix} */ (svg.getScreenCTM()).inverse();
			const inside = (/** @type {number} */ x, /** @type {number} */ y) =>
				svg.isPointInFill(new DOMPoint(x, y).matrixTransform(to_ring));
			const glyph = t.height * 0.22;
			const mid = t.top + t.height / 2;
			const around = [t.left, t.right].every(
				(x) => inside(x, mid - glyph) && inside(x, mid + glyph)
			);
			const close = r.width <= t.width * 1.2 + 30 && r.height <= t.height + 20;
			return around && close ? 'ok' : `ring ${JSON.stringify(r)} text ${JSON.stringify(t)}`;
		}, text);
		expect(fit, `${choice}: circle around ${text}`).toBe('ok');

		// and drawn all the way round: pen-coloured ink at its left and right ends
		const ring = lab.locator('pre.hl svg.ring');
		const box = /** @type {{ x: number, y: number, width: number, height: number }} */ (
			await ring.boundingBox()
		);
		const shot = await page.screenshot({ clip: box });
		const png = PNG.sync.read(shot);
		/** @param {number} from @param {number} to */
		const inked = (from, to) => {
			for (let x = Math.floor(from * png.width); x < to * png.width; x++)
				for (let y = 0; y < png.height; y++) {
					const i = (png.width * y + x) * 4;
					const [r, g, b] = [png.data[i], png.data[i + 1], png.data[i + 2]];
					if (r > 180 && r - b > 90 && r - g > 50) return true;
				}
			return false;
		};
		expect(inked(0, 0.08), `${choice}: circle drawn on the left`).toBe(true);
		expect(inked(0.92, 1), `${choice}: circle drawn on the right`).toBe(true);
	}
});

test('running the custom element experiment fills the table from the top, and the button goes', async ({
	page
}) => {
	await open(page);
	const lab = page.locator('.beat:has(.table-wrap)');
	await lab.scrollIntoViewIfNeeded();
	await lab.dispatchEvent('pointerdown');
	const columns = () =>
		lab.evaluate((beat) =>
			[...beat.querySelectorAll('thead th')].map((th) =>
				Math.round(th.getBoundingClientRect().width)
			)
		);
	const before = await columns();
	await lab.locator('button.run').click();
	await page.waitForTimeout(80);
	// while it comes in: each row starts after the one above it, and the top is further along
	const early = await lab.evaluate((beat) =>
		[...beat.querySelectorAll('tbody tr')].map((tr) => {
			const value = /** @type {HTMLElement} */ (tr.querySelector('.value'));
			const style = getComputedStyle(value);
			return {
				name: style.animationName,
				delay: parseFloat(style.animationDelay) * (style.animationDelay.endsWith('ms') ? 1 : 1000)
			};
		})
	);
	expect(early.every((row) => row.name === 'cascade')).toBe(true);
	for (let i = 1; i < early.length; i++)
		expect(early[i].delay, `row ${i + 1} after row ${i}`).toBeGreaterThan(early[i - 1].delay);

	await page.waitForTimeout(1200);
	expect(await lab.locator('button.run').count(), 'run button gone once run').toBe(0);
	const shown = await lab.evaluate((beat) =>
		[...beat.querySelectorAll('tbody .value')].map((v) => getComputedStyle(v).opacity)
	);
	expect(new Set(shown), 'all results shown').toEqual(new Set(['1']));
	// the table kept its shape while the results came in
	expect(await columns(), 'column widths unchanged by the results').toEqual(before);
});

test('a link to another site opens in a new tab', async ({ page, context }) => {
	await open(page);
	const link = page.locator('.flow a[href^="http"]').first();
	await link.scrollIntoViewIfNeeded();
	await link.evaluate((el) =>
		el.closest('.beat')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
	);
	// the new tab is not loaded: only that one opens, and this page stays where it is
	await context.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
	const [tab] = await Promise.all([context.waitForEvent('page'), link.click()]);
	expect(tab, 'opened in a new tab').toBeTruthy();
	expect(new URL(page.url()).pathname).toBe(CHAPTER);
	await tab.close();
});

test('the mount experiment keeps its height as it runs', async ({ page }) => {
	await open(page);
	const lab = page.locator('.beat:has(.panes .closure)');
	await lab.scrollIntoViewIfNeeded();
	await lab.dispatchEvent('pointerdown');
	const height = async () =>
		Math.round(/** @type {{ height: number }} */ (await lab.boundingBox()).height);
	const heights = [await height()];
	await lab.getByRole('button', { name: /모듈 불러오기/ }).click();
	await page.waitForTimeout(300);
	heights.push(await height());
	for (let i = 0; i < 4; i++) {
		await lab.getByRole('button', { name: /카운터 마운트/ }).click();
		await page.waitForTimeout(300);
		heights.push(await height());
	}
	expect(new Set(heights).size, `heights ${heights.join(', ')}`).toBe(1);
});

test("node's value in the mount experiment breaks only between children", async ({ page }) => {
	await open(page);
	const lab = page.locator('.beat:has(.panes .closure)');
	await lab.scrollIntoViewIfNeeded();
	await lab.dispatchEvent('pointerdown');
	await lab.getByRole('button', { name: /모듈 불러오기/ }).click();
	await lab.getByRole('button', { name: /카운터 마운트/ }).click();
	await page.waitForTimeout(300);
	const split = await lab.evaluate((beat) =>
		[...beat.querySelectorAll('.closure dd .part')]
			.filter((part) => part.getClientRects().length > 1)
			.map((part) => part.textContent)
	);
	expect(split, 'children broken across lines').toEqual([]);
	// and the value still fits its cell: it does break, between children
	for (const width of [1280, 390]) {
		await page.setViewportSize({ width, height: 900 });
		await page.waitForTimeout(200);
		const over = await lab.evaluate((beat) => {
			const dd = /** @type {HTMLElement} */ (beat.querySelector('.closure dd.swap'));
			return dd.scrollWidth - dd.clientWidth;
		});
		expect(over, `${width}px: node's value overflows its cell`).toBeLessThanOrEqual(0);
	}
});

for (const ch of CHAPTERS) {
	test(`${ch.url}: every note on the stage is in view when its beat is read`, async ({ page }) => {
		await open(page, 999, ch);
		const beats = await page.locator('.beat').count();
		/** @type {string[]} */
		const hidden = [];
		for (let i = 0; i < beats; i++) {
			await page.locator('.beat').nth(i).dispatchEvent('pointerdown');
			await page.mouse.move(0, 0);
			await page.waitForTimeout(900);
			const out = await page.evaluate(() =>
				[...document.querySelectorAll('.stage .scroller')]
					.flatMap((scroller) => {
						const view = scroller.getBoundingClientRect();
						return [...scroller.querySelectorAll('.bubble-slot:not(.printed)')].flatMap((slot) => {
							const r = slot.getBoundingClientRect();
							if (r.height === 0) return [];
							const seen = r.top >= view.top - 1 && r.bottom <= view.bottom + 1;
							return seen ? [] : [`line ${slot.getAttribute('data-line')}`];
						});
					})
					.concat(
						// a beat that numbers lines (the job they do) shows at least one of them
						[...document.querySelectorAll('.stage .scroller')].flatMap((scroller) => {
							const view = scroller.getBoundingClientRect();
							const badges = [...scroller.querySelectorAll('.badge')];
							if (badges.length === 0) return [];
							const one = badges.some((b) => {
								const r = b.getBoundingClientRect();
								return r.top >= view.top - 1 && r.bottom <= view.bottom + 1;
							});
							return one ? [] : ['no numbered line'];
						})
					)
			);
			if (out.length) hidden.push(`beat ${i + 1}: ${out.join(', ')}`);
		}
		expect(hidden, 'notes out of the stage view').toEqual([]);
	});
}

for (const ch of CHAPTERS) {
	test(`${ch.url}: every file on the stage shows its file type`, async ({ page }) => {
		await open(page, 999, ch);
		const beats = await page.locator('.beat').count();
		/** @type {Set<string>} */
		const missing = new Set();
		for (let i = 0; i < beats; i++) {
			await page.locator('.beat').nth(i).dispatchEvent('pointerdown');
			await page.waitForTimeout(150);
			for (const name of await page.evaluate(() =>
				[...document.querySelectorAll('.stage figcaption')]
					.filter((caption) => !caption.querySelector('svg'))
					.map((caption) => caption.textContent?.trim() ?? '')
			))
				missing.add(name);
		}
		expect([...missing], 'file names without their type icon').toEqual([]);
	});
}

for (const ch of CHAPTERS) {
	test(`${ch.url}: on a phone, a card opens as a sheet from the bottom`, async ({ browser }) => {
		const context = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true
		});
		const page = await context.newPage();
		await open(page, 999, ch);
		const words = page.locator('.flow .popover').first();
		await words.scrollIntoViewIfNeeded();
		await words.tap();
		await page.waitForTimeout(450);
		const sheet = await page.evaluate(() => {
			const card = document.querySelector('.card:popover-open');
			if (!card) return null;
			const r = card.getBoundingClientRect();
			return {
				sheet: card.hasAttribute('data-sheet'),
				bottom: Math.round(innerHeight - r.bottom),
				width: Math.round(r.width - innerWidth)
			};
		});
		expect(sheet, 'a card opened').not.toBeNull();
		expect(sheet).toEqual({ sheet: true, bottom: 0, width: 0 });
		// a tap outside it puts it away
		await page.touchscreen.tap(195, 40);
		await page.waitForTimeout(450);
		expect(await page.locator('.card:popover-open').count(), 'closed by a tap outside').toBe(0);
		await context.close();
	});
}

test('the home logo is drawn in metal and gives way under the pointer', async ({ page }) => {
	await page.goto('/');
	await page.waitForSelector('.logo canvas.ready', { timeout: 15000 });
	await page.mouse.move(0, 0);
	await page.waitForTimeout(600);
	const logo = page.locator('.logo');
	const box = /** @type {{ x: number, y: number, width: number, height: number }} */ (
		await logo.boundingBox()
	);
	const rest = await page.screenshot({ clip: box });
	// drawn: plenty of the logo's orange, in more than one shade (lit metal, not a flat fill)
	const png = PNG.sync.read(rest);
	/** @type {Set<string>} */
	const shades = new Set();
	let orange = 0;
	for (let i = 0; i < png.data.length; i += 4) {
		const [r, g, b] = [png.data[i], png.data[i + 1], png.data[i + 2]];
		if (r > 150 && r - b > 80 && r > g) {
			orange++;
			shades.add(`${r >> 4},${g >> 4},${b >> 4}`);
		}
	}
	expect(orange, 'orange metal drawn').toBeGreaterThan(png.width * png.height * 0.08);
	expect(shades.size, 'shaded like metal, not one flat colour').toBeGreaterThan(20);
	// pointed at near its top right corner, it tips: the picture changes
	await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.2);
	await page.waitForTimeout(700);
	const pressed = await page.screenshot({ clip: box });
	expect(pressed.equals(rest), 'the logo moves under the pointer').toBe(false);
});

test('the home logo stays quietly alive at rest, and still with reduced motion', async ({
	browser
}) => {
	for (const reducedMotion of /** @type {const} */ (['no-preference', 'reduce'])) {
		const context = await browser.newContext({ reducedMotion });
		const page = await context.newPage();
		await page.goto('/');
		await page.waitForSelector('.logo canvas.ready', { timeout: 15000 });
		await page.mouse.move(0, 0);
		const box = /** @type {{ x: number, y: number, width: number, height: number }} */ (
			await page.locator('.logo').boundingBox()
		);
		await page.waitForTimeout(500);
		const first = await page.screenshot({ clip: box });
		await page.waitForTimeout(1500);
		const later = await page.screenshot({ clip: box });
		if (reducedMotion === 'reduce') expect(later.equals(first), 'still').toBe(true);
		else expect(later.equals(first), 'its sheen flows at rest').toBe(false);
		await context.close();
	}
});

/*
 * A link that takes the reader somewhere (.pen-go) answers the pointer twice: its words turn
 * the accent colour and its arrow moves right. A page's own colour for such a link once
 * outweighed the hover colour, so only the arrow moved.
 */
for (const where of [{ url: '/' }, ...CHAPTERS]) {
	test(`${where.url}: every link that takes you somewhere changes colour and moves its arrow on hover`, async ({
		page
	}) => {
		if ('key' in where) await open(page, 999, where);
		else {
			await page.goto(where.url);
			await page.waitForTimeout(3200);
		}
		const links = page.locator('a.pen-go:visible');
		const count = await links.count();
		// 1-1 has none while the next chapter is not ready
		test.skip(count === 0, 'no link that takes you somewhere on this page yet');
		const accent = await page.evaluate(() => {
			const probe = document.createElement('span');
			probe.style.color = 'var(--accent)';
			document.body.append(probe);
			const colour = getComputedStyle(probe).color;
			probe.remove();
			return colour;
		});
		const look = (/** @type {import('@playwright/test').Locator} */ link) =>
			link.evaluate((el) => ({
				colour: getComputedStyle(el).color,
				arrow: getComputedStyle(el, '::after').transform
			}));
		for (let i = 0; i < count; i++) {
			const link = links.nth(i);
			await link.scrollIntoViewIfNeeded();
			await page.mouse.move(0, 0);
			await page.waitForTimeout(300);
			const rest = await look(link);
			await link.hover();
			await page.waitForTimeout(400);
			const hovered = await look(link);
			const name = (await link.textContent())?.trim().slice(0, 30);
			expect(rest.colour, `"${name}" at rest`).not.toBe(accent);
			expect(hovered.colour, `"${name}" turns the accent colour`).toBe(accent);
			expect(hovered.arrow, `"${name}" moves its arrow`).not.toBe(rest.arrow);
		}
	});
}
