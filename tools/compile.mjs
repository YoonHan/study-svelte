#!/usr/bin/env node
// Print what the Svelte compiler produces for a component.
//
//   node tools/compile.mjs playground/Counter.svelte            client output (production)
//   node tools/compile.mjs playground/Counter.svelte --server   server (SSR) output
//   node tools/compile.mjs playground/Counter.svelte --dev      dev-mode output
//   node tools/compile.mjs playground/Counter.svelte --ast      modern AST (phase 1 result)
//   node tools/compile.mjs playground/Counter.svelte --css      scoped CSS output
//   node tools/compile.mjs playground/Counter.svelte --legacy   force runes: false
//   node tools/compile.mjs playground/Counter.svelte --watch    re-print on save
//   node tools/compile.mjs playground/store.svelte.js           .svelte.js modules too
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { COMPILER } from './paths.mjs';

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		server: { type: 'boolean' },
		dev: { type: 'boolean' },
		ast: { type: 'boolean' },
		css: { type: 'boolean' },
		legacy: { type: 'boolean' },
		watch: { type: 'boolean', short: 'w' }
	}
});

const file = positionals[0];
if (!file) {
	console.error('usage: node tools/compile.mjs <file.svelte | file.svelte.js> [--server] [--dev] [--ast] [--css] [--legacy] [--watch]');
	process.exit(1);
}

const { compile, compileModule, parse } = await import(pathToFileURL(COMPILER).href);
const filename = path.resolve(file);

function run() {
	const source = fs.readFileSync(filename, 'utf-8');
	try {
		if (values.ast) {
			const ast = parse(source, { modern: true });
			console.log(JSON.stringify(ast, (k, v) => (k === 'start' || k === 'end' || k === 'loc' ? undefined : v), 2));
			return;
		}

		const options = {
			filename,
			generate: values.server ? 'server' : 'client',
			dev: !!values.dev
		};

		const result = filename.endsWith('.svelte')
			? compile(source, { ...options, ...(values.legacy ? { runes: false } : {}) })
			: compileModule(source, options);

		for (const w of result.warnings) console.error(`[warning] ${w.code}: ${w.message}`);

		if (values.css) console.log(result.css?.code ?? '/* no css */');
		else console.log(result.js.code);
	} catch (e) {
		console.error(`[error] ${e.code ?? ''} ${e.message}`);
		process.exitCode = 1;
	}
}

run();

if (values.watch) {
	let timer;
	fs.watch(filename, () => {
		clearTimeout(timer);
		timer = setTimeout(() => {
			console.clear();
			console.log(`// ${path.relative(process.cwd(), filename)} @ ${new Date().toLocaleTimeString()}\n`);
			run();
		}, 50);
	});
}
