import "svelte/internal/disclose-version";
import * as $ from "svelte/internal/client";

var root = $.template(`<h1>Hello</h1>`);

export default function _2_single_element($$anchor) {
	var h1 = root();

	$.append($$anchor, h1);
}
