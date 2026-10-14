import "svelte/internal/disclose-version";
import * as $ from "svelte/internal/client";

var root = $.template(`<my-widget></my-widget>`, 2);

export default function _1b_single_custom_element($$anchor) {
	var my_widget = root();

	$.set_custom_element_data(my_widget, "label", "hello");
	$.append($$anchor, my_widget);
}
