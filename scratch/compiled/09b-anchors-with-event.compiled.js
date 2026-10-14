import "svelte/internal/disclose-version";
import * as $ from "svelte/internal/client";

var root_1 = $.template(`<span>first</span>`);
var on_click = () => console.log('hi');
var root = $.template(`<!> <b>static</b> <i>static</i> <em> </em>`, 1);

export default function _9b_anchors_with_event($$anchor) {
	let show = true;
	let name = 'svelte';
	var fragment = root();
	var node = $.first_child(fragment);

	$.if(node, () => show, ($$anchor) => {
		var span = root_1();

		$.append($$anchor, span);
	});

	var text = $.sibling(node);
	var b = $.sibling(text);

	b.__click = [on_click];

	var em = $.sibling(b, 4);
	var text_1 = $.child(em);

	$.reset(em);

	$.template_effect(() => {
		$.set_text(text, ` ${name ?? ""} is the second node `);
		$.set_text(text_1, name);
	});

	$.append($$anchor, fragment);
}

$.delegate(["click"]);
