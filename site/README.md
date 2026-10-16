# site

학습 기록을 공개하는 인터랙티브 웹 앱입니다. 목적과 원칙은 [VISION.md](VISION.md)에 있습니다.

## 실행

```sh
npm install
npm run dev      # 개발 서버
npm run build    # 정적 사이트를 build/에 생성
npm run preview  # build/ 결과 확인
npm run check    # 타입 검사
```

빌드는 이 폴더(`site/`)에서 실행해야 합니다. 장의 코드 패널은 빌드할 때 상위 폴더의 학습 자료(`playground/`, `scratch/compiled/` 등)를 직접 읽어서 문법 강조를 입힙니다(`src/lib/server/code.js`).

## 구조

| 경로 | 내용 |
|---|---|
| `src/routes/learn/<장>/+page.svx` | 장의 본문입니다. 마크다운 안에 `Step`, `Ask`, `Reveal` 등의 컴포넌트를 넣어 작성합니다. |
| `src/routes/learn/<장>/+page.server.js` | 그 장의 코드 패널에 쓸 파일을 읽어 옵니다. |
| `src/lib/book/` | 첫 화면의 3D 책(`Book`)과 목차(`Contents`)입니다. |
| `src/lib/chapter/` | 장의 골격입니다. 펼친 책 양면(`Chapter`), 문항(`Step`, `Ask`), 접힌 쪽지(`Reveal`), 각주(`Evidence`), 연필 메모(`Hypothesis`) |
| `src/lib/scenes/` | 오른쪽 면의 도판입니다. 번호와 설명이 붙는 틀(`Plate`), 코드(`CodeView`), 형제 노드 탐색(`NodeWalk`) |
| `src/lib/path.js` | 첫 화면의 학습 경로 목록입니다. |

## 장 작성 방법

```svelte
<Chapter id="1-2" part="제1부 · 컴파일 결과 관찰" title="...">

{#snippet panel(scene, revealed)}
	{#if scene === 'predict'}
		<Plate number={1} caption="..."> ... </Plate>
	{/if}
{/snippet}

<Step scene="predict">
<Ask>

유도 질문

</Ask>
<Reveal>

해설

</Reveal>
</Step>

</Chapter>
```

- `Step`의 `scene`은 그 질문을 읽는 동안 오른쪽 패널에 보여 줄 장면의 이름입니다. `panel` snippet이 이 이름과, 해설이 펼쳐졌는지(`revealed`)를 받아서 장면을 그립니다.
- mdsvex는 컴포넌트 안의 마크다운을 앞뒤에 빈 줄이 있을 때만 처리합니다.
- 본문에서 `{`, `}`는 Svelte 표현식으로 해석되므로, 코드 조각은 항상 백틱 안에 넣습니다.
