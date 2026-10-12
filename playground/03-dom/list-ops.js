// List operations shared by the each-block playgrounds. Every op returns a NEW array
// (made of the SAME item objects unless noted), so the each block has to reconcile.
let next_id = 0;
const make = (label) => ({ id: next_id++, label });

export const initial = () => ['a', 'b', 'c', 'd', 'e'].map(make);

export const ops = {
	append: (items) => [...items, make('new')],
	prepend: (items) => [make('new'), ...items],
	insert_middle: (items) => [...items.slice(0, 2), make('mid'), ...items.slice(2)],
	remove_first: (items) => items.slice(1),
	remove_middle: (items) => [...items.slice(0, 2), ...items.slice(3)],
	last_to_first: (items) => [items.at(-1), ...items.slice(0, -1)],
	first_to_last: (items) => [...items.slice(1), items[0]],
	swap_ends: (items) => [items.at(-1), ...items.slice(1, -1), items[0]],
	reverse: (items) => [...items].reverse(),
	// new objects, same ids
	relabel: (items) => items.map((item) => ({ ...item, label: item.label.toUpperCase() })),
	clear: () => [],
	reset: () => initial()
};
