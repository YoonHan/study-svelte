# site

학습 기록을 공개하는 인터랙티브 웹 앱입니다. 목적과 원칙은 [VISION.md](VISION.md)에, 장의 글을 쓰는 지침은 [WRITING.md](WRITING.md)에 있습니다.

## 실행

```sh
npm install
npm run dev      # 개발 서버
npm run build    # 정적 사이트를 build/에 생성
npm run preview  # build/ 결과 확인
npm run check    # 타입 검사
npm run fonts    # 폰트 서브셋 생성 (dev, build, check 전에 자동으로 실행)
```

빌드는 이 폴더(`site/`)에서 실행해야 합니다. 코드 패널은 빌드할 때 Shiki로 문법 강조를 입힙니다(`src/lib/server/code.js`).

폰트는 Google Fonts를 쓰지 않고 사이트에서 직접 제공합니다. `scripts/fonts.mjs`가 원본 폰트를 google/fonts 저장소에서 받아 `.cache/fonts/`에 두고, `src/`와 코드 무대에 나오는 svelte@5.0.0 소스에 쓰인 글자만 남긴 woff2를 `src/lib/fonts/`에 만듭니다. 두 폴더 모두 커밋하지 않습니다. 글자가 바뀌지 않았으면 다시 만들지 않습니다. 이렇게 하는 이유는 대체 폰트로 먼저 그렸다가 바꿔 그리는 깜박임(FOUT)을 없애기 위해서입니다. 첫 화면에 쓰는 폰트는 페이지와 함께 미리 받고(`preload`), 폰트가 준비될 때까지 페이지를 숨깁니다(`src/app.html`, 최대 3초).

모든 폰트는 SIL Open Font License 1.1입니다. 서브셋은 라이선스상 수정본이므로, 이름 예약(Reserved Font Name)이 있는 폰트는 파일 안과 CSS에서 이름을 바꿔 씁니다. 저작권과 라이선스 표기는 파일에 그대로 남깁니다.

| CSS 이름 | 원본 | 쓰는 곳 |
|---|---|---|
| `Hahmlet` | Hahmlet | 장 제목, 질문 |
| `Gowun Dodum` | Gowun Dodum | 본문 |
| `Noto Sans KR` | Noto Sans KR | 미지의 부분 라벨 |
| `Inside Hand` | Nanum Pen Script | 손글씨 메모 |
| `Inside Mono` | IBM Plex Mono | 코드 |
| `Inside Code KR` | Nanum Gothic Coding | 코드 속 한글 |

## 구조

| 경로 | 내용 |
|---|---|
| `src/routes/+page.svelte` | 홈이자 목차 페이지입니다(`ContentsBody`). |
| `src/lib/path.js` | 학습 경로: 단계와 장, 장마다 준비되었는지(`ready`). 새 장을 열면 여기서 `ready`를 켭니다. |
| `src/routes/learn/1-1/` | 1-1장 `$.template`입니다. 질문 다섯 개와 실험으로 `template()`의 안쪽을 엽니다. |
| `src/lib/inside/` | 장을 만드는 컴포넌트입니다. `Beat`(조각 하나, `at`을 주면 말풍선), `Hint`(질문 아래의 선택적 힌트), `Say`(한 조각 안의 여러 말풍선, `spot`으로 줄의 일부만 칠함), `Ref`(마우스를 올리면 소스를 보여 주는 인라인 코드), `FileIcon`(파일 확장자 아이콘), `Contents`(장 안의 목차 서랍), `ContentsBody`(목차 본문), `progress.js`(장별 진행 상황), `Step`(질문 하나로 묶인 조각들), `Stage`(왼쪽 코드 무대), `Code`, `Ask`, `Predict`, `Lab`, `Evidence`, `Hypothesis`, 브라우저용 하이라이터(`highlight.js`, `Highlight`, `Editor`), 진행 상태 `state.svelte.js`가 있습니다. |
| `src/lib/inside/runtime.js` | 실험에서 `svelte@5.0.0`의 런타임을 실행합니다. 손으로 쓴 컴포넌트 본문을 `mount`하고(`run`), 그동안 일어난 HTML 파싱과 `cloneNode`/`importNode` 호출을 셉니다(`probe`). |
| `src/lib/inside/template/` | 1-1장의 실험 위젯입니다. |
| `src/lib/counter.js` | 사이트 전체의 예제인 카운터의 원본과, 컴파일 결과의 각 줄을 여는 장(`door_of`)입니다. |
| `src/lib/server/` | 빌드할 때 카운터를 5.0.0으로 컴파일하고(`counter.js`), 소스를 Shiki로 강조합니다(`code.js`). |
| `src/routes/lab/`, `src/lib/trace/` | 이전 기술 시제품(실행 타임라인)입니다. 홈에서는 연결하지 않았고, 기록 엔진은 나중에 실험 도구로 다시 씁니다. |

`svelte@5.0.0`은 사이트 자신의 Svelte와 겹치지 않도록 `svelte-5.0.0`이라는 이름으로, 버전을 정확히 고정해서 설치되어 있습니다(`package.json`의 `"svelte-5.0.0": "npm:svelte@5.0.0"`). 오른쪽 소스 패널은 이 패키지에 들어 있는 `src/`를 읽으므로, `svelte/` 레포의 상태와 상관없이 5.0.0의 줄 번호를 보여 줍니다.

## 새 장을 만드는 방법

1. `src/lib/counter.js`의 `door_of`에서 그 장이 여는 줄을 확인합니다.
2. `src/routes/learn/<장>/+page.server.js`에서 `load_counter()`와 `load_svelte_source(<함수가 있는 파일>)`을 불러옵니다.
3. `+page.svelte`에서 `ChapterState`에 무대에 올릴 수 있는 파일들(소스 범위, 닫힌 상자 포함)을 넘기고, 노트의 유도 질문마다 `Step`을 하나씩 씁니다. `Step` 안에는 질문, 실마리, 예측, 실험, 해설 문단을 `Beat`로 하나씩 씁니다. 무대에 올릴 파일은 `<Beat code={['counter', 'compiled']}>`처럼 지정하고(생략하면 앞 조각의 무대를 이어 씀), 다른 파일의 줄도 함께 밝히려면 `also`를 씁니다. 5줄 이상을 밝히는 조각에서 꼭 짚을 줄은 `stress`로 지정합니다. 코드에 대한 문장은 `<Beat at={줄}>`로 말풍선을 만들고, 해설의 첫 조각에는 `answer`를 붙입니다. 질문 조각 안에는 `<Hint n={1}>`, `<Hint n={2} at={줄}>`처럼 힌트를 순서대로 둡니다. 실험 위젯은 `src/lib/inside/<함수 이름>/`에 둡니다.
4. `src/lib/path.js`에서 그 장의 `ready`를 `true`로 바꿉니다. 목차와 "다음 장" 링크가 이 값을 따릅니다.
