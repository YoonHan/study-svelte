/**
 * The learning path shown on the home page. It mirrors the "학습 경로" table in
 * `curriculum/01-compiled-output.md`; later stages only have their titles for now.
 *
 * @typedef {object} PathChapter
 * @property {string} id
 * @property {string} title
 * @property {string} [href] set when the chapter has a page
 *
 * @typedef {object} PathStage
 * @property {number} number
 * @property {string} title
 * @property {string} goal
 * @property {PathChapter[]} chapters
 */

/** @type {PathStage[]} */
export const stages = [
	{
		number: 1,
		title: '컴파일 결과 관찰',
		goal: '컴포넌트의 컴파일 결과를 보고, 각 줄이 왜 생기는지 설명할 수 있습니다.',
		chapters: [
			{ id: '1-0', title: '바닐라 카운터와 컴파일 결과 비교' },
			{ id: '1-1', title: '노드를 만드는 방법: 템플릿 파싱과 복제' },
			{ id: '1-2', title: '노드를 찾아가는 방법: 탐색과 공백 자리', href: '/learn/1-2' },
			{ id: '1-3', title: '문서에 넣는 방법: anchor와 블록' },
			{ id: '1-4', title: '값을 쓰고 갱신하는 방법: template_effect' },
			{ id: '1-5', title: '상태 선언이 바뀌는 방법: runes' },
			{ id: '1-6', title: '이벤트를 연결하는 방법: 위임과 hoisting' },
			{ id: '1-7', title: '같은 코드, 다른 출력: hydration, server, legacy, dev' }
		]
	},
	{
		number: 2,
		title: 'signal 시스템',
		goal: '상태 하나를 바꿨을 때 어떤 derived와 effect가 어떤 순서로 다시 실행되는지 추적할 수 있습니다.',
		chapters: []
	},
	{
		number: 3,
		title: 'DOM 계층',
		goal: '블록과 hydration이 DOM의 어느 부분을 어떻게 바꾸는지 설명할 수 있습니다.',
		chapters: []
	},
	{
		number: 4,
		title: '컴파일러',
		goal: '.svelte 파일이 파싱, 분석, 변환을 거쳐 코드가 되는 과정을 설명할 수 있습니다.',
		chapters: []
	},
	{
		number: 5,
		title: '코드 고고학',
		goal: '코드의 한 줄이 왜 그렇게 쓰였는지 git 이력과 PR에서 찾아낼 수 있습니다.',
		chapters: []
	}
];
