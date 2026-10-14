import "svelte/internal/disclose-version";
import * as $ from "svelte/internal/client";

var on_click = (_, count) => $.update(count);
var root = $.template(`<p> </p> <button>+1</button>`, 1);

export default function _3d_global_call_with_state($$anchor) {
	let count = $.state(0);
	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p);

	$.template_effect(() => $.set_text(text, Math.max($.get(count), 1)));
	$.reset(p);

	var button = $.sibling(p, 2);

	button.__click = [on_click, count];
	$.append($$anchor, fragment);
}

$.delegate(["click"]);
