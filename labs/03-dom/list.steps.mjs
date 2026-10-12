// Drive KeyedList / UnkeyedList / UncontrolledList through a series of list operations.
//
//   node tools/mount.mjs playground/03-dom/KeyedList.svelte   --script labs/03-dom/list.steps.mjs -q
//   node tools/mount.mjs playground/03-dom/UnkeyedList.svelte --script labs/03-dom/list.steps.mjs -q
//
// Pick your own sequence with the OPS env var (names are in playground/03-dom/list-ops.js):
//   OPS=reverse,relabel node tools/mount.mjs playground/03-dom/KeyedList.svelte --script labs/03-dom/list.steps.mjs -q
import { with_stats } from './_stats.mjs';

const DEFAULT = [
	'append',
	'prepend',
	'insert_middle',
	'remove_first',
	'remove_middle',
	'last_to_first',
	'first_to_last',
	'swap_ends',
	'reverse',
	'relabel',
	'clear'
];

export default async (t) => {
	const ops = process.env.OPS ? process.env.OPS.split(',') : DEFAULT;
	const step = with_stats(t, 'li:not(.header)');

	for (const op of ops) {
		await step(op, () => t.click(`button.${op}`));
	}
};
