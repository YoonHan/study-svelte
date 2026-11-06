# 학습 진행 기록

튜터가 이 파일을 갱신합니다. 직접 수정해도 괜찮습니다.

## 현재 상태와 다음 할 일 (2026-10-27 기준)

다른 머신에서 이어서 작업하기 위한 인수인계입니다. 작업을 이어 갈 때마다 이 절을 최신으로 고칩니다.

### 다른 머신에서 시작하기

```bash
git clone https://github.com/YoonHan/study-svelte.git svelte-study
cd svelte-study
git config user.name "Yoon Han"
git config user.email "yoontopia94@gmail.com"
node tools/setup.mjs          # svelte/ clone, study/5.0.0 브랜치, 의존성 설치 (Node 22.15 이상)
cd site && npm install && npm run dev
```

- push를 `YoonHan` 계정으로 하려면 그 머신의 `gh`에 `YoonHan` 계정으로 로그인한 뒤, 이 레포의 로컬 git 설정에 인증 도우미를 지정합니다. 이 머신에서 쓴 설정은 다음과 같습니다(전역 설정은 건드리지 않습니다).
  ```bash
  git config --local credential.https://github.com.helper ''
  git config --local --add credential.https://github.com.helper '!f() { test "$1" = get && echo username=YoonHan && echo "password=$(gh auth token --user YoonHan)"; }; f'
  git config --local credential.https://github.com.username YoonHan
  ```
- 튜터의 작업 관례(CLI 대신 실행, 커밋 작성자, push 계정)는 `CLAUDE.md`의 "작업 관례" 절에 있습니다. 이전 머신의 Claude 메모리는 옮겨지지 않으므로 이 절이 기준입니다.

### 공부

- **1단계 진행 중.** 학습 경로는 `curriculum/01-compiled-output.md`의 "학습 경로" 표를 따릅니다.
- 끝난 질문: Q1.0, Q1.1, Q1.2, Q1.3, Q1.4, Q1.6. 유도 질문과 해설은 `notes/01-compiled-output.md`에 있습니다.
- **Q1.6을 2026-11-02에 마쳤습니다** (유도 질문 6개). 두 방식은 마운트마다 같은 9개의 노드를 만들지만, 템플릿 방식은 파싱 1번 뒤 `cloneNode` 한 번으로 만들고, 대신 필요한 노드를 다시 찾아가는 비용(카운터는 마운트당 8번)을 치릅니다. Chromium 측정에서도 템플릿 방식이 빠르고, 정적 마크업이 많을수록 차이가 커집니다. 실험: `labs/01-compiled-output/create-vs-clone.mjs`, `create-vs-clone.bench.html`. **다음 할 일: 1-1장 끝에 열어 둔 질문을 Q1.6의 질문 6으로 바꿔 해설과 실험을 붙입니다.**
- 그다음: 1-2장(Q1.3, Q1.2, 이미 공부함)을 사이트로 만들고, 이어서 1-3장(Q1.4 (2), Q1.18).

### 사이트 (`site/`)

- **"Svelte 대백과"**: 홈(3D 금속 로고, 목차), 장 페이지(왼쪽 코드 무대 + 오른쪽 글, "다음"을 눌러 조각을 하나씩 엶). 글쓰기와 디자인 규칙은 `site/WRITING.md`, 목적은 `site/VISION.md`에 있습니다.
- **완성된 장**: 1-0장(직접 짠 카운터와 컴파일 결과 비교), 1-1장(Q1.1, Q1.4 파싱 시점). 1-1장 끝에는 Q1.6(노트에 정리됨)을 질문 6으로 더할 예정입니다.
- **최근 작업(2026-10-22~27)**: 파비콘과 홈 화면 아이콘(돋보기를 얹은 Svelte 로고), 연필 커서, 선택 색, 장의 출구는 장 끝 "다음 장" 하나, 왼쪽 가장자리의 색인 탭(홈, 목차).
- **검증**: `site/`에서 `npm run check`, `npm run lint`, `npm run test:render`. 사이트를 고친 뒤 캡처하기 전에는 5173 개발 서버를 다시 띄웁니다(예전 CSS가 남는 일이 잦습니다).

## 단계별 진행 상황

| 단계 | 상태 | 시작일 | 완료일 | 체크포인트(`/quiz`) | 메모 |
|---|---|---|---|---|---|
| 1. 컴파일 결과 관찰 | 진행 중 | 2026-10-12 | | | |
| 2. signal 시스템 | 시작 전 | | | | |
| 3. DOM 계층 | 시작 전 | | | | |
| 4. 컴파일러 | 시작 전 | | | | |
| 5. 코드 고고학 | 시작 전 | | | | |

상태 값: `시작 전` / `진행 중` / `완료`

