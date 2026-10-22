// svelte@5.0.0 is installed under an alias for the lab (compiled and run in the browser).
// Its bundled types declare the module name `svelte`, not the alias, so describe the alias
// loosely here; the lab only calls `compile`, `mount`, `unmount`, `flushSync` and walks the
// runtime namespace.
declare module 'svelte-5.0.0/compiler';
declare module 'svelte-5.0.0/internal/client';
declare module 'svelte-5.0.0';
