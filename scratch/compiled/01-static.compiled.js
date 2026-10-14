import "svelte/internal/disclose-version";
import * as $ from "svelte/internal/client";

var root = $.template(`<h1>Hello</h1> <p>This component has no state at all.</p>`, 1);

export default function _1_static($$anchor) {
	var fragment = root();

	$.next(2);
	$.append($$anchor, fragment);
}