## 질문별 채점 기록

질문지의 질문 하나를 마칠 때마다 튜터가 한 줄씩 추가합니다. 2026-10-16까지의 기록은 학습자가 노트를 직접 쓰고 `/check`로 채점받던 방식의 이력입니다.

| 날짜 | 질문 | 결과 | 다시 볼 부분 |
|---|---|---|---|
| 2026-10-13 | Q1.1 | 부분 정답 | `3`이 두 비트의 조합임을 노트에 반영, `is_fragment`가 꺼졌을 때의 런타임 처리(`template.js:48`, `:55-62`), 컴파일러 근거(`Fragment.js`, `RegularElement.js:62-69`) 보강 |
| 2026-10-13 | Q1.1 | 정확 | 재채점. `3` 항목의 플래그 이름 오타(`TEMPLATE_FRAGMENT`), 근거 칸에 컴파일 실험 결과(01/02/11/11b) 추가 권장. 컴파일러 근거 요구는 철회(관찰 질문이므로 실험 결과로 충분) |
| 2026-10-14 | Q1.2 | 부분 정답 | 공백 한 칸이 필요한 이유(빈 `<p></p>`에는 텍스트 노드가 없음), 함수 호출 규칙의 예외(전역 함수 + 지역 의존성 없음 → 정적, `CallExpression.js:173-181`), `03-text-kinds` 컴파일 결과를 근거로 추가 |
| 2026-10-14 | Q1.2 | 부분 정답 | 재채점. 공백 한 칸과 `null` → `TypeError` 인과는 정확. 함수 호출 예외 규칙을 "인자가 고정된 순수 함수"로 적었으나 `03b`(`format(name)`)와 모순됨 → `is_pure`(`2-analyze/visitors/shared/utils.js:183-198`)의 실제 기준 확인 필요. `03-text-kinds` 근거 아직 없음 |
| 2026-10-14 | Q1.2 | 부분 정답 | 3차 채점. 핵심(어떤 `<p>`가 비는지, 공백 → 텍스트 노드 → `null` → `TypeError`)과 `03-text-kinds` 근거는 정확. `is_pure`를 "identifier가 scope 내에 유일하면 true"로 잘못 읽음(실제는 `utils.js:191-193`의 `binding === null`) → `03b`와 모순. "`<p></p>`는 렌더링되지 않음" 표현 수정 필요 |
| 2026-10-14 | Q1.2 | 부분 정답 | 4차 채점. `<p></p>` 표현 문제 해소. `is_pure` 설명("선언된 적이 있으면 true")과 `CallExpression.js` 조건 설명("is_pure가 false면 정적")이 둘 다 코드와 반대로 뒤집혀 있어 서로 상쇄됨 → `utils.js:193`, `CallExpression.js:178` 다시 읽기 |
| 2026-10-14 | Q1.2 | 부분 정답 | 5차 채점. `is_pure` 설명은 바로잡힘(선언되지 않은 전역이면 true). `CallExpression.js` 설명("is_pure가 false면 정적")이 아직 반대로 남아 있어 `03c`의 `Math.max` 결과와 모순 → `CallExpression.js:178`의 `!` 확인 |
| 2026-10-14 | Q1.2 | 정확 | 6차 채점. `CallExpression.js` 설명을 "is_pure가 true이고 의존성이 없으면 정적"으로 바로잡음. 함수 호출 판단 규칙과 공백 → 텍스트 노드 → `null` → `TypeError` 인과까지 모두 근거와 함께 정리됨 |
| 2026-10-14 | Q1.3 | 부분 정답 | (1) 템플릿 문자열 예측과 차이 분석은 정확(`<!>`, 정적 텍스트 포함, `{name} is the second node`가 `<!>` 뒤 공백 텍스트 노드에 들어감). (2) `$.sibling(text, 5)`의 `5` 예측과 `<b>`/`<i>` 변수가 없는 이유가 빠짐. 인라인 요소 사이 공백이 줄바꿈으로 보인다는 오해 확인 필요 |
| 2026-10-14 | Q1.3 | 부분 정답 | 재채점. 템플릿 문자열 분석은 정확. `5` 계산(대화에서는 정확히 답함)이 노트에 없음. `<b>`/`<i>` 변수 없음을 "정적 노드라서"로만 설명 → 정적의 조건(`shared/fragment.js:128-158`)과 "런타임에 그 노드로 할 일이 없으면 변수가 필요 없다"는 연결이 빠짐 |
| 2026-10-14 | Q1.3 | 정확 | 3차 채점. `5` 계산과 `<b>`/`<i>`가 정적이라 변수 없이 탐색 횟수로만 표현된다는 점 반영. 남은 정리: 인용 블록의 "그냥.. 정적인 텍스트이기 때문 아닌가?" 초안 문장, `is_static_element`는 자식뿐 아니라 속성도 검사함(`shared/fragment.js:128-158`) |
| 2026-10-16 | Q1.4 | 부분 정답 | `<!>`를 덧붙이는 이유(`destroy_effect` 범위)와 `first_child`와의 합의는 정확. 빠진 것: 파싱이 "한 번만" 일어나고 이후 복제한다는 점(`template.js:46-53`의 `node === undefined`), 세 번째 물음(빈 텍스트 노드 = `render.js:229`, 맨 앞 `<!---->` = 덧붙인 주석), `> 근거:` 형식의 file:line과 실험 결과 |
| 2026-10-16 | Q1.4 | 부분 정답 | 재채점. 한 번만 파싱하고 이후 복제한다는 점, 빈 텍스트 노드(`render.js:229`), 근거 줄 번호 모두 반영. 세 번째 물음 중 맨 앞 `<!---->`가 어디서 만들어지는지가 아직 없음. 파싱 시점 단락에 근거(`template.js:46-53`, 실험) 추가 권장 |
| 2026-10-16 | Q1.4 | 부분 정답 | 3차 채점. 노트의 "맨 앞 `<!---->`는 `$.template()`이 반환한 함수가 호출될 때 생긴다"는 정확. 다만 근거로 든 위치가 뒤바뀜: `08-blocks.compiled.js:11`의 `<!>`는 `{#if}` anchor(B), 덧붙이는 곳은 `template.js:47`, 숨기는 곳은 `operations.js:122` |
| 2026-10-16 | Q1.4 | 정확 | 4차 채점. 세 물음 모두 근거와 함께 정리됨. 대화에서 `08-blocks.compiled.js:11`의 첫 `<!>`를 A(덧붙인 주석)로 답했으나 실제로는 B(`{#if}` anchor) → 컴파일 시점 문자열과 런타임에 붙는 주석 구분 확인 필요 |

