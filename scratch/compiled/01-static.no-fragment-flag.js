import "svelte/internal/disclose-version";
import * as $ from "svelte/internal/client";

var root = $.template(`<h1>Hello</h1> <p>This component has no state at all.</p>`);  // 실험: 두 번째 인자 1(TEMPLATE_FRAGMENT)을 지움

export default function _1_static($$anchor) {
	var fragment = root();

	$.next(2);
	$.append($$anchor, fragment);
}
