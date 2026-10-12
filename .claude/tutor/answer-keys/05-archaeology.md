> **스포일러: 학습자는 열람하지 않는 것을 권장합니다.**
> 이 파일은 튜터(Claude)가 `/check`, `/hint`, `/quiz`에서 참고하는 정답 기준입니다.

# 5단계 정답 기준: 코드 고고학 (5.0.0 → main)

## 기준 시점

- 모든 수치는 로컬 `main` = `707c28146` (5.57.2 이후, `fix: keep creating state sources for property checks during component init (#18949)`) 기준입니다. 학습자가 `git fetch`를 했다면 커밋 수와 줄 수가 조금 다를 수 있으므로, 숫자가 다르다는 이유만으로 오답 처리하지 마세요. 먼저 `git -C svelte log --oneline -1 main`으로 기준을 확인하세요.
- 커밋 SHA와 PR 번호, 첫 릴리스는 이력이 바뀌지 않는 한 고정입니다.
- PR 토론(GitHub 웹)의 내용은 이 answer key에서 검증하지 않았습니다. 학습자가 PR 토론을 근거로 답하면, 그 내용이 git 이력·코드와 모순되지 않는지만 확인하세요.

## 5-A. 도구 익히기

### Q5.1
- `git diff --stat svelte@5.0.0 main -- packages/svelte/src/internal/client`: **78 files changed, 9723 insertions(+), 3533 deletions(-)**.
- `git rev-list --count svelte@5.0.0..main -- packages/svelte/src/internal/client`: **607** 커밋 (레포 전체로는 2013 커밋).
- 수정 횟수 상위: `runtime.js` 121, `reactivity/batch.js` 117, `reactivity/deriveds.js` 71 (그다음 `effects.js` 69, `sources.js` 64).
- 핵심 통찰: `batch.js`는 2025-07-14에 생겼는데도(5.36.0) 5.0.0부터 존재한 `runtime.js`와 비슷한 횟수로 수정되었습니다. 비동기 렌더링과 스케줄링이 5.x 후반에 가장 활발히 바뀐 영역입니다.

### Q5.2
- 가장 오래된 커밋: `fe8a9ce31` **"breaking: init Svelte 5"**, 2023-11-10, 작성자 Simon Holthausen (Co-authored-by Rich Harris, Simon Holthausen, Dominic Gannaway). 부모는 `1369aa5ce Version Packages (#9380)`.
- `git show --stat`: **7233 files changed, 86262 insertions(+), 86797 deletions(-)**. 제목에 PR 번호가 없습니다(`whence.mjs`의 PR 항목이 비어 있음). 첫 태그는 `svelte@5.0.0-next.1`.
- 의미: Svelte 5 코드베이스를 한 번에 들여온 커밋입니다. blame이 이 커밋을 가리키면 "그 줄은 Svelte 5 초기 코드에 이미 있었다"는 것까지만 이 레포에서 알 수 있습니다. 그 이전에 그 줄이 어떻게 만들어졌는지는 이 레포의 이력으로 알 수 없습니다.
- 주의: 이 커밋 이전의 개발이 어디에서 이루어졌는지는 이 answer key에서 검증하지 않았습니다. 학습자가 특정 저장소나 브랜치를 단정하면 근거를 물어보세요.

