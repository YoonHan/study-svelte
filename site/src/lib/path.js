/**
 * The learning path: stages and their chapters, in reading order. Only stage 1 has its
 * chapters laid out so far (`curriculum/01-compiled-output.md`, "학습 경로"); the others get
 * theirs when that stage starts.
 *
 * @typedef {{ id: string, title: string, ready: boolean }} Chapter
 * @typedef {{ no: number, title: string, chapters: Chapter[] }} Stage
 */

/** @type {Stage[]} */
export const STAGES = [
	{
		no: 1,
		title: '컴파일 결과 관찰',
		chapters: [
			{ id: '1-0', title: '직접 짠 카운터와 Svelte 컴파일 결과 비교', ready: false },
			{ id: '1-1', title: 'Svelte에서 DOM 노드를 만드는 방법', ready: true },
			{ id: '1-2', title: '복제한 DOM 안에서 노드를 찾아가는 방법', ready: false },
			{ id: '1-3', title: '만든 DOM을 문서에 넣는 방법', ready: false },
			{ id: '1-4', title: '화면에 값을 쓰고 상태에 따라 갱신하는 방법', ready: false },
			{ id: '1-5', title: '$state 선언이 일반 JavaScript로 컴파일되는 방법', ready: false },
			{ id: '1-6', title: '이벤트 핸들러를 DOM에 연결하는 방법', ready: false },
			{
				id: '1-7',
				title: '서버 렌더링, 하이드레이션, 개발 모드에서 달라지는 컴파일 결과',
				ready: false
			}
		]
	},
	{ no: 2, title: 'signal 시스템', chapters: [] },
	{ no: 3, title: 'DOM 계층', chapters: [] },
	{ no: 4, title: '컴파일러', chapters: [] },
	{ no: 5, title: '코드 고고학', chapters: [] }
];

/** @param {string} id */
export function chapter_of(id) {
	return STAGES.flatMap((stage) => stage.chapters).find((chapter) => chapter.id === id);
}

/**
 * The chapter after `id` in reading order, if any.
 * @param {string} id
 */
export function next_chapter(id) {
	const all = STAGES.flatMap((stage) => stage.chapters);
	const i = all.findIndex((chapter) => chapter.id === id);
	return i === -1 ? undefined : all[i + 1];
}
