import "svelte/internal/disclose-version";
import * as $ from "svelte/internal/client";

var root = $.template(`<p> </p>`);

export default function _3b_static_call($$anchor) {
	const name = 'world';

	function format(n) {
		return `#${n}`;
	}

	var p = root();
	var text = $.child(p);

	$.template_effect(() => $.set_text(text, `call: ${format(name) ?? ""}`));
	$.reset(p);
	$.append($$anchor, p);
}