### Q5.3
- `-S 'check_dirtiness'`: **2** 커밋 (`3f3cf9ff3` rename #16359, `c91e69b15` "remove some unnecessary code" #16160).
- `-G 'check_dirtiness'`: **8** 커밋 (`3f3cf9ff3`, `c91e69b15`, `92ea58bee` #16150, `2d2772a4a` #16091, `be82332ac` #15397, `51337f22b` #15348, `73220b866` #15270, `ed7ebcde1` #14211).
- `-S`(pickaxe)는 파일 안에서 문자열의 **등장 횟수가 바뀐** 커밋만 찾습니다. 호출하는 줄을 수정만 하거나 옮기면 횟수가 그대로라서 잡히지 않습니다.
- `-G`는 diff의 추가·삭제 줄 중에 정규식과 맞는 줄이 **하나라도 있는** 커밋을 찾습니다. 그래서 더 많이 잡힙니다.
- 용도: "언제 생기고 없어졌나"는 `-S`, "그 이름이 등장하는 줄을 건드린 모든 커밋"은 `-G`.

### Q5.4
- `--follow` 없이: 가장 오래된 커밋은 `6798efacb` **"chore: Rename Payload to Renderer (#16786)"** (첫 릴리스 `svelte@5.39.1`).
- `--follow`: 이력이 이어져서 가장 오래된 커밋은 `ec1d85c89` "fix: add snippet argument validation in dev (#15521)" (2025-04-10, `svelte@5.26.0`)이고, 이때 `payload.js`가 처음 만들어졌습니다. 전체 39 커밋.
- 경계 커밋 `6798efacb`에서 `internal/server/payload.js` → `internal/server/renderer.js`로 rename(R070, 유사도 70%)되었습니다.
- 5.0.0의 `src/internal/server/`에는 `payload.js`도 없습니다(`blocks`, `context.js`, `dev.js`, `errors.js`, `hydration.js`, `index.js`, `types.d.ts`만 있음).
- `--follow`는 파일 하나에만 적용되며, 유사도 기반 rename 감지에 의존한다는 점을 학습자가 언급하면 좋습니다.

### Q5.5
- main `batch.js`의 `flush_queued_effects`(66줄)에 대해:
  - `blame -w`: `f549478dd` 23줄, **`0672e4822` 22줄**, `4eee2f7c9` 7줄, `2b85d2a54` 7줄 등.
  - `blame -w -C`: `f549478dd` 23줄, **`0672e4822` 8줄**, **`c39805d02` 7줄**(새로 나타남), `4eee2f7c9` 7줄, `2b85d2a54` 7줄 등.
- `0672e4822`(#15844)는 이 함수를 `runtime.js`에서 `batch.js`로 **옮긴** 커밋입니다. `-C` 없이 보면 옮긴 커밋이 그 줄을 "작성한" 것처럼 보입니다.
- `-C`는 같은 커밋에서 수정된 다른 파일에서 옮겨 오거나 복사한 줄을 감지해서 원래 커밋까지 거슬러 올라갑니다. `c39805d02`는 "feat: detach inert effects (#11955)" (2024-06-10, 첫 태그 `5.0.0-next.153`)로, 5.0.0 이전에 작성된 줄입니다.
- `-C`를 한 번만 붙여도 결과가 같습니다(`runtime.js`가 같은 커밋에서 수정되었기 때문). `-C -C`, `-C -C -C`는 탐색 범위를 더 넓힙니다.

### Q5.6
- `d1141a19b`(#15538, from_html 도입)은 `.changeset/forty-llamas-unite.md`, `.changeset/smart-boats-accept.md`를 추가했고, CHANGELOG 5.33.0에 "feat: XHTML compliance", "feat: add `fragments: 'html' | 'tree'` option for wider CSP compliance"로 기록되었습니다. 문구에 `from_html`이라는 이름은 없습니다.
- `3f3cf9ff3`(#16359, `check_dirtiness` → `is_dirty`)는 `chore:`이며 changeset이 없습니다(`git show --stat`에 `.changeset` 없음). CHANGELOG 항목도 없습니다.
- 결론: CHANGELOG는 changesets로 생성되며, **사용자 관점에서 의미 있는 변경**만 사용자가 이해할 수 있는 문구로 기록합니다. 내부 함수 이름, 리팩터링(`chore:`)은 빠지거나 다른 표현으로 기록됩니다.
- 내부 구현 추적 → git 이력(`-S`, `-G`, `-L`, blame) 먼저. "어떤 기능이 몇 버전부터?" → CHANGELOG(`changelog.mjs`) 먼저, 그다음 PR 링크로 커밋을 찾습니다.

## 5-B. 사례 1: `$.template` → `$.from_html`

### Q5.7
- 5.0.0:
  ```js
  import "svelte/internal/disclose-version";
  import * as $ from "svelte/internal/client";
  var root = $.template(`<h1>hello world</h1>`);
  ```
- main:
  ```js
  import 'svelte/internal/disclose-version';
  import 'svelte/internal/flags/legacy';
  import * as $ from 'svelte/internal/client';
  var root = $.from_html(`<h1>hello world</h1>`);
  ```
- 차이 세 가지: (1) `$.template` → `$.from_html`, (2) `import 'svelte/internal/flags/legacy'` 추가, (3) 문자열 따옴표가 큰따옴표에서 작은따옴표로 바뀜.
- (2)는 `f1aeaf19e` "feat: adds legacy mode flag (#14180)", `svelte@5.1.12`, CHANGELOG "chore: adds legacy mode flag reducing bundle size in runes mode only apps". hello-world는 runes를 쓰지 않아서 legacy 모드로 컴파일되므로 이 import가 붙습니다.
- (3)은 `76ce303b0` "chore: bump esrap (#14969)", `svelte@5.17.4` (출력 프린터 업데이트). 학습자가 (3)을 놓쳐도 감점하지 말고 짚어 주기만 하세요.

### Q5.8
- 커밋 `d1141a19b` **"feat: functional template generation (#15538)"**, 작성자 Paolo Ricciuti (Co-authored-by Rich Harris), 2025-05-22, 첫 릴리스 **`svelte@5.33.0`**.
- `src/internal/client/index.js` export 변화:
  - 제거: `ns_template`, `svg_template_with_script`, `mathml_template`, `template`, `template_with_script`
  - 추가: `from_html`, `from_mathml`, `from_svg`, `from_tree`, `with_script`
- 새 이름은 `from_` 뒤에 **입력 형식**(html 문자열, svg, mathml, tree 구조)을 붙인 형태입니다. `*_with_script` 변형은 별도의 `with_script` 래퍼로 분리되었습니다.

### Q5.9
- 컴파일 옵션 **`fragments?: 'html' | 'tree'`**, 기본값 `'html'` (`compiler/types/index.d.ts`, `validate-options.js`에 `fragments: list(['html', 'tree'])`).
- 스냅샷 `tests/snapshot/samples/functional-templating/`: `_config.js`가 `compileOptions: { fragments: 'tree' }`를 지정합니다. 기대 출력은 HTML 문자열 대신 `$.from_tree([['h1', null, 'hello'], ' ', ['div', { class: 'potato' }, ['p', null, 'child element'], ' ', ['p', null, 'another child element']]], 1)`처럼 `[태그, 속성, ...자식]` 배열 구조를 전달합니다.
- `'html'`이면 기존처럼 `$.from_html(\`...\`)`에 HTML 문자열을 전달합니다.

### Q5.10
- 5.0.0 `reconciler.js`의 `create_fragment_from_html`은 `document.createElement('template')`를 만들고 **`innerHTML`**에 문자열을 넣은 뒤 `.content`를 반환합니다.
- JSDoc(main `compiler/types/index.d.ts`)에 따르면 `html`은 `<template>`에 `innerHTML`을 채우고 복제하므로 빠르지만, CSP에 **`require-trusted-types-for 'script'`**가 있으면 사용할 수 없습니다(Trusted Types가 강제되면 문자열을 `innerHTML`에 직접 대입할 수 없음). `tree`는 요소를 하나씩 만든 뒤 복제하므로 느리지만 어디서나 동작합니다.
- XHTML: 이 PR은 `reconciler.js`에서 `elem.innerHTML = html` → `elem.innerHTML = html.replaceAll('<!>', '<!---->'); // XHTML compliance`로 바꿨습니다. `<!>`는 HTML 파서에서는 빈 주석으로 처리되지만 XML 문법에서는 올바른 주석이 아닙니다. XHTML 문서에서는 `innerHTML`이 XML 규칙으로 파싱되므로 `<!---->`로 바꿔야 합니다. 컴파일 출력은 짧은 `<!>`를 유지하고 런타임에서 변환합니다.
- 이름 변경 이유(추론): 런타임 함수가 입력 형식별로 여러 개가 되었기 때문에, "무엇을 만드는가(template)"가 아니라 "무엇으로부터 만드는가(from_html, from_tree)"로 이름을 붙였다고 볼 수 있습니다. 이것은 export 목록에서 도출한 해석이므로, PR 페이지에서 확인한 내용과 함께 적도록 유도하세요.
- 추가 사실(학습자가 찾으면 칭찬): 이후 `6c15e711e` "[fix]: Add support for TrustedTypes in Svelte (#16271)", `svelte@5.51.0`에서 `create_trusted_html`(Trusted Types policy `svelte-trusted-html`)이 추가되어, `html` 모드도 Trusted Types 환경을 지원하게 되었습니다.

## 5-C. 사례 2와 3: 스케줄러와 signal 런타임

### Q5.11
- 커밋 `0672e4822` **"feat: allow `await` in components (#15844)"**, Rich Harris, 2025-07-14, 첫 릴리스 **`svelte@5.36.0`**.
- CHANGELOG 5.36.0: "feat: support `await` in components when using the `experimental.async` compiler option".
- 함께 새로 생긴 런타임 파일: `src/internal/client/reactivity/async.js`, `src/internal/client/dom/blocks/async.js`, `src/internal/flags/async.js`. (컴파일러 쪽에서는 `AwaitExpression.js` visitor 3개가 추가됨.)
- 처음 생긴 `batch.js`는 603줄이었습니다.
- main의 `compiler/types/index.d.ts`에서 `experimental.async`는 여전히 `experimental` 아래에 있고 `@since 5.36`로 표시됩니다.

### Q5.12
- 5.0.0 실행 결과: `sum.deps = ['count', 'count', 'other', 'count']`, `count.reactions = ['sum', 'sum', 'sum']`, `effect.deps = ['sum', 'sum']`, `sum.reactions = ['effect', 'effect']`.
- 같은 signal을 여러 번 읽으면 그만큼 `deps`와 `reactions`에 중복으로 들어갑니다. 비용: 배열 크기 증가(메모리, GC), `mark_reactions`가 같은 reaction을 여러 번 방문, `check_dirtiness`가 같은 dependency를 여러 번 검사.
- main 예측: `get`이 `signal.rv < read_version`일 때만 `new_deps`에 넣으므로(main `runtime.js` 약 558행), `sum.deps = ['count', 'other']`, `count.reactions = ['sum']`, `effect.deps = ['sum']`처럼 중복이 없을 것입니다. 이 예측은 코드 읽기로 도출한 것이며, 실행 검증은 "더 나아가기 1"에서 할 수 있습니다.

### Q5.13
- 5.0.0: `internal_set`(sources.js) → `mark_reactions` → effect이면 `schedule_effect`(runtime.js:571) → `scheduler_mode === FLUSH_MICROTASK`이고 아직 예약되지 않았으면 `queueMicrotask(process_deferred)`.
- main: `internal_set`(sources.js 약 199행)에서 값이 바뀌면 **무조건** `var batch = Batch.ensure(); batch.capture(source, value);`를 호출합니다. `Batch.ensure()`(batch.js 약 915행)는 `current_batch`가 없으면 새 `Batch`를 만들고, `!is_processing && !is_flushing_sync`이면 `queue_micro_task(() => { if (!batch.#started) batch.flush(); })`로 microtask를 예약합니다.
- main의 `schedule_effect`(batch.js 약 1260행)는 `current_batch.schedule(effect)`만 호출하며 microtask를 직접 예약하지 않습니다.
- 따라서 **async 모드가 아니어도 모든 상태 변경은 Batch를 통과합니다.** async 전용 동작은 `async_mode_flag` 검사로 분기됩니다(예: `apply()`에서 `!async_mode_flag`이면 `batch_values = null`로 즉시 반환, `#process` 안의 분기 등).

### Q5.14
- 5.0.0 (`runtime.js:490`): `flush_queued_root_effects(root_effects)`가 인자로 받은 root effect마다 `process_effects`로 effect를 모은 뒤 `flush_queued_effects`로 실행했습니다. `process_deferred`가 microtask에서 호출했습니다.
- `51337f22b` "chore: simplify flushing (#15348)", `svelte@5.20.4`: `scheduler_mode`, `process_deferred`를 제거했습니다. `flush_queued_root_effects()`가 인자 없이 전역 `queued_root_effects`를 `while` 루프로 비우는 형태가 되었고, microtask에서 `queueMicrotask(flush_queued_root_effects)`로 직접 호출됩니다.
- `fd08cb03d` "fix: reset `is_flushing` if `flushSync` is called and there's no scheduled effect (#16119)": 중간 수정.
- `0672e4822`(#15844): squash 본문에 "move batch-related code into batch.js", "make flush_queued_root_effects a method of batch", "make process_effects a method of batch"가 있습니다. 실제로 루프 본문은 `Batch.flush_effects()` 메서드가 되었고, 루프 안에서 `this.#process(queued_root_effects)`를 호출합니다.
- `process_effects`: `73220b866` "chore: simplify process_effects (#15270)", `be82332ac` "chore: simplify `process_effects` (#15397)"을 거쳐, `0672e4822`에서 `Batch`의 `#traverse_effect_tree(root)` 메서드가 되었습니다. 이후 `6fb7b4d26` "chore: refactor scheduling (#17805)", `svelte@5.53.8`에서 현재의 `#traverse(root, effects, render_effects)`(batch.js 약 493행)가 되었습니다.
- 5.0.0의 `flush_sync`는 main에서 `batch.js`의 `export function flushSync(fn)`(약 1033행)입니다. `check_dirtiness`는 `3f3cf9ff3`(#16359, `5.35.7`)에서 `is_dirty`로 이름이 바뀌었습니다.

### Q5.15
- 커밋 `9c20eb481` **"chore: improve signal performance by reducing duplicate deps (#14945)"**, Dominic Gannaway, 2025-01-08, 첫 릴리스 **`svelte@5.17.0`**.
- `types.d.ts`: `Signal.version` → **`wv`**(write version), `Value`에 **`rv`**(read version) 추가.
- `runtime.js`: 전역 `current_version` → `write_version`, `increment_version` → `increment_write_version`; 새 전역 `read_version`. `update_reaction` 시작 시 `read_version++`.
- `get`: `if (signal.rv < read_version) { signal.rv = read_version; ...new_deps에 추가 }`. 한 reaction이 실행되는 동안 같은 signal을 두 번째로 읽으면 `rv === read_version`이므로 추가하지 않습니다.
- 이후 `f67925923` "fix: prevent duplicate dependencies without using array.includes (#17503)", `svelte@5.48.0`(CHANGELOG "fix: faster deduplication of dependencies")에서도 같은 영역이 다시 수정되었습니다.

### Q5.16
- 커밋 `46e9d2d35` **"chore: remove `UNOWNED` flag (#17105)"**, Rich Harris, 2025-11-06, 첫 릴리스 **`svelte@5.43.4`**. 본문에 "Fixes #17024", "Fixes #17049".
- CHANGELOG 5.43.4: "chore: simplify connection/disconnection logic", "fix: reconnect deriveds to effect tree when time-travelling".
- `constants.js` diff: **`UNOWNED`(1 << 8)와 `DISCONNECTED`(1 << 9) 제거**, **`CONNECTED`(1 << 9) 추가**.
- `CONNECTED` JSDoc 요약: reaction이 effect root에 연결되어 있음을 뜻합니다. effect이거나, 적어도 하나의 effect가 의존하는 derived입니다. 의존하는 쪽이 없는 derived는 그래프에서 분리할 수 있어서, GC되거나 나중에 effect가 다시 의존하면 재연결될 수 있습니다.
- 즉 "부모 effect가 없는(unowned) derived"와 "분리된(disconnected) derived"라는 두 부정형 개념을, "effect에 연결되어 있는가(connected)"라는 하나의 긍정형 개념으로 바꿨습니다.

### Q5.17
- 후속 커밋 `bdc02008e` **"fix: reset dependency read versions after reaction execution (#14964)"**, Dominic Gannaway, 2025-01-09, `svelte@5.17.3`.
- 추가 코드(`update_reaction`): `if (previous_reaction !== null) { read_version++; }` 주석은 "이전 reaction으로 돌아갈 때 read version을 올려서, 이 reaction의 dependency가 같은 version으로 표시되지 않게 한다"는 내용입니다.
- 버그 메커니즘: `#14945`에서는 `update_reaction`이 **시작할 때만** `read_version++`를 했습니다. 바깥 reaction A가 실행되는 도중에 안쪽 reaction B(예: derived)가 계산되면, B가 시작하면서 `read_version`이 N+1이 되고 B가 읽은 signal X에 `rv = N+1`을 표시합니다. B가 끝나고 A로 돌아와도 `read_version`은 N+1 그대로이므로, A가 X를 읽으면 `X.rv < read_version`이 거짓이 되어 **A의 dependency에 X가 추가되지 않습니다.** 결과적으로 X가 바뀌어도 A가 다시 실행되지 않는 반응성 손실이 생깁니다.
- 테스트 `read-version-previous-reaction`: `$effect.pre` 안에서 `$state.snapshot(props)`를 읽고 spread props로 자식에 전달합니다. 버튼을 클릭해서 `props.label`을 바꾸면 `<p>`의 내용이 `1`, `2`로 갱신되어야 한다고 검증합니다. 즉 수정 전에는 갱신이 누락되었다는 뜻입니다.
- 추가 관찰(선택): main의 같은 위치는 `previous_reaction !== reaction` 조건과, 이전 reaction의 기존·신규 deps의 `rv`를 다시 표시하는 코드가 더해져 있습니다. 반환 시점에 version만 올리면 바깥 reaction이 이미 읽은 signal을 다시 읽을 때 중복이 생길 수 있기 때문입니다.

### Q5.18
- 처음 생긴 `batch.js`(`0672e4822`)의 필드:
  - `#current`: 이 batch에서 갱신된 source의 현재 값.
  - `#previous`: 이 batch에서 갱신되기 **전**의 값. 키는 `#current`와 같습니다.
  - `#callbacks`: batch가 commit되어 DOM이 갱신될 때 이전 branch를 제거하고 새 branch를 붙이는 함수들(if/each/key 블록).
  - `#pending`: 진행 중인 async effect 수.
  - 클래스 위의 `batch_deriveds`: "time travelling" 시 derived를 의존 값의 임시 값으로 재계산하고 그 결과를 derived 자체가 아닌 이 Map에 캐시합니다.
- `flush()`는 `queued_root_effects`가 있으면 `flush_effects()`를, 없으면 `#commit()`을 호출하고, `#pending === 0`이면 batch를 삭제합니다.
- 핵심 설명: 5.0.0에는 "지금 값" 하나와 전역 큐 하나만 있어서, `set`이 일어나면 다음 flush에서 곧바로 DOM에 반영됩니다. 컴포넌트가 `await`으로 기다리는 동안에는 그 변경과 관련된 async 값이 도착할 때까지 DOM 반영(`#commit`)을 미뤄야 일관된 화면을 보여 줄 수 있습니다. 그 사이에 다른 상태 변경이 또 일어나면, 변경 묶음마다 "변경 전/후 값"과 "아직 기다리는 작업 수"를 따로 보관해야 서로 섞이지 않습니다. 이것이 변경 묶음 단위인 `Batch`가 필요한 이유입니다.
- 학습자가 "여러 batch가 동시에 존재할 수 있다"(`const batches = new Set()`)는 점을 짚으면 좋습니다.

### Q5.19
- `changelog.mjs unowned` 결과(7개): 5.14.1 #14724, 5.16.1 #14855, 5.19.6 #15158, 5.19.8 #15214, 5.19.9 #15232, 5.19.10 #15255, 5.34.9 #16249.
- `compare-fn.mjs is_dirty`의 `git log -L` 결과(12개)에 `699dc6e4f`(#14724), `814873481`(#14855), `82db92f87`(#14899, disconnected), `f2c83e5db`(#15232), `b602c59a2`(#15255), `46e9d2d35`(#17105) 등이 있습니다.
- 해석 기준: 같은 개념(unowned/disconnected derived의 재연결)에서 버그 수정이 1년 가까이 반복되었다는 것은, 그 개념이 상태 조합을 복잡하게 만들어 정확하게 유지하기 어려웠다는 신호입니다. `#17105`는 개념 자체를 "effect root에 연결되어 있는가"라는 단일 기준(`CONNECTED`)으로 바꿔서, 반복되던 버그의 원인을 구조적으로 줄이려는 변경으로 해석할 수 있습니다.
- 이 질문은 해석 질문이므로, 위 사실을 근거로 논리적으로 주장하면 정답으로 인정하세요. "성능", "메모리 누수 방지", "코드 단순화" 중 무엇을 강조하든, CONNECTED JSDoc의 GC 언급이나 CHANGELOG 문구 같은 근거를 붙였는지 확인하세요.

## 5-D. 자유 과제

### Q5.20
- 채점 기준:
  1. 출발점이 `svelte@5.0.0`의 구체적인 `file:line`이고, 의문이 명확한가.
  2. blame 결과가 단순 이동이나 포맷팅 커밋일 때 `-w -C` 또는 `blame 커밋^`으로 한 단계 더 거슬러 올라갔는가.
  3. 최종 커밋, PR 번호, 첫 릴리스를 `whence.mjs` 등으로 확인했는가.
  4. PR에서 거론된 대안과 선택 이유를 자신의 말로 정리했는가. (튜터는 PR 내용을 직접 검증할 수 없으면, 학습자의 정리가 diff와 모순되지 않는지만 확인합니다.)
  5. main에서 그 줄이 어떻게 되었는지 `compare-fn.mjs` 또는 `git log -L`로 확인했는가.
- 흔한 함정: blame이 `fe8a9ce31`("breaking: init Svelte 5")에 도달하면 이 레포에서는 더 거슬러 올라갈 수 없습니다(Q5.2). 다른 줄을 고르도록 안내하세요.
