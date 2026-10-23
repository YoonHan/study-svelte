<script>
	import { tick } from 'svelte';
	import FileIcon from './FileIcon.svelte';
	import { inline_code, mark_text, mark_words } from './text.js';
	import { per_line, text_boxes } from './textrange.js';
	/**
	 * A highlighted listing. Lines can be lit (what the reader is looking at), folded into a
	 * closed box (a part not opened yet), annotated, marked in the gutter, or carry a speech
	 * bubble: a beat of the explanation attached right under the line it talks about.
	 *
	 * @typedef {import('./state.svelte.js').Closed} Closed
	 * @typedef {{ line: number, text: string, point?: string, closed?: number }} Note a note
	 *   printed on the code; `closed`: the first line of the unknown part it refers to, which
	 *   pointing at the note shows
	 * @typedef {{ text: string, current?: boolean, href?: string }} Mark
	 * @typedef {{ line: number, text?: string, point?: string, above?: boolean, content?: import('svelte').Snippet }} Bubble
	 * @typedef {Bubble & { key: string, order: number, printed: boolean, closed?: number }} Slot a note to show
	 *   under (or above) a line: one a beat says, or one printed on the code for good
	 * @typedef {{ type: 'line', n: number } | { type: 'gap', n: number } | ({ type: 'closed' } & Closed)} Row
	 */

	/**
	 * @type {{
	 *   code: import('#lib/types.js').CodeFile,
	 *   title?: string,
	 *   range?: [number, number],
	 *   lit?: number[],
	 *   stress?: number[],
	 *   spots?: { line: number, text: string, strike?: boolean }[],
	 *   closed?: Closed[],
	 *   notes?: Note[],
	 *   marks?: Record<number, Mark>,
	 *   bubbles?: Bubble[],
	 *   follow?: boolean,
	 *   wrap?: boolean,
	 *   linked?: number | null,
	 *   linking?: boolean,
	 *   onlink?: (line: number | null) => void,
	 *   recalls?: string[],
	 *   onrecall?: (at: { word: string, rect: DOMRect } | null) => void,
	 *   pointed?: 'marks' | 'closed' | null,
	 *   pointed_from?: number | null,
	 *   onpoint?: (at: { part: 'closed', from: number } | null) => void,
	 *   braces?: { id: number, from: number, to: number, text: string }[],
	 *   only?: number[],
	 *   badges?: Record<number, number>,
	 *   badged?: boolean
	 * }}
	 */
	let {
		code,
		title,
		range,
		lit = [],
		stress = [],
		spots = [],
		closed = [],
		notes = [],
		marks = {},
		bubbles = [],
		follow = false,
		wrap = false,
		linked = null,
		linking = false,
		onlink,
		recalls = [],
		onrecall,
		pointed = null,
		pointed_from = null,
		onpoint,
		braces = [],
		only,
		badges = {},
		badged = false
	} = $props();

	let recall_words = $derived(recalls);

	/**
	 * Names with a reminder (see Recall.svelte) are marked in the code; pointing at one asks
	 * the stage to show the reminder next to it.
	 * @param {Event} event
	 */
	function recall_from(event) {
		if (!onrecall) return;
		if (event instanceof PointerEvent && event.pointerType === 'touch') return;
		const target = event.target instanceof Element ? event.target.closest('[data-recall]') : null;
		const word = target instanceof HTMLElement ? target.dataset.recall : undefined;
		onrecall(target && word ? { word, rect: target.getBoundingClientRect() } : null);
	}

	/**
	 * Pointing at a note marks its words in the flow (`onlink`). While the reader points at
	 * words in the flow instead, `linking` is set on every listing on the stage and `linked` is
	 * the line of their note in this one: that note gets a pen stroke under it, and the other
	 * notes, with the lines they hang from, step back. A note's own lit lines (a note can be
	 * about several) stay as they are.
	 */
	let faded_rows = $derived.by(() => {
		if (!linking) return new Set();
		if (linked === null) return lit_set;
		return new Set(bubbles.filter((b) => b.line !== linked).map((b) => b.line));
	});

	/**
	 * @param {PointerEvent} event
	 * @param {number} line
	 */
	function enter(event, line) {
		// touch has no hover: a tap would leave the pair lit
		if (event.pointerType !== 'touch') onlink?.(line);
	}

	let first = $derived(range?.[0] ?? 1);
	let last = $derived(range?.[1] ?? code.lines.length);
	let lit_set = $derived(new Set(lit));
	let stress_set = $derived(new Set(stress));

	/**
	 * How many lit lines in a row make a long passage. A few lit lines get a highlighter
	 * stroke; a long passage (more than FEW lines one after another) is marked quietly (bold, a
	 * red margin line) so a wall of highlighter doesn't drown the code, and only its `stress`
	 * lines get the stroke. Lines scattered through a file stay highlighted however many there
	 * are, so one chapter's beats look alike.
	 */
	const FEW = 4;
	let many = $derived.by(() => {
		const sorted = [...lit_set].sort((a, b) => a - b);
		let run = 0;
		let longest = 0;
		sorted.forEach((n, i) => {
			run = i > 0 && n === sorted[i - 1] + 1 ? run + 1 : 1;
			longest = Math.max(longest, run);
		});
		return longest > FEW;
	});

	/** @type {Row[]} */
	let rows = $derived.by(() => {
		/** @type {Row[]} */
		const result = [];
		// only some lines (a job's lines, scattered through the file): a gap marks what is left out
		if (only) {
			const picked = [...new Set(only)].sort((a, b) => a - b);
			picked.forEach((n, i) => {
				if (i > 0 && n > picked[i - 1] + 1) result.push({ type: 'gap', n: -n });
				result.push({ type: 'line', n });
			});
			return result;
		}
		for (let n = first; n <= last; n += 1) {
			const box = closed.find((c) => c.from === n);
			if (box) {
				result.push({ type: 'closed', ...box });
				n = box.to;
			} else {
				result.push({ type: 'line', n });
			}
		}
		return result;
	});

	/**
	 * How many columns a line is indented by (a tab is two), so a note can point at where the
	 * line's text starts rather than at its indentation.
	 * @param {number} n
	 */
	function indent_cols(n) {
		const lead = split_indent(code.lines[n - 1] ?? '')[0].replace(/<[^>]*>/g, '');
		return [...lead].reduce((cols, c) => cols + (c === '\t' ? 2 : 1), 0);
	}

	/**
	 * Splits a highlighted line into its leading whitespace and the rest, so the highlighter
	 * covers only where there is text (a pen stroke starts where the writing starts).
	 * @param {string} html
	 * @returns {[string, string]}
	 */
	function split_indent(html) {
		// whitespace-only token spans at the start
		const spans = html.match(/^(?:<span[^>]*>[ \t]+<\/span>)+/);
		if (spans) {
			const indent = spans[0].replace(/<[^>]+>/g, '');
			return [indent, html.slice(spans[0].length) || ' '];
		}
		// whitespace at the start of the first token
		const lead = html.match(/^(<span[^>]*>)([ \t]+)/);
		if (lead) return [lead[2], lead[1] + html.slice(lead[0].length)];
		const bare = html.match(/^[ \t]+/);
		if (bare) return [bare[0], html.slice(bare[0].length)];
		return ['', html];
	}

	let spot_of = $derived(new Map(spots.map((s) => [s.line, s])));

	/** @param {Row} row */
	const first_line = (row) => (row.type === 'closed' ? row.from : row.n);

	/**
	 * @param {Row} row
	 * @param {number} line
	 */
	const covers = (row, line) =>
		row.type === 'closed' ? row.from <= line && line <= row.to : row.n === line;

	/** @type {HTMLElement | undefined} */
	let scroller = $state();

	/** @type {HTMLElement | undefined} */
	let listing = $state();

	/**
	 * Every note on the code, the beat's and the printed ones, with a key to keep each in place.
	 * @type {Slot[]}
	 */
	let slots = $derived([
		...bubbles.map((b, order) => ({
			...b,
			key: `say:${b.line}:${b.text ?? order}`,
			order,
			printed: false
		})),
		...notes.map((n) => ({ ...n, key: `note:${n.line}:${n.text}`, order: 0, printed: true }))
	]);

	/** keys of the notes that hang above their line, not under it (see aim()) */
	let above = $state(/** @type {string[]} */ ([]));

	/**
	 * Points each note's arrow at what the note is about: the part of the line it highlights
	 * (`spot`), else the text it names (`point`), else a folded box. Every note names its
	 * target; tests/render.spec.js fails on one that does not.
	 *
	 * The arrow's tip lands on the middle of a short target, or a little into a long one. A
	 * note hangs under its line, or above it when the target is on the first visual line of a
	 * line that wraps, so the arrow can reach it without crossing other code. When several
	 * notes hang on one line, an arrow further away grows tall enough to reach the code.
	 * Measured, not computed from columns, since targets can be anywhere in a line.
	 */
	function aim() {
		if (!listing) return;
		const base = listing.getBoundingClientRect();
		const room = listing.parentElement?.clientWidth ?? listing.clientWidth;
		/** @type {string[]} */
		const wanted = [];
		for (const slot of listing.querySelectorAll('.bubble-slot')) {
			if (!(slot instanceof HTMLElement)) continue;
			const row = listing.querySelector(`.row[data-line="${slot.dataset.line}"]`);
			const ink = row?.querySelector('.ink') ?? row?.querySelector('.box');
			if (!row || !ink) continue;
			const lines = per_line(ink.getClientRects());
			if (lines.length === 0) continue;

			const spot = row.querySelector('.spot');
			const box = row.querySelector('.box');
			const point = slot.dataset.point;
			let targets = /** @type {ReturnType<typeof per_line>} */ ([]);
			let kind = 'none';
			if (spot) [targets, kind] = [per_line(spot.getClientRects()), 'spot'];
			else if (point) [targets, kind] = [text_boxes(ink, point), 'point'];
			else if (box) [targets, kind] = [per_line(box.getClientRects()), 'box'];
			if (targets.length === 0) {
				// nothing named (or the named text is not in the line): the test reports it
				kind = point ? 'missing' : 'none';
				targets = [lines[lines.length - 1]];
			}
			slot.dataset.target = kind;

			const first = lines[0].top;
			const last = lines[lines.length - 1].top;
			const near = (/** @type {number} */ top) => (/** @type {{ top: number }} */ t) =>
				Math.abs(t.top - top) < 4;
			const below = targets.find(near(last));
			const over = targets.find(near(first));
			// a note asked to hang over its line points down at the target's first row
			const asked = slot.dataset.side === 'above';
			const target = asked ? (over ?? targets[0]) : (below ?? over ?? targets[targets.length - 1]);
			const hang_above = asked || (!below && !!over);
			if (hang_above) wanted.push(slot.dataset.key ?? '');

			const x = target.left - base.left + Math.min((target.right - target.left) / 2, 24);
			slot.style.setProperty('--aim', `${x}px`);
			slot.dataset.tipX = `${target.left + Math.min((target.right - target.left) / 2, 24)}`;
			slot.dataset.tipY = `${hang_above ? target.top : target.bottom}`;

			// the arrow reaches from the note to the target, past any note in between
			const own = slot.getBoundingClientRect();
			const reach = Math.max(0, hang_above ? target.top - own.bottom : own.top - target.bottom);
			const arrow = slot.querySelector('.arrow');
			const path = arrow?.querySelector('path');
			if (arrow instanceof SVGElement && path) {
				const height = 22 + reach;
				arrow.setAttribute('viewBox', `0 0 22 ${height}`);
				arrow.style.height = `${height}px`;
				arrow.style.top = hang_above ? 'auto' : `${-reach}px`;
				arrow.style.bottom = hang_above ? `${-reach}px` : 'auto';
				path.setAttribute(
					'd',
					`M17 ${height - 1} C 9 ${height - 3}, 5 ${Math.max(13, height * 0.55)}, 6 3 M2.5 7 L6 2.5 L9.5 6.5`
				);
			}

			// the words go right of the arrow, wrapping onto more rules if they must; only if
			// there is hardly any room there, left of it, with the arrow turned around
			const words = slot.querySelector('.t')?.getBoundingClientRect().width ?? 0;
			const flip = x + 22 + Math.min(words, 160) + 16 > room && x - 22 - words > 0;
			slot.toggleAttribute('data-flip', flip);
			slot.style.setProperty('--text-start', `${flip ? x - 22 - words : x + 22}px`);
		}
		if (wanted.join('|') !== above.join('|')) {
			above = wanted;
			// the notes moved to the other side of their line: measure again there
			tick().then(aim);
		}
	}

	/**
	 * Puts each bracket (see Brace.svelte) just right of the longest of its lines, as tall as
	 * those lines. Measured, like the arrows, because lines wrap and differ in length.
	 */
	function place_braces() {
		if (!listing) return;
		const box = listing.getBoundingClientRect();
		for (const brace of listing.querySelectorAll('.brace')) {
			if (!(brace instanceof HTMLElement)) continue;
			const from = Number(brace.dataset.from);
			const to = Number(brace.dataset.to);
			const rows = [...listing.querySelectorAll('.row[data-line]')].filter((row) => {
				const n = Number(row.getAttribute('data-line'));
				return n >= from && n <= to;
			});
			if (rows.length === 0) continue;
			const top = Math.min(...rows.map((r) => r.getBoundingClientRect().top));
			const bottom = Math.max(...rows.map((r) => r.getBoundingClientRect().bottom));
			const right = Math.max(
				...rows.flatMap((r) =>
					[...(r.querySelector('.ink')?.getClientRects() ?? [])].map((rect) => rect.right)
				)
			);
			brace.style.top = `${top - box.top}px`;
			brace.style.height = `${bottom - top}px`;
			brace.style.left = `${right - box.left + 14}px`;
		}
	}

	$effect(() => {
		// again whenever the notes, the marked parts or the lines change
		void braces;
		void bubbles;
		void spots;
		void lit;
		if (!listing) return;
		const node = listing;
		const place = () => {
			aim();
			place_braces();
		};
		place();
		// and when the width changes the wrapping, the fonts arrive, or a note above has
		// finished opening its room (the lines below it have moved)
		const observer = new ResizeObserver(place);
		observer.observe(node);
		document.fonts?.ready.then(place);
		node.addEventListener('animationend', place);
		const settle = setTimeout(place, 1400);
		return () => {
			observer.disconnect();
			node.removeEventListener('animationend', place);
			clearTimeout(settle);
		};
	});

	// keep the bubble, or else the lit lines, in view as the reader moves through the beats
	$effect(() => {
		// the topmost thing being said or lit, so everything below it fits in view
		const lines = [...bubbles.map((b) => b.line), ...lit];
		const target = lines.length ? Math.min(...lines) : undefined;
		if (!follow || !scroller || target === undefined) return;
		const row = rows.find((r) => covers(r, target));
		const element = row && scroller.querySelector(`[data-line="${first_line(row)}"]`);
		if (!(element instanceof HTMLElement)) return;
		let top = element.offsetTop - scroller.clientHeight / 6;
		// a note far below the first lit line (13 lit, the note on 36) must still be seen: then
		// the note's line decides, and sits two thirds of the way down
		const bubble = bubbles.at(-1);
		const below = bubble && scroller.querySelector(`.row[data-line="${bubble.line}"]`);
		if (below instanceof HTMLElement) {
			const bottom = below.offsetTop + below.offsetHeight + 90;
			if (bottom > top + scroller.clientHeight)
				top = below.offsetTop - scroller.clientHeight * 0.66;
		}
		const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
		scroller.scrollTo({ top: Math.max(0, top), behavior: smooth ? 'smooth' : 'auto' });
	});
