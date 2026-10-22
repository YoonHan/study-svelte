/**
 * Builds the site's fonts: each one cut down to the characters the site actually shows, so the
 * page can preload a few small files and draw its text in the right font from the first paint
 * (no flash of a fallback font while Google Fonts' many slices come in).
 *
 * - Sources: the fonts' original files from github.com/google/fonts, downloaded once into
 *   `.cache/fonts/` (not committed).
 * - Characters: every character in `src/` and in the svelte@5.0.0 sources the pages show, plus
 *   ASCII, Latin-1 and common punctuation, so code and small runtime strings are covered too.
 * - Output: `src/lib/fonts/`: the `.woff2` files, `fonts.css` (their `@font-face` rules) and
 *   `fonts.js` (their URLs, for preloading) and `chars.txt` (the characters, for tests).
 *   Generated, not committed.
 *   Nothing is rebuilt when neither the characters nor this script changed.
 *
 * Licences: all of these fonts are under the SIL Open Font License 1.1. A subset is a Modified
 * Version (OFL FAQ 2.6), so a font with a Reserved Font Name (Nanum, Plex) is renamed inside
 * the file and in CSS. Copyright and licence name records are kept in every file.
 *
 * Usage: node scripts/fonts.mjs (run by predev, prebuild and precheck)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import subset_font from 'subset-font';
import fontverter from 'fontverter';

const SITE = path.resolve(import.meta.dirname, '..');
const CACHE = path.join(SITE, '.cache/fonts');
const OUT = path.join(SITE, 'src/lib/fonts');
const RAW = 'https://raw.githubusercontent.com/google/fonts/main/ofl';

/**
 * One file per font and weight the site uses. `name`: the CSS family; a font with a Reserved
 * Font Name gets a name of its own (`renamed`), written into the file as well.
 *
 * @typedef {{
 *   name: string,
 *   source: string,
 *   weight: number | [number, number],
 *   axes?: Record<string, { min: number, max: number }>,
 *   renamed?: boolean
 * }} Face
 * @type {Face[]}
 */
const FACES = [
	{
		name: 'Hahmlet',
		source: 'hahmlet/Hahmlet[wght].ttf',
		weight: [700, 800],
		axes: { wght: { min: 700, max: 800 } }
	},
	{ name: 'Gowun Dodum', source: 'gowundodum/GowunDodum-Regular.ttf', weight: 400 },
	{
		name: 'Noto Sans KR',
		source: 'notosanskr/NotoSansKR[wght].ttf',
		weight: 500,
		axes: { wght: { min: 500, max: 500 } }
	},
	{
		name: 'Inside Hand',
		source: 'nanumpenscript/NanumPenScript-Regular.ttf',
		weight: 400,
		renamed: true
	},
	{
		name: 'Inside Code KR',
		source: 'nanumgothiccoding/NanumGothicCoding-Regular.ttf',
		weight: 400,
		renamed: true
	},
	...[
		['Regular', 400],
		['Medium', 500],
		['SemiBold', 600],
		['Bold', 700]
	].map(([style, weight]) => ({
		name: 'Inside Mono',
		source: `ibmplexmono/IBMPlexMono-${style}.ttf`,
		weight: /** @type {number} */ (weight),
		renamed: true
	}))
];

// name records kept from the original: copyright, version, licence, licence URL, designer...
const KEEP_NAMES = [0, 5, 7, 8, 9, 10, 11, 12, 13, 14];

// characters every font gets, whether or not the sources happen to use them today (Hangul
// comes from the sources only: the full set is what makes Korean fonts large)
const BASE = [
	[0x20, 0x7e],
	[0xa0, 0xff],
	[0x2010, 0x2027],
	[0x2030, 0x205e],
	[0x2190, 0x21ff]
];

/** Every character the site can show, as one sorted string. */
function characters() {
	/** @type {Set<string>} */
	const chars = new Set();
	for (const [from, to] of BASE)
		for (let c = from; c <= to; c++) chars.add(String.fromCodePoint(c));

	/** @param {string} text */
	const add = (text) => {
		for (const c of text) if (c.codePointAt(0) >= 0x20) chars.add(c);
	};

	/** @param {string} dir */
	const walk = (dir) => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const file = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				if (file !== OUT) walk(file);
			} else if (/\.(svelte|svx|md|js|css|html)$/.test(entry.name)) {
				const text = fs.readFileSync(file, 'utf-8');
				add(text);
				// the svelte@5.0.0 sources a page puts on its code stage
				for (const [, cited] of text.matchAll(/load_svelte_source\(['"]([^'"]+)['"]\)/g))
					add(fs.readFileSync(path.join(SITE, 'node_modules/svelte-5.0.0/src', cited), 'utf-8'));
			}
		}
	};
	walk(path.join(SITE, 'src'));

	return [...chars].sort().join('');
}

