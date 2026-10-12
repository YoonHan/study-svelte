// Node module hooks: compile `.svelte` / `.svelte.js` on import and resolve
// `svelte/*` specifiers to the source files of the checked-out Svelte repo.
// Usage: import './loader.mjs' before importing any .svelte file.
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { SVELTE_PKG, COMPILER } from './paths.mjs';

const { compile, compileModule } = await import(pathToFileURL(COMPILER).href);
const pkg = JSON.parse(fs.readFileSync(path.join(SVELTE_PKG, 'package.json'), 'utf-8'));

/** compile options shared by every .svelte import; mount.mjs may override */
export const compile_options = { dev: false };

registerHooks({
	resolve(specifier, context, next) {
		if (specifier === 'svelte' || specifier.startsWith('svelte/')) {
			const key = specifier === 'svelte' ? '.' : './' + specifier.slice('svelte/'.length);
			const entry = pkg.exports[key];
			if (entry) {
				const file = typeof entry === 'string' ? entry : (entry.browser ?? entry.default);
				return { url: pathToFileURL(path.join(SVELTE_PKG, file)).href, shortCircuit: true };
			}
		}
		return next(specifier, context);
	},
	load(url, context, next) {
		if (url.startsWith('file:') && /\.svelte(\.js)?$/.test(url)) {
			const filename = fileURLToPath(url);
			const source = fs.readFileSync(filename, 'utf-8');
			const result = filename.endsWith('.svelte')
				? compile(source, { ...compile_options, filename, generate: 'client' })
				: compileModule(source, { ...compile_options, filename, generate: 'client' });
			return { format: 'module', source: result.js.code, shortCircuit: true };
		}
		return next(url, context);
	}
});
