import "svelte/internal/disclose-version";
import * as $ from "svelte/internal/client";

var on_click = (_, count) => $.update(count);
var root = $.template(`<p></p> <p></p> <p> </p> <p> </p> <p> </p> <p> </p> <button>+1</button>`, 1);  // 실험: 두 번째 <p>의 공백 한 칸을 지움

export default function _3_text_kinds($$anchor) {
	const name = 'world';
	let count = $.state(0);

	function format(n) {
		return `#${n}`;
	}

	var fragment = root();
	var p = $.first_child(fragment);

	p.textContent = `constant: ${name ?? ""}`;

	var p_1 = $.sibling(p, 2);
	var text = $.child(p_1);

	$.reset(p_1);

	var p_2 = $.sibling(p_1, 2);
	var text_1 = $.child(p_2);

	$.reset(p_2);

	var p_3 = $.sibling(p_2, 2);
	var text_2 = $.child(p_3);

	$.template_effect(() => $.set_text(text_2, `call: ${format($.get(count)) ?? ""}`));
	$.reset(p_3);

	var p_4 = $.sibling(p_3, 2);
	const stringified_text = $.derived(() => format($.get(count)) ?? "");
	const stringified_text_1 = $.derived(() => format($.get(count) + 1) ?? "");
	var text_3 = $.child(p_4);

	$.template_effect(() => $.set_text(text_3, `two calls: ${$.get(stringified_text)} / ${$.get(stringified_text_1)}`));
	$.reset(p_4);

	var p_5 = $.sibling(p_4, 2);
	var text_4 = $.child(p_5);

	$.reset(p_5);

	var button = $.sibling(p_5, 2);

	button.__click = [on_click, count];

	$.template_effect(() => {
		$.set_text(text, `state: ${$.get(count) ?? ""}`);
		$.set_text(text_1, `mixed: ${name ?? ""} has ${$.get(count) ?? ""} clicks`);
		$.set_text(text_4, $.get(count));
	});

	$.append($$anchor, fragment);
}

$.delegate(["click"]);
