import "svelte/internal/disclose-version";
import * as $ from "svelte/internal/client";

var root_1 = $.template(`<span>first</span>`);
var root = $.template(`<!> <b>static</b> <i>static</i> <em> </em>`, 1);

export default function _9_anchors($$anchor) {
	let show = true;
	let name = 'svelte';
	var fragment = root();
	var node = $.first_child(fragment);

	$.if(node, () => show, ($$anchor) => {
		var span = root_1();

		$.append($$anchor, span);
	});

	var text = $.sibling(node);
	var em = $.sibling(text, 5);
	var text_1 = $.child(em);

	$.reset(em);

	$.template_effect(() => {
		$.set_text(text, ` ${name ?? ""} is the second node `);
		$.set_text(text_1, name);
	});

	$.append($$anchor, fragment);
}
