# 5단계: 코드 고고학 (5.0.0 → main)

1~4단계에서는 `svelte@5.0.0`이라는 고정된 시점의 코드를 읽었습니다. 이 단계에서는 그 이후로 5.x가 어떻게 바뀌었는지를 git 이력, CHANGELOG, PR을 통해 추적합니다.

처음에 권했던 공부 방식은 "코드를 먼저 읽고, 이해가 안 되는 줄을 만났을 때 그 줄이 생긴 PR을 역추적하는 것"이었습니다. 이 단계는 그 방식을 실제로 연습하는 단계입니다. 앞의 단계에서 구조를 이해했기 때문에, 이제는 PR 하나를 읽을 때 "이 변경이 시스템의 어느 부분을 왜 건드리는지"를 판단할 수 있습니다.

> **주의:** `svelte/` 디렉터리는 계속 `study/5.0.0` 브랜치에 둡니다. main의 코드는 checkout하지 말고 `git -C svelte show main:<경로>`로 읽으세요. 그래야 1~4단계의 도구와 lab이 계속 5.0.0 기준으로 동작합니다.
>
> 이 질문지의 수치(커밋 수, 줄 수)는 로컬 `main`이 `707c28146`일 때를 기준으로 합니다. `git fetch`로 main을 갱신했다면 숫자가 조금 달라질 수 있습니다. 확인하려면 `git -C svelte log --oneline -1 main`을 실행하세요.

## 학습 목표

1. `git log -S`, `git log -G`, `git log -L`, `git log --follow`, `git blame -w -C`가 각각 어떤 질문에 답하는 도구인지 구분해서 사용할 수 있습니다.
2. 코드 한 줄에서 출발해서 커밋, PR 번호, 처음 포함된 릴리스, CHANGELOG 항목까지 역추적할 수 있습니다.
3. 5.0.0 이후의 주요 변경 세 가지(템플릿 함수 이름 변경, `Batch` 도입, signal 런타임 단순화)가 무엇을 해결하려 했는지 설명할 수 있습니다.
4. CHANGELOG에 기록되는 변경과 기록되지 않는 변경을 구분하고, 각각을 찾는 방법을 선택할 수 있습니다.
5. 스스로 고른 코드 한 줄을 PR 토론까지 추적하고, 거론된 대안과 최종 결정을 정리할 수 있습니다.

## 사전 자료

