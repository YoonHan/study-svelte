import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SVELTE_REPO = path.join(ROOT, 'svelte');
export const SVELTE_PKG = path.join(SVELTE_REPO, 'packages/svelte');
export const COMPILER = path.join(SVELTE_PKG, 'src/compiler/index.js');
