/**
 * Syntax colours as pens: code in the notebook looks copied out by hand with a few coloured
 * pens, not pasted from an editor. Used by Shiki at build time (`server/code.js`) and in the
 * browser (`inside/highlight.js`).
 *
 * keyword: red pen · function and tag: blue pen · string: green pen · number: purple pen ·
 * comment: pencil · everything else: ink.
 */

/**
 * @param {string} name
 * @param {'light' | 'dark'} type
 * @param {{ ink: string, red: string, blue: string, green: string, purple: string, pencil: string }} pen
 */
function theme(name, type, pen) {
	return {
		name,
		type,
		colors: { 'editor.foreground': pen.ink, 'editor.background': '#00000000' },
		tokenColors: [
			{ settings: { foreground: pen.ink } },
			{
				scope: [
					'keyword',
					'storage',
					'storage.type',
					'storage.modifier',
					'keyword.control',
					'keyword.operator.new',
					'keyword.operator.expression',
					'variable.language'
				],
				settings: { foreground: pen.red }
			},
			{
				scope: [
					'entity.name.function',
					'support.function',
					'meta.function-call entity.name.function',
					'entity.name.tag',
					'support.class.component'
				],
				settings: { foreground: pen.blue }
			},
			{
				scope: ['string', 'string.template', 'punctuation.definition.string'],
				settings: { foreground: pen.green }
			},
			{ scope: ['constant.numeric', 'constant.language'], settings: { foreground: pen.purple } },
			{ scope: ['entity.other.attribute-name'], settings: { foreground: pen.purple } },
			{
				scope: ['comment', 'punctuation.definition.comment'],
				settings: { foreground: pen.pencil, fontStyle: 'italic' }
			},
			{
				scope: ['keyword.operator', 'punctuation', 'meta.brace'],
				settings: { foreground: pen.pencil }
			}
		]
	};
}

export const pen_light = theme('pen-light', 'light', {
	ink: '#24272b',
	red: '#c0322c',
	blue: '#2747b0',
	green: '#2a7a4b',
	purple: '#7d3fa6',
	pencil: '#7c818a'
});

export const pen_dark = theme('pen-dark', 'dark', {
	ink: '#e9e6dd',
	red: '#ff8f85',
	blue: '#93acff',
	green: '#82d6a3',
	purple: '#d3a6f0',
	pencil: '#8f8d87'
});