- `svelte/packages/svelte/CHANGELOG.md`: 릴리스마다 사용자에게 보이는 변경을 정리한 파일입니다. 거의 모든 항목에 PR 링크가 붙어 있습니다. main 기준 파일은 `git -C svelte show main:packages/svelte/CHANGELOG.md`로 읽습니다.
- PR 페이지: 커밋 제목 끝의 `(#번호)`는 `https://github.com/sveltejs/svelte/pull/번호`로 열 수 있습니다. 토론, 리뷰 코멘트, 연결된 issue는 이 페이지에서 직접 읽으세요.
- git 공식 문서: [git log](https://git-scm.com/docs/git-log)의 `-S`, `-G`, `-L`, `--follow` 항목과 [git blame](https://git-scm.com/docs/git-blame)의 `-w`, `-C` 항목을 읽어 두면 좋습니다.

## 읽을 코드

이 단계에서는 같은 파일을 두 시점에서 비교합니다. 경로는 `svelte/packages/svelte/` 기준입니다.

| 주제 | 5.0.0 (`study/5.0.0`) | main |
|---|---|---|
| 템플릿 복제 | `src/internal/client/dom/template.js`의 `template` | 같은 파일의 `from_html`, `from_tree` |
| HTML 파싱 | `src/internal/client/dom/reconciler.js` | 같은 파일 (`create_trusted_html` 추가) |
| 스케줄링 | `src/internal/client/runtime.js`의 `schedule_effect`, `flush_queued_root_effects`, `flush_sync` | `src/internal/client/reactivity/batch.js`의 `Batch`, `flushSync`, `schedule_effect` |
| 상태 쓰기 | `src/internal/client/reactivity/sources.js`의 `internal_set` | 같은 함수 (`Batch.ensure()` 호출 추가) |
| 의존성 수집 | `src/internal/client/runtime.js`의 `get`, `update_reaction` | 같은 함수 (`read_version`, `rv` 추가) |
| 플래그 | `src/internal/client/constants.js` | 같은 파일 (`UNOWNED`, `DISCONNECTED` 제거, `CONNECTED` 추가) |
| signal 타입 | `src/internal/client/reactivity/types.d.ts` | 같은 파일 (`version` → `wv`, `rv`) |

## 도구 사용법

모든 명령은 학습 레포 루트(`cisco/`)에서 실행합니다.

```bash
# 두 시점 사이의 변경 규모
git -C svelte diff --stat svelte@5.0.0 main -- packages/svelte/src/internal/client | tail -1
git -C svelte rev-list --count svelte@5.0.0..main -- packages/svelte/src/internal/client

# 다른 시점의 파일 읽기 (checkout하지 않습니다)
git -C svelte show main:packages/svelte/src/internal/client/reactivity/batch.js | less

# 문자열이 "추가되거나 삭제된" 커밋 (등장 횟수가 바뀐 커밋)
git -C svelte log --oneline -S 'check_dirtiness' svelte@5.0.0..main -- packages/svelte/src
# 정규식에 맞는 줄이 "diff에 등장하는" 커밋
git -C svelte log --oneline -G 'check_dirtiness' svelte@5.0.0..main -- packages/svelte/src

# 함수 하나의 변경 이력 (함수 이름 또는 줄 범위)
git -C svelte log --oneline --no-patch -L :is_dirty:packages/svelte/src/internal/client/runtime.js svelte@5.0.0..main

# 파일 이름이 바뀌어도 이력을 이어서 보기
git -C svelte log --oneline --follow main -- packages/svelte/src/internal/server/renderer.js

# 줄마다 마지막으로 바꾼 커밋 (-w: 공백 변경 무시, -C: 다른 파일에서 옮겨 온 줄 추적)
git -C svelte blame -w -C -L '/^function flush_queued_effects(/,/^}/' main -- packages/svelte/src/internal/client/reactivity/batch.js

# 특정 파일이 처음 생긴 커밋
git -C svelte log --oneline --diff-filter=A main -- packages/svelte/src/internal/client/reactivity/batch.js
```

이 단계에서 반복하는 작업을 줄여 주는 스크립트도 준비되어 있습니다.

```bash
# 커밋 하나 → 제목, PR 링크, 처음 포함된 릴리스, CHANGELOG 항목, 바뀐 소스 파일
node labs/05-archaeology/whence.mjs <commit>

# CHANGELOG 검색 (키워드 또는 PR 번호, 오래된 항목부터 출력)
node labs/05-archaeology/changelog.mjs batch --until 5.40.0
node labs/05-archaeology/changelog.mjs '#15844'

# 함수나 메서드 하나가 5.0.0과 main에서 어디에 있는지, 그 사이 어떤 커밋이 건드렸는지
node labs/05-archaeology/compare-fn.mjs flush_queued_root_effects
node labs/05-archaeology/compare-fn.mjs '#process'

# 5.0.0 런타임에서 중복 의존성이 생기는지 확인하는 실험
node labs/05-archaeology/duplicate-deps.mjs
```

## 질문

### 5-A. 도구 익히기

**Q5.1** `[관찰]` 5.0.0과 main 사이에 `src/internal/client`는 얼마나 바뀌었나요? 바뀐 파일 수, 추가와 삭제 줄 수, 이 디렉터리를 건드린 커밋 수를 기록하세요. 그리고 이 기간에 가장 자주 수정된 파일 상위 3개를 찾으세요.

<details><summary>힌트 1</summary>규모는 <code>git diff --stat</code>의 마지막 줄과 <code>git rev-list --count</code>로 구할 수 있습니다. 자주 수정된 파일은 <code>git log --format= --name-only 범위 -- 경로</code>의 출력을 <code>sort | uniq -c | sort -rn</code>으로 집계하면 됩니다.</details>
<details><summary>힌트 2</summary>상위 3개 중 하나는 5.0.0에는 존재하지 않던 파일입니다. 그 파일이 생긴 시점과 수정 횟수를 함께 보면, 5.x 후반에 가장 활발하게 바뀐 영역이 어디인지 알 수 있습니다.</details>

**Q5.2** `[관찰]` `packages/svelte/src/internal/client/runtime.js`의 이력을 `--follow`로 가장 오래된 커밋까지 따라가세요. 가장 오래된 커밋의 제목, 날짜, 바뀐 파일 수를 기록하고, 이 커밋이 다른 커밋과 어떻게 다른지 설명하세요. 5.0.0 코드에서 `git blame`의 결과가 이 커밋을 가리키는 줄이 있다면, 그 줄의 기원에 대해 이 레포만으로 알 수 있는 것과 알 수 없는 것은 무엇인가요?

<details><summary>힌트 1</summary><code>git log --oneline --follow -- 경로 | tail -3</code>으로 가장 오래된 커밋을 찾고, <code>git show --stat 커밋 | tail -1</code>로 규모를 확인하세요.</details>
<details><summary>힌트 2</summary>커밋 제목에 PR 번호가 있는지, 바뀐 파일 수가 평소 커밋과 비교해서 어떤 수준인지에 주목하세요. <code>whence.mjs</code>로 열어 보면 어떤 정보가 비어 있는지도 확인할 수 있습니다.</details>

**Q5.3** `[예측]` 5.0.0의 `check_dirtiness`는 main에서 보이지 않습니다. `git log -S 'check_dirtiness'`와 `git log -G 'check_dirtiness'`를 `svelte@5.0.0..main` 범위에서 실행하면 어느 쪽이 더 많은 커밋을 보여 줄지 **먼저 예측해서 적고**, 실행해서 확인하세요. 두 옵션은 각각 어떤 조건을 만족하는 커밋을 찾나요?

<details><summary>힌트 1</summary>git log 문서에서 <code>-S</code>는 "occurrences"라는 단어로, <code>-G</code>는 "patch text contains added/removed lines that match"라는 표현으로 설명됩니다.</details>
<details><summary>힌트 2</summary>어떤 커밋이 <code>check_dirtiness(...)</code>를 호출하는 줄의 인자만 바꾸었다면, 그 커밋 전후로 문자열 <code>check_dirtiness</code>의 등장 횟수는 바뀌었나요?</details>

**Q5.4** `[추적]` `packages/svelte/src/internal/server/renderer.js`의 이력을 `--follow` 없이 볼 때와 `--follow`를 붙여서 볼 때, 가장 오래된 커밋이 어떻게 달라지나요? 두 결과의 경계가 되는 커밋은 무엇을 했고, 몇 버전에 포함되었나요?

<details><summary>힌트 1</summary>두 명령의 출력에 각각 <code>| tail -2</code>를 붙여 비교하세요. 경계 커밋은 <code>whence.mjs</code>로 확인할 수 있습니다.</details>
<details><summary>힌트 2</summary><code>git log -M --diff-filter=R --name-status</code>를 사용하면 rename이 일어난 커밋과 원래 파일 이름을 직접 볼 수 있습니다. 5.0.0에는 원래 이름의 파일도 아직 없었다는 점도 확인해 보세요.</details>

**Q5.5** `[실험]` main의 `batch.js`에 있는 `flush_queued_effects` 함수를 `git blame -w`로 볼 때와 `git blame -w -C`로 볼 때를 비교하세요. 커밋별로 몇 줄이 할당되는지 세어 보고, `-C`를 붙였을 때 어떤 커밋의 몫이 줄어들고 어떤 커밋이 새로 나타나는지 기록하세요. 그 차이가 생기는 이유를 설명하세요.

<details><summary>힌트 1</summary><code>git -C svelte blame -w -L '/^function flush_queued_effects(/,/^}/' main -- packages/svelte/src/internal/client/reactivity/batch.js | cut -c1-9 | sort | uniq -c | sort -rn</code>처럼 커밋별 줄 수를 집계하세요.</details>
<details><summary>힌트 2</summary>몫이 줄어드는 커밋을 <code>whence.mjs</code>로 열고, 그 커밋에서 <code>runtime.js</code>가 함께 바뀌었는지 확인하세요. 새로 나타나는 커밋이 5.0.0 이전의 것인지도 보세요.</details>

**Q5.6** `[설명]` `changelog.mjs from_html`과 `changelog.mjs check_dirtiness`는 둘 다 결과가 없습니다. 하지만 두 이름을 바꾼 커밋은 분명히 존재합니다. CHANGELOG에는 어떤 변경이 기록되고 어떤 변경이 기록되지 않나요? 내부 함수의 변경을 추적할 때는 CHANGELOG와 git 이력 중 무엇을 먼저 사용해야 하는지, 반대로 "어떤 기능이 몇 버전부터 생겼는지"를 찾을 때는 무엇을 먼저 사용해야 하는지 정리하세요.

<details><summary>힌트 1</summary>이름을 바꾼 두 커밋을 각각 <code>whence.mjs</code>로 열어서 <code>changelog</code> 항목을 비교하세요. 커밋이 <code>.changeset/</code> 아래에 파일을 추가했는지도 <code>git show --stat</code>으로 확인하세요.</details>
<details><summary>힌트 2</summary>한 커밋은 CHANGELOG 항목이 있지만 그 문구에 함수 이름이 등장하지 않습니다. 다른 커밋은 제목이 <code>chore:</code>로 시작합니다. 각 경우에 CHANGELOG 문구는 누구의 관점에서 쓰였나요?</details>

### 5-B. 사례 1: `$.template`은 왜 `$.from_html`이 되었나

**Q5.7** `[관찰]` 1단계에서 본 `hello-world` 스냅샷 테스트의 기대 출력을 5.0.0과 main에서 비교하세요. 달라진 줄을 모두 적으세요.

<details><summary>힌트 1</summary>5.0.0 쪽은 <code>svelte/packages/svelte/tests/snapshot/samples/hello-world/_expected/client/index.svelte.js</code>를 그대로 열면 되고, main 쪽은 같은 경로를 <code>git show main:</code>으로 읽으면 됩니다.</details>
<details><summary>힌트 2</summary>함수 이름 말고도 다른 차이가 하나 더 있습니다. import 줄을 자세히 보세요. 그 줄이 생긴 커밋도 <code>git log -S</code>로 찾을 수 있습니다.</details>

**Q5.8** `[추적]` `template`이 `from_html`로 바뀐 커밋을 찾으세요. 커밋 SHA, 작성자, 날짜, PR 번호, 처음 포함된 릴리스를 기록하세요. 그리고 이 커밋에서 `src/internal/client/index.js`의 export 목록이 어떻게 바뀌었는지 적으세요.

<details><summary>힌트 1</summary><code>git log -S 'export function from_html' main -- packages/svelte/src/internal/client/dom/template.js</code>로 찾을 수 있습니다. 그다음 <code>git show 커밋 -- packages/svelte/src/internal/client/index.js</code>를 보세요.</details>
<details><summary>힌트 2</summary>사라진 export와 새로 생긴 export를 나란히 놓고 보세요. 새 이름들은 공통된 접두사를 가지고 있는데, 그 접두사 뒤에 오는 단어가 무엇을 나타내는지 생각해 보세요.</details>

**Q5.9** `[추적]` 같은 PR에서 사용자가 설정할 수 있는 컴파일 옵션이 하나 추가되었습니다. 옵션 이름과 가능한 값, 기본값을 찾고, 각 값을 선택했을 때 컴파일 출력이 어떻게 달라지는지 main의 스냅샷 테스트에서 확인하세요.

<details><summary>힌트 1</summary>이 커밋에서 <code>packages/svelte/src/compiler/types/index.d.ts</code>와 <code>validate-options.js</code>의 diff를 보세요. 스냅샷 테스트는 같은 커밋에서 추가된 <code>tests/snapshot/samples/</code> 아래 디렉터리에 있습니다.</details>
<details><summary>힌트 2</summary>스냅샷 디렉터리의 <code>_config.js</code>가 어떤 옵션을 켜는지, 그리고 기대 출력에서 HTML 문자열 대신 무엇이 전달되는지 비교하세요.</details>

**Q5.10** `[설명]` 이 PR이 해결하려던 문제는 무엇인가요? 5.0.0의 `reconciler.js`에 있는 `create_fragment_from_html`이 어떤 브라우저 API에 의존하는지, 그리고 어떤 보안 설정에서 그 API가 막히는지 설명하세요. 또한 이 PR이 `reconciler.js`에서 바꾼 한 줄이 "XHTML compliance"와 어떤 관계인지 설명하세요. 마지막으로, 함수 이름을 `template`에서 `from_html`로 바꾼 이유를 여러분의 추론으로 적고, PR 페이지에서 그 추론을 확인하세요.

<details><summary>힌트 1</summary>새 옵션의 JSDoc 주석이 두 값의 장단점과 관련 CSP 지시어를 직접 설명합니다. CHANGELOG에서 이 PR 번호로 검색하면 사용자 관점의 요약 두 줄이 나옵니다.</details>
<details><summary>힌트 2</summary>5.0.0의 템플릿 문자열에 들어 있는 <code>&lt;!&gt;</code>는 HTML 파서에서는 주석으로 처리되지만, XML 문법에서도 올바른 주석일까요? 그리고 런타임 함수가 하나에서 여러 개로 늘어났을 때, 이름이 무엇을 기준으로 구분되어야 하는지 생각해 보세요.</details>

### 5-C. 사례 2와 3: 스케줄러와 signal 런타임의 변화

**Q5.11** `[관찰]` `reactivity/batch.js`가 처음 생긴 커밋을 찾으세요. SHA, 작성자, 날짜, PR 번호, 처음 포함된 릴리스, CHANGELOG 문구를 기록하세요. 같은 커밋에서 함께 새로 생긴 런타임 파일도 찾으세요.

<details><summary>힌트 1</summary><code>git log --diff-filter=A main -- 경로</code>는 파일이 추가된 커밋만 보여 줍니다. 결과를 <code>whence.mjs</code>에 넣으세요.</details>
<details><summary>힌트 2</summary>같은 커밋의 <code>git show --stat</code> 출력에서 <code>| N +</code>처럼 추가만 있는 줄을 찾으면 함께 생긴 파일을 알 수 있습니다. CHANGELOG 문구에 등장하는 컴파일 옵션 이름도 기록해 두세요.</details>

**Q5.12** `[실험]` `node labs/05-archaeology/duplicate-deps.mjs`를 실행하세요. 5.0.0에서 `sum`의 `deps`와 `count`의 `reactions`에는 같은 signal이 몇 번 들어 있나요? 이 결과가 성능 면에서 어떤 비용을 만드는지 적고, main에서는 같은 코드가 어떤 결과를 낼지 **예측**하세요.

<details><summary>힌트 1</summary>2단계에서 읽은 <code>runtime.js</code>의 <code>get</code>에서 <code>new_deps</code>에 signal을 넣는 부분을 다시 보세요. 같은 signal이 이미 들어 있는지 확인하는 코드가 있나요?</details>
<details><summary>힌트 2</summary><code>count</code>가 바뀌면 <code>mark_reactions</code>는 <code>reactions</code> 배열을 순회합니다. 배열에 같은 항목이 세 번 있으면 무슨 일이 생기나요? 예측을 검증하려면 Q5.15에서 찾을 커밋의 diff를 읽으세요.</details>

**Q5.13** `[예측]` 5.0.0에서 `set(count, 1)`을 호출하면 `internal_set` → `mark_reactions` → `schedule_effect` → `queueMicrotask(process_deferred)` 순서로 microtask가 예약됩니다. main의 `internal_set`(`sources.js`)을 읽기 전에, main에서는 microtask 예약이 어디로 옮겨졌을지 예측하세요. 그다음 main 코드를 읽고 확인하세요. `experimental.async`를 켜지 않은 일반 앱에서도 `Batch`가 만들어지나요?

<details><summary>힌트 1</summary><code>git -C svelte show main:packages/svelte/src/internal/client/reactivity/sources.js | grep -n Batch</code>로 시작하세요. 그다음 <code>batch.js</code>에서 해당 정적 메서드를 찾으세요.</details>
<details><summary>힌트 2</summary><code>internal_set</code>에서 <code>Batch</code>를 사용하는 줄이 어떤 조건문 안에 있는지 확인하세요. <code>batch.js</code> 안에서 <code>async_mode_flag</code>를 검사하는 곳을 모두 찾아보면, 어떤 동작이 async 모드에서만 일어나는지도 구분할 수 있습니다.</details>

**Q5.14** `[추적]` 5.0.0의 `flush_queued_root_effects`(`runtime.js`)는 main에 없습니다. 이 함수가 어떤 과정을 거쳐 어디로 옮겨졌는지, 중간 단계를 포함해서 추적하세요. 5.0.0의 `process_effects`도 같은 방식으로 추적하세요.

<details><summary>힌트 1</summary><code>node labs/05-archaeology/compare-fn.mjs flush_queued_root_effects</code>가 이 문자열을 건드린 커밋 3개를 보여 줍니다. 각 커밋에서 이 함수의 형태를 <code>git show 커밋:packages/svelte/src/internal/client/runtime.js</code>(또는 <code>커밋^:</code>)로 확인하세요.</details>
<details><summary>힌트 2</summary><code>batch.js</code>를 만든 커밋은 여러 커밋을 하나로 합친 squash 커밋이라서, 커밋 메시지 본문에 원래 커밋들의 제목이 남아 있습니다. <code>git show -s 커밋</code>으로 본문을 읽고 "method of batch"라는 표현을 찾으세요. <code>process_effects</code>는 그 뒤에 한 번 더 이름이 바뀌었으므로 <code>compare-fn.mjs '#traverse'</code>도 실행해 보세요.</details>

**Q5.15** `[추적]` Q5.12에서 본 중복 의존성 문제를 해결한 커밋을 찾으세요. 이 커밋은 signal의 `version` 필드를 어떤 두 필드로 나누었나요? 각 필드가 무엇을 기록하는지, 그리고 `get`에서 중복을 막는 조건문이 무엇인지 적으세요.

<details><summary>힌트 1</summary>main의 <code>runtime.js</code>에서 중복을 막는 데 쓰이는 전역 변수 이름을 먼저 찾고(<code>rv</code>와 비교되는 값), 그 이름으로 <code>git log -S</code>를 실행하세요. 가장 오래된 결과가 출발점입니다.</details>
<details><summary>힌트 2</summary>그 커밋에서 <code>reactivity/types.d.ts</code>의 diff를 보면 필드 변경이 한눈에 보입니다. <code>runtime.js</code> diff에서는 <code>signal.rv &lt; read_version</code> 조건이 감싸는 코드가 무엇인지 보세요.</details>

**Q5.16** `[추적]` 2단계의 `inspect` 출력에서 자주 본 `UNOWNED` 플래그는 main의 `constants.js`에 없습니다. 이 플래그를 제거한 커밋, PR, 릴리스를 찾으세요. 같은 커밋에서 함께 제거된 플래그와 새로 추가된 플래그는 무엇인가요? 새 플래그의 JSDoc 주석이 설명하는 의미를 요약하세요.

<details><summary>힌트 1</summary><code>git log -S 'UNOWNED' svelte@5.0.0..main -- packages/svelte/src/internal/client/constants.js</code>로 찾을 수 있습니다.</details>
<details><summary>힌트 2</summary>그 커밋의 <code>constants.js</code> diff만 보면 됩니다(<code>git show 커밋 -- 경로</code>). 제거된 플래그 두 개와 추가된 플래그 하나가 같은 개념을 "반대 방향"에서 표현하고 있지 않은지 살펴보세요.</details>

**Q5.17** `[설명]` Q5.15의 커밋이 나온 바로 다음 날, 같은 작성자가 후속 수정 커밋을 올렸습니다. 그 커밋을 찾고, 추가된 테스트(`read-version-previous-reaction`)와 `update_reaction`에 추가된 코드를 읽으세요. 후속 수정 전에는 어떤 상황에서 어떤 버그가 생길 수 있었는지 설명하세요.

<details><summary>힌트 1</summary><code>git log -S 'read_version' svelte@5.0.0..main -- packages/svelte/src/internal/client/runtime.js</code>의 결과 중에서 Q5.15 다음 커밋을 보세요.</details>
<details><summary>힌트 2</summary>추가된 코드의 주석은 "이전 reaction으로 돌아갈 때"를 언급합니다. 바깥 effect가 실행되는 도중에 안쪽 derived가 다시 계산되는 상황을 떠올려 보세요. 안쪽 derived가 dependency에 표시해 둔 <code>rv</code> 값을, 바깥 effect는 어떻게 해석하게 되나요?</details>

**Q5.18** `[설명]` `Batch`는 무엇을 해결하려고 도입되었나요? `batch.js`가 처음 생긴 시점의 코드(`git show <Q5.11의 커밋>:packages/svelte/src/internal/client/reactivity/batch.js`)에서 `#current`, `#previous`, `#callbacks`, `#pending` 필드의 주석을 읽고, 5.0.0처럼 전역 큐 하나(`queued_root_effects`)만으로는 왜 부족한지 설명하세요. 비동기 값이 아직 도착하지 않은 상태에서 다른 상태가 또 바뀌는 상황을 예로 들어 보세요.

<details><summary>힌트 1</summary>클래스 위쪽의 <code>batch_deriveds</code> 주석에 등장하는 "time travelling"이라는 표현과, <code>#commit</code> 메서드가 언제 호출되는지를 함께 보세요.</details>
<details><summary>힌트 2</summary>5.0.0에서는 <code>set</code>을 호출하면 소스의 값 <code>v</code>가 즉시 바뀌고, 다음 flush에서 DOM에 반영됩니다. 컴포넌트가 <code>await</code>으로 기다리는 동안 DOM이 "절반만 갱신된" 상태를 보여 주지 않으려면, 어떤 정보를 어디에 따로 보관해야 할까요?</details>

**Q5.19** `[설명]` `node labs/05-archaeology/changelog.mjs unowned`를 실행하면 5.14.1부터 5.34.9까지 `unowned` 관련 수정이 여러 번 나옵니다. 그리고 `git log -L`로 main의 `is_dirty`가 거쳐 온 커밋을 보면, 제목에 `unowned`나 `disconnected`가 들어간 커밋이 여러 개 있습니다. 이 이력은 `UNOWNED`라는 개념에 대해 무엇을 말해 주나요? Q5.16의 변경이 이 흐름에서 어떤 의미를 가지는지 여러분의 해석을 적으세요.

<details><summary>힌트 1</summary><code>node labs/05-archaeology/compare-fn.mjs is_dirty</code>의 마지막 목록이 <code>git log -L</code> 결과입니다.</details>
<details><summary>힌트 2</summary>같은 개념에 대해 버그 수정이 반복된다는 사실과, 결국 그 개념 자체를 없애는 커밋이 나왔다는 사실을 연결해 보세요. 새 플래그는 "derived가 누구에게 소유되었는가" 대신 무엇을 기준으로 삼나요?</details>

### 5-D. 사례 4: 자유 과제

**Q5.20** `[실험]` 2~4단계를 공부하면서 "이 줄은 왜 이렇게 되어 있지?"라고 생각했던 코드 한 줄을 고르세요. 노트(`notes/` 아래 2~4단계 노트)에 적어 둔 의문 중에서 고르면 좋습니다. 그 줄을 출발점으로 아래 템플릿을 채우세요.

```markdown
#### 출발점
- 파일과 줄: (예: packages/svelte/src/internal/client/reactivity/deriveds.js:NN, svelte@5.0.0)
- 그 줄의 코드:
- 내가 가진 의문:

#### 추적 경로
- 사용한 명령과 결과 (blame → 커밋 → 필요하면 blame 커밋^ 으로 한 번 더):
- 최종적으로 도달한 커밋 SHA / PR 번호 / 처음 포함된 릴리스:
- 연결된 issue 번호 (PR 본문의 "Fixes #..." 등):

#### PR에서 읽은 내용
- 해결하려던 문제 (재현 방법이 있다면 함께):
- 토론에서 거론된 대안과, 각 대안이 채택되지 않은 이유:
- 최종 구현이 선택한 트레이드오프:

#### main에서의 현재 상태
- 이 줄은 main에서 어떻게 되었나요? (그대로 / 수정됨 / 이동 / 삭제)
- 바뀌었다면 바꾼 커밋과 이유:

#### 정리
- 처음 의문에 대한 답:
- 이 추적에서 새로 알게 된 것 중에서, 코드만 읽어서는 알 수 없었던 것:
```

<details><summary>힌트 1</summary><code>git blame</code>이 가리킨 커밋이 공백 변경이나 단순 이동이라면, <code>-w -C</code>를 붙이거나 <code>git blame 커밋^ -- 파일</code>처럼 그 커밋 직전 시점에서 다시 blame하세요. 결과가 <code>breaking: init Svelte 5</code> 커밋에 도달했다면 Q5.2의 결론을 떠올리고 다른 줄을 고르는 편이 좋습니다.</details>
<details><summary>힌트 2</summary>squash 커밋의 본문에 있는 하위 커밋 제목도 단서가 됩니다. PR 페이지에서는 본문보다 리뷰 코멘트와 "Files changed" 탭의 대화에 대안이 더 자주 등장합니다.</details>

## 체크포인트

다음 질문에 코드나 노트를 보지 않고 답할 수 있다면 이 단계를 마친 것입니다.

1. "이 함수가 언제 없어졌는지", "이 줄을 마지막으로 바꾼 사람이 누구인지", "이 파일이 이름을 바꾸기 전에는 무엇이었는지", "이 기능이 몇 버전부터 생겼는지"를 알고 싶을 때, 각각 어떤 명령이나 자료를 사용하나요?
2. `git blame`이 가리킨 커밋이 실제 기원이 아닐 수 있는 경우를 세 가지 이상 말할 수 있나요?
3. 5.0.0에서 main으로 오면서 스케줄링 코드가 `runtime.js`에서 `batch.js`로 옮겨진 이유를 한두 문장으로 설명할 수 있나요?
4. `version`이 `wv`와 `rv`로 나뉜 이유와, 그 변경 직후에 발견된 버그를 설명할 수 있나요?
5. 내부 구현이 계속 바뀌는 오픈소스를 공부할 때, 고정된 버전을 기준으로 삼는 것이 어떤 장점과 한계를 가지는지 설명할 수 있나요?

## 더 나아가기

1. **main 기준으로 2단계 lab 다시 실행하기:** `git -C svelte worktree add ../svelte-main main`으로 main을 별도 디렉터리에 받고, 그 디렉터리에서 의존성을 설치한 뒤 `labs/lib/signals.mjs`의 import 경로를 바꾼 사본으로 `duplicate-deps.mjs`를 실행해 보세요. Q5.12에서 한 예측을 실제로 검증할 수 있습니다. `labs/lib/signals.mjs`의 `inspect`가 사용하는 `version` 필드와 플래그 이름이 main에서 어떻게 깨지는지도 함께 관찰해 보세요. (작업 트리를 추가하는 명령이므로, 실행하기 전에 무엇이 생기는지 이해하고 직접 결정하세요.)
2. **`Batch`의 변천사 읽기:** `node labs/05-archaeology/changelog.mjs batch`로 `Batch` 도입 이후의 수정 이력을 모두 출력하고, `fork`, `rebase`, `merge` 같은 단어가 등장하는 PR을 골라 읽어 보세요. `batch.js`가 처음 600줄 정도에서 1,500줄 정도로 커진 과정을 따라가면, 비동기 렌더링이 어떤 문제들을 새로 만들었는지 알 수 있습니다.
3. **PR 하나를 재현하기:** 5-C에서 다룬 버그 수정 중 하나를 골라, 그 PR이 추가한 테스트를 5.0.0 기준 lab(`labs/lib/signals.mjs` 또는 `tools/mount.mjs`)으로 옮겨서 실제로 실패하는지 확인하세요. 실패를 직접 재현해 보면 PR의 수정 코드가 어느 줄에서 효과를 내는지 훨씬 정확하게 이해할 수 있습니다.
