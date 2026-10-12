// Shared helper: run the compiler's phases one by one using its *internal* modules,
// so labs can look at the intermediate results that `compile()` normally hides.
import fs from 'node:fs';
import path from 'node:path';

const SRC = new URL('../../svelte/packages/svelte/src/compiler/', import.meta.url);
const load = (p) => import(new URL(p, SRC).href);

export const state = await load('state.js');
export const { validate_component_options } = await load('validate-options.js');
export const { parse } = await load('phases/1-parse/index.js');
export const { remove_typescript_nodes } = await load('phases/1-parse/remove_typescript_nodes.js');
export const { analyze_component } = await load('phases/2-analyze/index.js');
export const { transform_component } = await load('phases/3-transform/index.js');
export const { client_component } = await load('phases/3-transform/client/transform-client.js');
export const { server_component } = await load('phases/3-transform/server/transform-server.js');

/**
 * Run phase 1 and phase 2 exactly like `compile()` does (see src/compiler/index.js).
 * @param {string} file
 * @param {Record<string, any>} [options]
 */
export function run_phases(file, options = {}) {
	try {
		return run_phases_unsafe(file, options);
	} catch (e) {
		// compiler errors (CompileError) carry a code and a position; print them like the CLI tools do
		if (e?.code) {
			console.error(`[error] ${e.code}: ${e.message}`);
			process.exit(1);
		}
		throw e;
	}
}

function run_phases_unsafe(file, options) {
	const filename = path.resolve(file);
	const source = fs.readFileSync(filename, 'utf-8');

	state.reset_warning_filter(() => true);
	const validated = validate_component_options({ filename, ...options }, '');
	state.reset(source, validated);

	// phase 1
	let ast = parse(source);
	const { customElement, ...parsed_options } = ast.options || {};
	const combined = { ...validated, ...parsed_options, customElementOptions: customElement };

	if (ast.metadata.ts) {
		ast = {
			...ast,
			fragment: ast.fragment && remove_typescript_nodes(ast.fragment),
			instance: ast.instance && remove_typescript_nodes(ast.instance),
			module: ast.module && remove_typescript_nodes(ast.module)
		};
	}

	// phase 2
	const analysis = analyze_component(ast, source, combined);

	return { source, ast, analysis, options: combined, warnings: state.warnings };
}