/** @param {string} source */
async function original(source) {
	const file = path.join(CACHE, source);
	if (!fs.existsSync(file)) {
		const url = `${RAW}/${source.split('/').map(encodeURIComponent).join('/')}`;
		const response = await fetch(url);
		if (!response.ok) throw new Error(`${url}: ${response.status}`);
		fs.mkdirSync(path.dirname(file), { recursive: true });
		fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()));
	}
	return fs.readFileSync(file);
}

/**
 * Replaces a font's names (family, full name, PostScript name, unique ID) with `family`,
 * keeping only the records in KEEP_NAMES from the original. Windows Unicode records only,
 * which is all browsers read.
 *
 * @param {Buffer} sfnt
 * @param {string} family
 * @param {string} style e.g. `Regular`, `Bold`
 */
function rename(sfnt, family, style) {
	const count = sfnt.readUInt16BE(4);
	/** @type {{ tag: string, data: Buffer }[]} */
	const tables = [];
	for (let i = 0; i < count; i++) {
		const at = 12 + i * 16;
		const tag = sfnt.toString('latin1', at, at + 4);
		const offset = sfnt.readUInt32BE(at + 8);
		const length = sfnt.readUInt32BE(at + 12);
		tables.push({ tag, data: sfnt.subarray(offset, offset + length) });
	}

	const name = /** @type {{ data: Buffer }} */ (tables.find((t) => t.tag === 'name'));
	const old = name.data;
	const storage = old.readUInt16BE(4);
	/** @type {Map<number, string>} */
	const kept = new Map();
	for (let i = 0; i < old.readUInt16BE(2); i++) {
		const at = 6 + i * 12;
		const [platform, encoding, language, id, length, offset] = [0, 2, 4, 6, 8, 10].map((o) =>
			old.readUInt16BE(at + o)
		);
		if (platform !== 3 || encoding !== 1 || language !== 0x409 || !KEEP_NAMES.includes(id))
			continue;
		// UTF-16BE in the font; Node reads UTF-16LE, so swap a copy
		const bytes = Buffer.from(old.subarray(storage + offset, storage + offset + length));
		kept.set(id, bytes.swap16().toString('utf16le'));
	}
	const postscript = `${family.replace(/\s+/g, '')}-${style}`;
	kept.set(1, family);
	kept.set(2, style);
	kept.set(3, postscript);
	kept.set(4, `${family} ${style}`);
	kept.set(6, postscript);

	const records = [...kept].sort(([a], [b]) => a - b);
	const strings = records.map(([, text]) => Buffer.from(text, 'utf16le').swap16());
	const header = Buffer.alloc(6 + records.length * 12);
	header.writeUInt16BE(0, 0);
	header.writeUInt16BE(records.length, 2);
	header.writeUInt16BE(header.length, 4);
	let offset = 0;
	records.forEach(([id], i) => {
		const at = 6 + i * 12;
		[3, 1, 0x409, id, strings[i].length, offset].forEach((v, o) =>
			header.writeUInt16BE(v, at + o * 2)
		);
		offset += strings[i].length;
	});
	name.data = Buffer.concat([header, ...strings]);

	return assemble(sfnt.readUInt32BE(0), tables);
}

/**
 * Writes an sfnt from its tables, with the directory, padding and checksums it needs.
 * @param {number} version
 * @param {{ tag: string, data: Buffer }[]} tables
 */
