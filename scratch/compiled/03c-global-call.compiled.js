import "svelte/internal/disclose-version";
import * as $ from "svelte/internal/client";

var root = $.template(`<p></p> <p> </p>`, 1);

export default function _3c_global_call($$anchor) {
	const name = 'world';
	var fragment = root();
	var p = $.first_child(fragment);

	p.textContent = `a: ${Math.max(1, 2) ?? ""}`;

	var p_1 = $.sibling(p, 2);
	var text = $.child(p_1);

	$.template_effect(() => $.set_text(text, `b: ${String(name) ?? ""}`));
	$.reset(p_1);
	$.append($$anchor, fragment);
}
