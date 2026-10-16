import "svelte/internal/disclose-version";
import * as $ from "svelte/internal/client";
import Child from './Child.svelte';

var root_1 = $.template(`<p>visible</p>`);
var root_2 = $.template(`<p>hidden</p>`);
var root_3 = $.template(`<li> </li>`);
var root_4 = $.template(`<li> </li>`);
var root_5 = $.template(`<p>slotted content</p>`);
var on_click = (_, show) => $.set(show, !$.get(show));
var root = $.template(`<!> <ul></ul> <ul></ul> <!> <button>toggle</button>`, 1);

export default function _8_blocks($$anchor) {
	let show = $.state(true);

	let items = $.proxy([
		{ id: 1, text: 'a' },
		{ id: 2, text: 'b' }
	]);

	var fragment = root();
	var node = $.first_child(fragment);

	$.if(
		node,
		() => $.get(show),
		($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		},
		($$anchor) => {
			var p_1 = root_2();

			$.append($$anchor, p_1);
		}
	);

	var ul = $.sibling(node, 2);

	$.each(ul, 21, () => items, $.index, ($$anchor, item) => {
		var li = root_3();
		var text = $.child(li);

		$.reset(li);
		$.template_effect(() => $.set_text(text, $.get(item).text));
		$.append($$anchor, li);
	});

	$.reset(ul);

	var ul_1 = $.sibling(ul, 2);

	$.each(ul_1, 21, () => items, (item) => item.id, ($$anchor, item) => {
		var li_1 = root_4();
		var text_1 = $.child(li_1);

		$.reset(li_1);
		$.template_effect(() => $.set_text(text_1, $.get(item).text));
		$.append($$anchor, li_1);
	});

	$.reset(ul_1);

	var node_1 = $.sibling(ul_1, 2);

	Child(node_1, {
		label: "hello",
		children: ($$anchor, $$slotProps) => {
			var p_2 = root_5();

			$.append($$anchor, p_2);
		},
		$$slots: { default: true }
	});

	var button = $.sibling(node_1, 2);

	button.__click = [on_click, show];
	$.append($$anchor, fragment);
}

$.delegate(["click"]);