function assemble(version, tables) {
	tables.sort((a, b) => (a.tag < b.tag ? -1 : 1));
	const n = tables.length;
	const power = 2 ** Math.floor(Math.log2(n));
	const head = Buffer.alloc(12 + n * 16);
	head.writeUInt32BE(version, 0);
	head.writeUInt16BE(n, 4);
	head.writeUInt16BE(power * 16, 6);
	head.writeUInt16BE(Math.log2(power), 8);
	head.writeUInt16BE(n * 16 - power * 16, 10);

	/** @param {Buffer} data */
	const checksum = (data) => {
		const padded = Buffer.concat([data, Buffer.alloc((4 - (data.length % 4)) % 4)]);
		let sum = 0;
		for (let i = 0; i < padded.length; i += 4) sum = (sum + padded.readUInt32BE(i)) >>> 0;
		return sum;
	};

	/** @type {Buffer[]} */
	const bodies = [];
	let offset = head.length;
	tables.forEach(({ tag, data }, i) => {
		if (tag === 'head') {
			data = Buffer.from(data);
			data.writeUInt32BE(0, 8); // checkSumAdjustment, set below
		}
		const at = 12 + i * 16;
		head.write(tag, at, 'latin1');
		head.writeUInt32BE(checksum(data), at + 4);
		head.writeUInt32BE(offset, at + 8);
		head.writeUInt32BE(data.length, at + 12);
		const padded = Buffer.concat([data, Buffer.alloc((4 - (data.length % 4)) % 4)]);
		bodies.push(padded);
		offset += padded.length;
	});

	const font = Buffer.concat([head, ...bodies]);
	const head_at = head.readUInt32BE(12 + tables.findIndex((t) => t.tag === 'head') * 16 + 8);
	font.writeUInt32BE((0xb1b0afba - checksum(font)) >>> 0, head_at + 8);
	return font;
}

/** @param {Face} face */
const style_of = (face) =>
	({ 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold' })[
		/** @type {number} */ (face.weight)
	] ?? 'Regular';

/** @param {Face} face */
const file_of = (face) =>
	`${face.name.toLowerCase().replace(/\s+/g, '-')}-${[face.weight].flat().join('-')}.woff2`;

async function build() {
	const text = characters();
	const stamp = crypto
		.createHash('sha256')
		.update(text)
		.update(fs.readFileSync(import.meta.filename))
		.digest('hex')
		.slice(0, 16);
	const stamp_file = path.join(OUT, '.stamp');
	if (fs.existsSync(stamp_file) && fs.readFileSync(stamp_file, 'utf-8') === stamp) return;

	fs.rmSync(OUT, { recursive: true, force: true });
	fs.mkdirSync(OUT, { recursive: true });

	const lines = [];
	for (const face of FACES) {
		let sfnt = await subset_font(await original(face.source), text, {
			targetFormat: 'sfnt',
			preserveNameIds: KEEP_NAMES,
			...(face.axes && { variationAxes: face.axes })
		});
		if (face.renamed) sfnt = rename(Buffer.from(sfnt), face.name, style_of(face));
		const woff2 = await fontverter.convert(sfnt, 'woff2');
		const file = file_of(face);
		fs.writeFileSync(path.join(OUT, file), woff2);
		lines.push({ face, file, size: woff2.length });
	}

	// the faces, for the stylesheet; `block`: text waits for its font instead of being drawn in
	// a fallback first (the files are small and preloaded, so the wait is short)
	const css = lines
		.map(
			({ face, file }) =>
				`@font-face {\n\tfont-family: '${face.name}';\n\tfont-weight: ${[face.weight].flat().join(' ')};\n\tfont-display: block;\n\tsrc: url('./${file}') format('woff2');\n}\n`
		)
		.join('\n');
	fs.writeFileSync(
		path.join(OUT, 'fonts.css'),
		`/* Generated by scripts/fonts.mjs. Do not edit. */\n\n${css}`
	);

	// their URLs by file name, for preloading the ones a page shows first
	const imports = lines.map(({ file }, i) => `import f${i} from './${file}?url';`).join('\n');
	const urls = lines
		.map(({ file }, i) => `\t${JSON.stringify(file.replace('.woff2', ''))}: f${i}`)
		.join(',\n');
	fs.writeFileSync(
		path.join(OUT, 'fonts.js'),
		`// Generated by scripts/fonts.mjs. Do not edit.\n${imports}\n\n/** @type {Record<string, string>} */\nexport const FONTS = {\n${urls}\n};\n`
	);
	// the characters, for the test that every character a page shows is in its font
	fs.writeFileSync(path.join(OUT, 'chars.txt'), text);
	fs.writeFileSync(stamp_file, stamp);

	const total = lines.reduce((sum, { size }) => sum + size, 0);
	console.log(
		`fonts: ${[...text].length} characters, ${lines.length} files, ${Math.round(total / 1024)} KB`
	);
	for (const { file, size } of lines) console.log(`  ${file} ${Math.round(size / 1024)} KB`);
}

await build();
