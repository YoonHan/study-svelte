/**
 * Chapter 1-0: the seven jobs the hand-written counter and the compiled output both do (or
 * only the compiled output does), with the lines that do each in either one (1-based, in
 * `VANILLA_SOURCE` and in the compiled `Counter.js`), the "why" question each difference
 * raises, and the chapter that answers it. From notes/01-compiled-output.md, Q1.0.
 *
 * @typedef {{
 *   no: number,
 *   job: string,
 *   vanilla: number[],
 *   compiled: number[],
 *   why: string,
 *   chapter: string
 * }} Job
 * @type {Job[]}
 */
export const JOBS = [
	{
		no: 1,
		job: '요소 만들기',
		vanilla: [3, 9, 11],
		compiled: [6, 10],
		why: '왜 `createElement` 대신 템플릿 문자열로 요소를 만들까?',
		chapter: '1-1'
	},
	{
		no: 2,
		job: '텍스트 쓰기',
		vanilla: [12, 19, 20],
		compiled: [29, 30],
		why: '왜 `.innerText`를 쓰지 않을까?',
		chapter: '1-4'
	},
	{
		no: 3,
		job: '이벤트 핸들러 붙이기',
		vanilla: [4, 13],
		compiled: [4, 5, 13, 26, 36],
		why: '왜 버튼마다 `__click`에 핸들러를 저장하고, 공용 리스너로 처리할까?',
		chapter: '1-6'
	},
	{
		no: 4,
		job: '문서에 넣기',
		vanilla: [23, 24, 25],
		compiled: [33],
		why: '왜 요소마다 `appendChild`로 넣지 않을까?',
		chapter: '1-3'
	},
	{
		no: 5,
		job: '상태 선언과 변경',
		vanilla: [1, 5, 14],
		compiled: [4, 5, 9],
		why: '왜 `count`를 그냥 `let` 변수로 두지 않고 `$.state()`로 만들고, `$.update()`와 `$.set()`으로 바꿀까?',
		chapter: '1-5'
	},
	{
		no: 6,
		job: '상태가 바뀌면 다시 그리기',
		vanilla: [6, 15],
		compiled: [28, 29, 30, 31],
		why: '왜 `render()`를 직접 부르지 않고, 그리는 코드가 알아서 다시 실행되게 했을까?',
		chapter: '1-4'
	},
	{
		no: 7,
		job: '다룰 노드 찾아가기',
		vanilla: [],
		compiled: [11, 15, 19, 20, 24],
		why: '왜 노드를 찾아가는 코드가 따로 있을까?',
		chapter: '1-2'
	}
];

/** @param {number} no */
export const job_of = (no) => /** @type {Job} */ (JOBS.find((job) => job.no === no));
