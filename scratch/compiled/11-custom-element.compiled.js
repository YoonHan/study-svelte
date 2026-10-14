import "svelte/internal/disclose-version";
import * as $ from "svelte/internal/client";

var root = $.template(`<my-widget></my-widget> <p>after</p>`, 3);

export default function _1_custom_element($$anchor) {
	var fragment = root();
	var my_widget = $.first_child(fragment);

	$.set_custom_element_data(my_widget, "label", "hello");
	$.next(2);
	$.append($$anchor, fragment);
}
