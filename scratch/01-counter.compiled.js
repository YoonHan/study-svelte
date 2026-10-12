import "svelte/internal/disclose-version";
import * as $ from "svelte/internal/client";

var on_click = (_, count) => $.update(count);
var on_click_1 = (_, count) => $.set(count, 0);
var root = $.template(`<button> </button> <p> </p> <button>초기화</button>`, 1);

export default function _1_counter($$anchor) {
	let count = $.state(0);
	var fragment = root();
	var button = $.first_child(fragment);

	button.__click = [on_click, count];

	var text = $.child(button);

	$.reset(button);

	var p = $.sibling(button, 2);
	var text_1 = $.child(p);

	$.reset(p);

	var button_1 = $.sibling(p, 2);

	button_1.__click = [on_click_1, count];

	$.template_effect(() => {
		$.set_text(text, $.get(count));
		$.set_text(text_1, `두 배: ${$.get(count) * 2 ?? ""}`);
	});

	$.append($$anchor, fragment);
}

$.delegate(["click"]);