결과 값: `정확` / `부분 정답` / `오해 있음`

## 막힌 질문

힌트를 모두 봐도 해결하지 못한 질문을 적습니다.

-

## 궁금증 백로그

질문지에 없지만 공부하다가 떠오른 의문을 적습니다. 5단계에서 git 이력으로 추적할 대상이 되기도 합니다.

- (2026-10-12) `update_effect(effect)`는 `update_reaction(effect)`를 호출하는데(`runtime.js:442`), 받는 쪽 매개변수 이름은 왜 `effect`가 아니라 `reaction`인가? `reaction`이라는 개념에는 effect 말고 무엇이 더 포함되는가? → 2단계에서 확인
- (2026-10-12) 컴파일 결과에서 `$.template_effect`(초기 값 쓰기)가 `$.append`(문서에 삽입)보다 먼저 실행되는 이유는 무엇인가? 같은 동기 코드 안에서는 순서와 관계없이 페인트가 한 번만 일어난다는 것을 실험으로 확인했으므로(`scratch/01-vanilla-counter.html`), 페인트 횟수는 이유가 아니다. 하위 컴포넌트와 블록이 anchor 기준으로 삽입되는 방식과 관련이 있을 것으로 추측 → 1-D 절, 3단계에서 확인
- (2026-10-13) 컴파일러는 상태를 읽지 않는 함수 호출(`{format(name)}`)도 "바뀔 수 있다"고 보고 `template_effect`를 만든다(`shared/fragment.js:71-80`). 런타임이 의존성 없는 effect를 트리에서 빼 주므로(`effects.js:137-145`) 비용은 작지만, 프로그램 전체의 데이터 흐름을 분석하는 대신 이 보수적인 규칙을 택한 근거는 무엇이었나? Svelte 팀은 이런 트레이드오프를 어떤 기준으로 결정했나? 단서: `2-analyze/visitors/CallExpression.js:174-177`의 TODO 주석이 이 트레이드오프를 언급하며 https://github.com/sveltejs/svelte/issues/13266 을 가리킴 → 5단계에서 git 이력과 PR 토론으로 확인
- (2026-10-14) `operations.js:35-37`은 `Node.prototype`의 `firstChild`/`nextSibling` getter를 꺼내 캐싱해 두고 `get_first_child`/`get_next_sibling`에서 `.call(node)`로 호출한다. 왜 `node.firstChild`를 직접 쓰지 않는가? 프로토타입 체인 탐색을 줄이려는 것인지, 여러 종류의 노드에 호출되는 자리에서 엔진의 인라인 캐시가 megamorphic 상태가 되는 것을 피하려는 것인지, 다른 이유가 있는지 확인 → 5단계에서 이 코드를 도입한 PR 추적