</script>

{#snippet note_slot(/** @type {Slot} */ slot)}
	<!-- the note's room opens first, so the lines below move down instead of jumping -->
	<div
		class="bubble-slot"
		class:above={above.includes(slot.key)}
		class:printed={slot.printed}
		data-line={slot.line}
		data-key={slot.key}
		data-point={slot.point}
		data-side={slot.above ? 'above' : undefined}
		style:--order={slot.order}
		style:--cols={indent_cols(slot.line)}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="bubble"
			class:linked={!slot.printed && linked === slot.line}
			class:faded={!slot.printed && linking && linked !== slot.line}
			role="note"
			onpointerenter={(event) =>
				slot.printed
					? slot.closed !== undefined && onpoint?.({ part: 'closed', from: slot.closed })
					: enter(event, slot.line)}
			onpointerleave={() => (slot.printed ? onpoint?.(null) : onlink?.(null))}
		>
			<svg class="arrow" viewBox="0 0 22 22" aria-hidden="true"
				><path
					d="M17 21 C 9 19, 5 13, 6 3 M2.5 7 L6 2.5 L9.5 6.5"
					fill="none"
					stroke="currentColor"
					stroke-width="1.6"
					stroke-linecap="round"
					stroke-linejoin="round"
				/></svg
			>
			<div class="said">
				{#if slot.text}<p>
						<span class="t"
							>{@html inline_code(slot.text)}<svg
								class="pen"
								viewBox="0 0 100 8"
								preserveAspectRatio="none"
								aria-hidden="true"
								><path pathLength="1" d="M1 5 C 22 3, 48 6.5, 70 4.5 S 92 3.5, 99 5" /></svg
							></span
						>
					</p>{:else if slot.content}{@render slot.content()}{/if}
			</div>
		</div>
	</div>
{/snippet}

<figure class="code" class:badged>
	{#if title !== ''}
		<!-- the icon from the file's own name: a title may add words after it ("(컴파일 결과)") -->
		<figcaption><FileIcon name={code.file} /> {title ?? code.file}</figcaption>
	{/if}
	<div class="scroller shiki" class:wrap bind:this={scroller}>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="listing"
			bind:this={listing}
			class:many
			class:pointing-marks={pointed === 'marks'}
			class:pointing-closed={pointed === 'closed'}
			onpointerover={recall_from}
			onpointerleave={() => onrecall?.(null)}
			onfocusin={recall_from}
			onfocusout={() => onrecall?.(null)}
		>
			{#each rows as row (first_line(row))}
				<!-- notes whose target is on the first visual line of a wrapped line hang above it -->
				{#each slots.filter((slot) => above.includes(slot.key) && covers(row, slot.line)) as slot (slot.key)}
					{@render note_slot(slot)}
				{/each}
				{#if row.type === 'gap'}
					<!-- lines left out between the ones shown -->
					<div class="row gap" aria-hidden="true"><span class="ln">⋯</span></div>
				{:else if row.type === 'line'}
					{@const mark = marks[row.n]}
					{@const spot = spot_of.get(row.n)}
					{@const html = code.lines[row.n - 1] || ' '}
					{@const [indent, rest] = split_indent(
						mark_words(
							spot ? mark_text(html, spot.text, spot.strike ? 'spot strike' : 'spot') : html,
							recall_words
						)
					)}
					<div
						class="row"
						class:lit={lit_set.has(row.n)}
						class:stress={stress_set.has(row.n)}
						class:spotted={spot !== undefined}
						class:faded={faded_rows.has(row.n)}
						class:dim={lit_set.size > 0 && !lit_set.has(row.n)}
						style:--sweep-delay={lit_set.has(row.n) ? `${lit.indexOf(row.n) * 45}ms` : undefined}
						data-line={row.n}
					>
						<span class="ln"
							>{#if badges[row.n]}<span class="badge" aria-label="{badges[row.n]}번 일"
									>{badges[row.n]}</span
								>{/if}{row.n}</span
						>
						<span class="src">{@html indent}<span class="ink">{@html rest}</span></span>
						{#if mark}
							{#if mark.href}
								<a class="mark" class:current={mark.current} href={mark.href}
									>{mark.text}<svg
										class="ring"
										viewBox="0 0 100 40"
										preserveAspectRatio="none"
										aria-hidden="true"
										><path
											pathLength="1"
											d="M58 5 C 30 2, 5 8, 4 20 C 3 32, 28 38, 54 37 C 80 36, 97 30, 96 19 C 95 9, 74 3, 40 6"
										/></svg
									></a
								>
							{:else}
								<span class="mark" class:current={mark.current}
									>{mark.text}<svg
										class="ring"
										viewBox="0 0 100 40"
										preserveAspectRatio="none"
										aria-hidden="true"
										><path
											pathLength="1"
											d="M58 5 C 30 2, 5 8, 4 20 C 3 32, 28 38, 54 37 C 80 36, 97 30, 96 19 C 95 9, 74 3, 40 6"
										/></svg
									></span
								>
							{/if}
						{/if}
					</div>
				{:else}
					{@const box_lit = lit.some((n) => row.from <= n && n <= row.to)}
					<div
						class="row closed"
						class:lit={box_lit}
						class:pointed={pointed === 'closed' &&
							(pointed_from == null || pointed_from === row.from)}
						class:dim={lit_set.size > 0 && !box_lit}
						data-line={row.from}
					>
						<span class="ln">{row.from}–{row.to}</span>
						<!-- the box starts where the folded code starts, at its indentation -->
						<span class="indent">{split_indent(code.lines[row.from - 1] || '')[0]}</span>
						<!-- an unknown part: a few question marks scribbled in pen, and where it is cleared -->
						<span class="box"
							><span class="marks" aria-hidden="true"
								><span class="q q1">?</span><span class="q q2">?</span><span class="q q3">?</span
								></span
							>{row.label}</span
						>
					</div>
				{/if}
				{#each slots.filter((slot) => !above.includes(slot.key) && covers(row, slot.line)) as slot (slot.key)}
					{@render note_slot(slot)}
				{/each}
			{/each}
			{#each braces as brace (brace.id)}
				<!-- a handwritten bracket beside a few lines, and what it says about them together -->
				<div class="brace" data-from={brace.from} data-to={brace.to} aria-hidden="true">
					<svg viewBox="0 0 20 100" preserveAspectRatio="none"
						><path d="M4 4 C 17 24, 17 76, 4 96" /></svg
					>
					<span class="brace-note">{@html inline_code(brace.text)}</span>
				</div>
			{/each}
		</div>
	</div>
</figure>

<style>
	/*
	 * A sheet of ruled notebook paper with the code copied onto it. One code line is exactly
	 * one rule (--rule-gap); everything inserted between lines (notes, closed boxes) takes
	 * whole rules too, so the lines never drift off the paper's rules.
	 */
	.code {
		--gap: var(--rule-gap);
		/* the line-number gutter, as a fixed length so notes in other fonts line up with it */
		--ln: 46px;
		display: flex;
		flex-direction: column;
		min-height: 0;
		margin: 0;
		background: var(--bg);
		border: 1px solid var(--line);
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.04);
	}

	figcaption {
		flex: none;
		height: var(--gap);
		padding: 0 14px 0 calc(var(--ln) + 14px);
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-hand);
		font-size: 20px;
		line-height: var(--gap);
		color: var(--fg-2);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		border-bottom: 1px solid var(--rule);
	}

	.scroller {
		min-height: 0;
		overflow: auto;
		scrollbar-width: thin;
	}

	.listing {
		position: relative;
		padding-block: var(--gap);
		width: max-content;
		min-width: 100%;
		font-family: var(--font-mono);
		font-size: 13.5px;
		line-height: var(--gap);
		tab-size: 2;
		font-variant-ligatures: none;
		/* one column of code, and where a line's text starts (its first column), kept as lengths
		   so notes in another font can line up with the code */
		--code-ch: 1ch;
		--text-x: calc(var(--ln) + 0.9em);
		background-image: linear-gradient(transparent calc(var(--gap) - 1px), var(--rule) 0);
		background-size: 100% var(--gap);
	}

	/* the red margin line */
	.listing::before {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		left: var(--ln);
		border-left: 1.5px solid var(--margin);
	}

	.row {
		display: flex;
		align-items: baseline;
		min-height: var(--gap);
		padding-right: 16px;
		transition: opacity 240ms ease;
	}

	/* lines the current beat is not about stay legible for orientation but step far back */
	.row.dim {
		opacity: 0.28;
	}

	.ln {
		position: relative;
		flex: none;
		width: var(--ln);
		padding-right: 0.9em;
		text-align: right;
		color: var(--fg-3);
		user-select: none;
	}

	/* a file whose lines carry job numbers keeps room for them beside the line numbers, always */
	.code.badged {
		--ln: 68px;
	}

	/*
	 * Which of several jobs a lit line does (chapter 1-0): its number circled in pen just left of
	 * the line number, on the line's first row.
	 */
	.code.badged .ln {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 6px;
		height: var(--gap);
	}

	.badge {
		flex: none;
		display: grid;
		place-items: center;
		width: 19px;
		height: 19px;
		border: 1.4px solid var(--accent);
		border-radius: 50% 46% 52% 48%;
		font-family: var(--font-label);
		font-size: 11px;
		font-weight: 500;
		line-height: 1;
		color: var(--accent);
		background: var(--surface);
	}

	/* where lines are left out between the ones shown */
	.row.gap .ln {
		color: var(--fg-3);
		letter-spacing: 1px;
	}

	.src {
		padding-left: 0.9em;
		white-space: pre;
	}

	/*
	 * Lit lines, two ways depending on how many there are (see FEW above):
	 *
	 * - A few: a faint highlighter wash behind the text only (not the indentation), so the
	 *   ink keeps its own pen colours at full contrast. Dragged left to right; several lines
	 *   one after another (45ms apart), so the motion says "read these, in this order".
	 * - Many: no wash. Lit lines are bold with a red pen line in the margin, everything else
	 *   steps further back, and only the stressed lines get the wash.
	 */
	.listing {
		font-weight: var(--code-weight, 400);
	}

	.ink {
		padding: 2px 3px;
		margin: 0 -3px;
		border-radius: 3px 8px 4px 9px;
		background-image: linear-gradient(
			100deg,
			transparent 0 2px,
			var(--hi-wash) 2px calc(100% - 3px),
			transparent
		);
		background-repeat: no-repeat;
		background-size: 0% 100%;
		box-decoration-break: clone;
		-webkit-box-decoration-break: clone;
		transition: background-size 420ms var(--ease-out) var(--sweep-delay, 0ms);
	}

	.listing:not(.many) .lit:not(.spotted) .ink,
	.stress .ink {
		background-size: 100% 100%;
	}

	/* only the part of the line a note talks about */
	.ink :global(.spot) {
		border-radius: 2px 6px 3px 7px;
		background-image: linear-gradient(var(--hi-wash), var(--hi-wash));
		background-repeat: no-repeat;
		background-size: 0% 100%;
		box-decoration-break: clone;
		-webkit-box-decoration-break: clone;
		animation: spot 420ms var(--ease-out) var(--sweep-delay, 0ms) forwards;
	}

	/* code the words take away ("이 `1`을 지우면"): struck through in pen */
	.ink :global(.spot.strike) {
		text-decoration: line-through;
		text-decoration-color: var(--accent);
		text-decoration-thickness: 2px;
	}

	@keyframes spot {
		to {
			background-size: 100% 100%;
		}
	}

	/* a blank line has nothing to highlight */
	.ink:empty {
		display: none;
	}

	.row {
		box-shadow: inset 0 0 transparent;
	}

	.many .row.dim {
		opacity: 0.2;
	}

	.many .lit .src {
		font-weight: 700;
	}

	.many .lit .ln {
		color: var(--accent);
		font-weight: 700;
	}

	.many .row.lit {
		box-shadow: inset 3px 0 var(--accent);
		transition:
			opacity 240ms ease,
			box-shadow 200ms ease var(--sweep-delay, 0ms);
	}

	/* narrow panels: long lines wrap instead of hiding their ends behind a scrollbar */
	.wrap .listing {
		width: auto;
	}

	.wrap .src {
		min-width: 0;
		padding-left: calc(0.9em + 4ch);
		text-indent: -4ch;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.mark {
		flex: none;
		margin-left: 16px;
		font-family: var(--font-hand);
		font-size: 18px;
		color: var(--fg-3);
		text-decoration: none;
		white-space: nowrap;
	}

	.mark.current {
		color: var(--accent);
	}

	/*
	 * While the words point at these marks ("줄 옆의 표시"), each one is circled in pen, drawn
	 * in 300ms; a transition, so pointing on and off quickly never restarts it.
	 */
	.mark {
		position: relative;
	}

	.ring {
		position: absolute;
		top: -3px;
		left: -7px;
		width: calc(100% + 14px);
		height: calc(100% + 6px);
		overflow: visible;
		fill: none;
		stroke: var(--accent);
		stroke-width: 1.5;
		stroke-linecap: round;
		pointer-events: none;
	}

	/*
	 * Hidden by moving the dash out of the line. A round line cap would still paint a dot at
	 * the end of the empty dash, so the stroke is also transparent until it starts drawing,
	 * and turns transparent again only once it has drawn back.
	 */
	.ring path {
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
		stroke-opacity: 0;
		transition:
			stroke-dashoffset 300ms var(--ease-out),
			stroke-opacity 0s 300ms;
	}

	.pointing-marks .ring path {
		stroke-dashoffset: 0;
		stroke-opacity: 1;
		transition:
			stroke-dashoffset 300ms var(--ease-out),
			stroke-opacity 0s;
	}

	/* a name with a reminder: pointing at it shows what it is */
	.ink :global(.recall) {
		text-decoration: underline dotted;
		text-decoration-color: color-mix(in oklab, var(--accent) 55%, transparent);
		text-underline-offset: 3px;
		cursor: var(--cursor);
		outline: none;
	}

	a.mark {
		color: var(--accent);
	}

	@media (hover: hover) and (pointer: fine) {
		a.mark:hover {
			text-decoration: underline;
		}
	}

	/* the range of a folded part must stay on one rule */
	/* a folded part takes exactly one rule, whatever its box's font size */
	.row.closed {
		height: var(--gap);
		align-items: center;
	}

	.closed .ln {
		white-space: nowrap;
		font-size: 0.82em;
		letter-spacing: -0.02em;
	}

	/* an unknown part starts where its code starts, at its indentation */
	.indent {
		padding-left: 0.9em;
		white-space: pre;
	}

	/*
	 * An unknown part of the function (a later chapter clears it): a pencilled dashed box,
	 * and beside its label three question marks of different sizes and slants scribbled in
	 * pen, as on an unexplored corner of a hand-drawn map. Each one rocks a little, out of
	 * step with the others (2.2-3.1s, ease-in-out), so they read as written, not printed.
	 * Pointing at the words about it, or a note about it on this line, turns them to pen
	 * colour.
	 */
	.box {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 0 12px 0 6px;
		border: 1.25px dashed var(--fg-3);
		border-radius: 4px 9px 5px 10px;
		font-family: var(--font-label);
		font-size: 11.5px;
		line-height: calc(var(--gap) - 8px);
		white-space: nowrap;
		color: var(--fg-2);
		transition:
			border-color 200ms ease,
			color 200ms ease;
	}

	.marks {
		position: relative;
		flex: none;
		width: 40px;
		height: 18px;
	}

	.q {
		position: absolute;
		font-family: var(--font-hand);
		line-height: 1;
		color: var(--fg-3);
		transform: rotate(var(--r));
		animation: rock var(--t) ease-in-out infinite alternate;
		transition: color 200ms ease;
	}

	.q1 {
		--r: -14deg;
		--t: 2.6s;
		left: 0;
		top: -1px;
		font-size: 19px;
	}

	.q2 {
		--r: 6deg;
		--t: 3.1s;
		left: 11px;
		top: -9px;
		font-size: 27px;
		animation-delay: -1.1s;
	}

	.q3 {
		--r: 18deg;
		--t: 2.2s;
		left: 26px;
		top: -3px;
		font-size: 22px;
		animation-delay: -0.6s;
	}

	@keyframes rock {
		from {
			transform: rotate(calc(var(--r) - 5deg));
		}
		to {
			transform: rotate(calc(var(--r) + 5deg));
		}
	}

	/* a note is about this part, or the words point at it: the box and its marks in pen colour */
	.closed.lit .box,
	.closed.pointed .box {
		border-color: var(--accent);
		color: var(--fg);
	}

	.closed.lit .q,
	.closed.pointed .q {
		color: var(--accent);
	}

	@media (prefers-reduced-motion: reduce) {
		.q {
			animation: none;
		}
	}

	/* an unknown part pointed at comes forward even where the other lines step back */
	.listing .row.closed.pointed {
		opacity: 1;
	}

	.closed.lit .ln {
		color: var(--fg-2);
	}

	/*
	 * A beat of the explanation, written in pen right under the line it is about, sitting on
	 * the rules. It is written in left to right (a mask sweep), several notes of one beat one
	 * after another (650ms apart, so the eye follows each one). Explanation tier, ≤ 560ms.
	 */
	@property --reveal {
		syntax: '<percentage>';
		inherits: false;
		initial-value: 130%;
	}

	@keyframes write {
		from {
			--reveal: 0%;
		}
		to {
			--reveal: 130%;
		}
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}

	/*
	 * Before a note is written, the room for it opens: the slot grows from no height to its
	 * full height (whole rules), easing the lines below down to their new place.
	 */
	.bubble-slot {
		display: grid;
		grid-template-rows: 1fr;
		animation: open-room 360ms var(--ease-out) calc(var(--order, 0) * 650ms) backwards;
	}

	@keyframes open-room {
		from {
			grid-template-rows: 0fr;
		}
	}

	/*
	 * Clipped only while its room opens: after that the arrow may reach past the note, to a
	 * target above another note on the same line (see aim()).
	 */
	.bubble {
		position: relative;
		min-height: 0;
		overflow: hidden;
		animation: unclip 1ms linear calc(var(--order, 0) * 650ms + 360ms) forwards;
		/* the words start just right of the arrow, or end just left of it (see aim()) */
		padding: 0 16px 0
			var(--text-start, calc(var(--text-x) + var(--cols, 0) * var(--code-ch) + 22px));
		font-family: var(--font-hand);
		font-size: 21px;
		line-height: var(--gap);
		white-space: normal;
		word-break: keep-all;
		overflow-wrap: anywhere;
		color: var(--accent);
	}

	.arrow {
		position: absolute;
		/* the arrow's tip (about 6px into it) is over what the note is about (see aim()) */
		left: calc(var(--aim, calc(var(--text-x) + var(--cols, 0) * var(--code-ch))) - 6px);
		top: 0;
		width: 22px;
		height: 22px;
		overflow: visible;
		animation: fade 200ms ease calc(var(--order, 0) * 650ms + 200ms) backwards;
	}

	/*
	 * A bracket beside a few lines: drawn top to bottom in pen (revealed with a clip-path,
	 * 380ms), then its note is written beside it. Plays when the beat brings it on.
	 */
	.brace {
		position: absolute;
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--accent);
		pointer-events: none;
	}

	.brace svg {
		flex: none;
		width: 16px;
		height: calc(100% - 8px);
		overflow: visible;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
		animation: brace-draw 380ms var(--ease-out) backwards;
	}

	.brace path {
		vector-effect: non-scaling-stroke;
	}

	.brace-note {
		font-family: var(--font-hand);
		font-size: 25px;
		line-height: 1;
		white-space: nowrap;
		animation: fade 240ms ease 320ms backwards;
	}

	.brace-note :global(code) {
		padding: 0;
		background: none;
		font-family: var(--font-mono);
		font-size: 0.66em;
		color: inherit;
	}

	@keyframes brace-draw {
		from {
			clip-path: inset(0 0 100% 0);
		}
	}

	@keyframes unclip {
		to {
			overflow: visible;
		}
	}

	/* a turned-around arrow: its tail on the left, toward the words */
	.bubble-slot:global([data-flip]) .arrow {
		left: calc(var(--aim) - 16px);
		transform: scaleX(-1);
	}

	/* a note above its line points down */
	.bubble-slot.above .arrow {
		transform: scaleY(-1);
	}

	.bubble-slot.above:global([data-flip]) .arrow {
		transform: scale(-1, -1);
	}

	/* a note printed on the code for good (not said by a beat): smaller, already there */
	.bubble-slot.printed {
		animation: none;
	}

	.printed .bubble {
		overflow: visible;
		font-size: 19px;
		animation: none;
	}

	.printed .said,
	.printed .arrow {
		animation: none;
		mask-image: none;
	}

	.said {
		max-width: 40ch;
		mask-image: linear-gradient(100deg, #000 calc(var(--reveal) - 30%), transparent var(--reveal));
		animation: write 560ms var(--ease-out) calc(var(--order, 0) * 650ms + 260ms) backwards;
	}

	.said :global(p) {
		margin: 0;
	}

	/*
	 * While the reader points at a note's words in the flow, the pen underlines the note
	 * (drawn left to right, 260ms) and the other notes step back. Transitions, not keyframes:
	 * the pointer moves between paragraphs quickly and each change picks up where it is.
	 */
	.t {
		position: relative;
	}

	.pen {
		position: absolute;
		left: -2px;
		bottom: -2px;
		width: calc(100% + 4px);
		height: 7px;
		overflow: visible;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.7;
		stroke-linecap: round;
		pointer-events: none;
	}

	/*
	 * Hidden by moving the dash out of the line. A round line cap would still paint a dot at
	 * the end of the empty dash, so the stroke is also transparent until it starts drawing,
	 * and turns transparent again only once it has drawn back.
	 */
	.pen path {
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
		stroke-opacity: 0;
		transition:
			stroke-dashoffset 260ms var(--ease-out),
			stroke-opacity 0s 260ms;
	}

	.bubble.linked .pen path {
		stroke-dashoffset: 0;
		stroke-opacity: 1;
		transition:
			stroke-dashoffset 260ms var(--ease-out),
			stroke-opacity 0s;
	}

	.bubble {
		transition: opacity 200ms ease;
	}

	.bubble.faded,
	.row.faded {
		opacity: 0.3;
	}

	.said :global(code) {
		padding: 0;
		background: none;
		font-family: var(--font-mono);
		font-size: 0.68em;
		color: inherit;
	}

	@media (prefers-reduced-motion: reduce) {
		.ring path,
		.pointing-marks .ring path {
			transition: none;
		}

		.pen path,
		.bubble.linked .pen path {
			transition: none;
		}

		.said {
			mask-image: none;
			animation: fade 200ms ease backwards;
		}

		.bubble-slot {
			animation: none;
		}

		.ink {
			transition: none;
		}
	}
</style>
