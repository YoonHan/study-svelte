# 2단계: signal 시스템

Svelte 5에서 반응성의 핵심은 컴파일러가 아니라 런타임의 signal 그래프에 있습니다. 이 단계에서는 DOM과 컴파일러를 완전히 걷어 내고, `labs/lib/signals.mjs`로 signal 그래프를 직접 만들고 관찰하면서 런타임 코드를 읽습니다. 이 단계를 통과하면 3단계(DOM)와 4단계(컴파일러)에서 만나는 코드가 "signal 그래프를 어떤 모양으로 만드는 코드인가"라는 관점으로 읽히기 시작합니다.

## 학습 목표

1. source, derived, effect가 각각 그래프에서 어떤 역할을 맡는지 설명하고, `deps`와 `reactions`라는 양방향 edge가 왜 둘 다 필요한지 설명할 수 있습니다.
2. `set` 한 번이 일으키는 일을 "표시(push) 단계"와 "검증·실행(pull) 단계"로 나누어 설명하고, `DIRTY`와 `MAYBE_DIRTY`, `version` 비교가 각각 어떤 역할을 하는지 말할 수 있습니다.
3. effect가 언제, 어떤 순서로 실행되는지를 `schedule_effect` → `flush_queued_root_effects` → `process_effects` → `flush_queued_effects` 흐름으로 추적할 수 있습니다.
4. derived의 소유권(owned와 unowned)과 그래프 연결·분리 과정을 메모리 누수 관점에서 설명할 수 있습니다.
5. `proxy`가 객체와 배열의 프로퍼티마다 source를 지연 생성하는 방식과, 원본 객체를 수정하지 않는 이유를 설명할 수 있습니다.

## 사전 자료

- Svelte 공식 블로그 "Introducing runes"(2023): <https://svelte.dev/blog/runes>. runes를 도입한 동기와 signal 기반 반응성을 선택한 이유를 설명합니다.
- Svelte 공식 문서의 `$state`, `$derived`, `$effect` 페이지: <https://svelte.dev/docs/svelte/$state>, <https://svelte.dev/docs/svelte/$derived>, <https://svelte.dev/docs/svelte/$effect>. 사용자 관점의 동작 규칙을 먼저 알아 두면 런타임 코드가 그 규칙을 어떻게 구현하는지 비교하기 쉽습니다.
- Preact Signals 문서: <https://preactjs.com/guide/v10/signals/>. 비슷한 계열의 다른 구현과 비교하면 Svelte가 선택한 방식이 더 잘 보입니다.
- (선택) Ryan Carniato의 글 "A Hands-on Introduction to Fine-Grained Reactivity"와 Milo의 글 "Super Charging Fine-Grained Reactive Performance"는 push-pull 방식과 색칠(coloring) 알고리즘을 설명합니다. 제목으로 검색하세요.

## 읽을 코드

모든 경로는 `svelte/packages/svelte/` 기준이며, 줄 수는 `svelte@5.0.0` 기준입니다.

| 파일 | 역할 | 줄 수 |
|---|---|---|
| `src/internal/client/reactivity/types.d.ts` | `Signal`, `Value`, `Reaction`, `Derived`, `Effect` 인터페이스를 정의합니다. 가장 먼저 읽으세요. | 약 70 |
| `src/internal/client/constants.js` | `f` 비트마스크에 들어가는 플래그를 정의합니다. | 약 25 |
| `src/internal/client/reactivity/sources.js` | `source`, `state`, `set`, `internal_set`, `mark_reactions`를 정의합니다. 변경이 전파되기 시작하는 곳입니다. | 약 250 |
| `src/internal/client/reactivity/deriveds.js` | `derived`, `execute_derived`, `update_derived`, `destroy_derived`를 정의합니다. | 약 170 |
| `src/internal/client/reactivity/effects.js` | `create_effect`와 effect 종류별 생성 함수, effect 트리 조작(파괴, unlink, pause/resume)을 정의합니다. | 약 620 |
| `src/internal/client/runtime.js` | `get`, `update_reaction`, `check_dirtiness`, `update_effect`, 스케줄러(`schedule_effect`, `flush_sync` 등)를 정의합니다. 이 단계의 중심 파일입니다. | 약 1,180 |
| `src/internal/client/proxy.js` | `$state({...})`가 만드는 깊은 반응성 Proxy를 정의합니다. | 약 340 |
| `tests/signals/test.ts` | DOM 없이 signal 동작만 검증하는 Svelte 자체 테스트입니다. 질문에 막히면 비슷한 테스트를 찾아 읽으세요. | 약 740 |

`runtime.js`는 앞부분(약 1~850줄)만 읽으면 충분합니다. 뒷부분의 context API와 `deep_read`는 이 단계에서 다루지 않습니다.

## 도구 사용법

```bash
# lab 실행 (작업 루트에서)
node labs/02-signals/00-hello.mjs

# Svelte의 DEV 모드를 켜고 실행 (에러 메시지가 길어지고, 개발용 검증 코드가 동작합니다)
node --conditions=development labs/02-signals/05-self-write.mjs

# Svelte 자체 signal 테스트 실행 (svelte/ 디렉터리에서)
cd svelte && npx -y pnpm@9.4.0 test signals
```

`labs/lib/signals.mjs`가 제공하는 함수는 다음과 같습니다.

- `state`, `derived`, `effect`, `render_effect`, `user_effect`, `template_effect`, `effect_root`, `get`, `set`, `untrack`, `proxy`, `flushSync`, `tick`: Svelte 런타임 함수를 그대로 다시 내보냅니다.
- `root(fn)`: runes 모드 컴포넌트와 같은 환경(컴포넌트 context와 root effect)에서 `fn`을 실행하고, 정리 함수를 돌려줍니다.
- `label(signal, name)`: `inspect` 출력에 표시할 이름을 붙입니다.
- `inspect(signal)`: 플래그, `version`, 값, `deps`, `reactions`를 출력합니다.
- `flags(signal)`: `f` 비트마스크를 플래그 이름 배열로 변환합니다.

lab은 모두 실제 런타임 소스를 import합니다. 따라서 `svelte/packages/svelte/src/internal/client/` 아래 파일에 `console.log`를 넣으면 lab 출력에 바로 나타납니다. 실험이 끝나면 `git -C svelte checkout -- packages/svelte/src`로 되돌리세요.

**[예측] 질문은 반드시 lab을 실행하기 전에 예측을 노트에 먼저 적으세요.** 예측이 틀린 지점이 바로 코드를 다시 읽어야 할 지점입니다.

## 질문

### 2-A. 그래프의 재료: source, derived, effect와 상태 플래그

**Q2.1** [관찰] `00-hello.mjs`를 실행하세요. `root()` 호출이 끝난 시점에 `effect`는 아직 실행되지 않았고 플래그가 `EFFECT | DIRTY`입니다. 반면 `root()`에 넘긴 함수 자체는 즉시 실행되었습니다. 두 effect의 실행 시점을 가르는 것은 `create_effect`의 어떤 인자입니까? `render_effect`와 `template_effect`는 둘 중 어느 쪽에 속합니까?

<details><summary>힌트 1</summary><code>effects.js</code>의 <code>create_effect</code> 시그니처와, <code>effect</code>, <code>effect_root</code>, <code>render_effect</code>, <code>block</code>이 <code>create_effect</code>를 호출하는 방식을 비교하세요.</details>
<details><summary>힌트 2</summary><code>create_effect</code> 안에서 <code>update_effect</code>를 바로 호출하는 분기와 <code>schedule_effect</code>를 호출하는 분기가 나뉩니다.</details>

**Q2.2** [관찰] `00-hello.mjs`에서 `set(count, 1)`을 한 번 호출했는데 `count.version`이 0에서 1이 아니라 2가 되었습니다. `version`은 정확히 무엇을 세는 값입니까? signal마다 독립된 카운터를 두지 않고 이렇게 구현한 이유는 무엇입니까?

<details><summary>힌트 1</summary><code>runtime.js</code>의 <code>increment_version</code>과 <code>current_version</code>, 그리고 이 함수를 호출하는 모든 곳을 찾아보세요.</details>
<details><summary>힌트 2</summary><code>check_dirtiness</code>에서 <code>version</code>을 비교하는 줄을 보세요. 비교 대상인 두 객체는 같은 signal입니까?</details>

**Q2.3** [추적] `reactivity/types.d.ts`를 읽고 `Value`, `Reaction`, `Derived`, `Effect`의 관계를 그림으로 그리세요. 그래프의 edge는 `deps`(내가 읽은 것)와 `reactions`(나를 읽는 것)로 양쪽에 모두 저장됩니다. 각 방향의 edge를 실제로 순회하는 함수를 하나씩 찾고, 한쪽만 저장했다면 어떤 연산이 비싸지는지 설명하세요.

<details><summary>힌트 1</summary><code>sources.js</code>의 <code>mark_reactions</code>와 <code>runtime.js</code>의 <code>check_dirtiness</code>가 각각 어느 필드를 순회하는지 보세요.</details>
<details><summary>힌트 2</summary>derived는 왜 <code>Value</code>이면서 동시에 <code>Reaction</code>이어야 할까요? derived가 그래프의 "중간 노드"라는 점을 생각해 보세요.</details>

**Q2.4** [예측] `01-maybe-dirty.mjs`를 실행하기 전에, `set(count, 2)` 직후 `parity`와 `fx`의 플래그, 그리고 최종 `effect_runs`와 `parity_computations` 값을 예측하세요. 실행한 뒤에는 `fx`가 `DIRTY`가 아니라 `MAYBE_DIRTY`로 표시된 이유와, 결국 effect가 다시 실행되지 않은 이유를 코드 경로로 설명하세요.

<details><summary>힌트 1</summary><code>mark_reactions</code>가 자기 자신을 재귀 호출할 때 넘기는 status 인자를 보세요. 그다음 <code>flush_queued_effects</code>에서 effect를 실행하기 전에 무엇을 확인하는지 보세요.</details>
<details><summary>힌트 2</summary><code>update_derived</code>는 새 값을 계산한 뒤 언제 <code>version</code>을 올리고 언제 올리지 않습니까? 그 결과가 <code>check_dirtiness</code>의 version 비교에 어떻게 반영됩니까?</details>

**Q2.5** [예측] `02-diamond.mjs`의 그래프는 `a → b, c → effect` 형태의 다이아몬드입니다. 실행하기 전에 `seen` 배열과 `b`, `c`의 계산 횟수를 예측하세요. 실행한 뒤에는 effect가 `4+3`처럼 일관되지 않은 값의 쌍을 한 번도 보지 않는 이유(glitch-free)를 설명하세요.

<details><summary>힌트 1</summary><code>set</code>이 호출되는 순간에 실제로 "실행"되는 코드가 있는지, 아니면 "표시"만 하는지 <code>internal_set</code>과 <code>mark_reactions</code>에서 확인하세요.</details>
<details><summary>힌트 2</summary>effect가 실행되면서 <code>get(b)</code>, <code>get(c)</code>를 호출하는 순간 각 derived에서 무슨 일이 일어나는지 <code>get</code>의 마지막 부분을 보세요.</details>

**Q2.6** [설명] 지금까지 본 방식은 변경을 알릴 때는 표시만 하고(push), 값은 읽을 때 검증하며 계산합니다(pull). 다음 두 가지 대안을 각각 택했다면 무엇이 깨지거나 비싸지는지 설명하세요.
- (가) `mark_reactions`가 모든 하위 노드를 `MAYBE_DIRTY` 없이 `DIRTY`로 표시한다.
- (나) `set`이 호출될 때 하위 derived를 즉시 다시 계산한다.

<details><summary>힌트 1</summary>(가)는 <code>01-maybe-dirty.mjs</code>, (나)는 <code>02-diamond.mjs</code>와 <code>04-batching.mjs</code>의 상황에 대입해 보세요.</details>
<details><summary>힌트 2</summary>아무도 읽지 않는 derived, 한 번의 이벤트 핸들러에서 여러 번 <code>set</code>하는 경우, 값이 바뀌지 않는 derived를 각각 생각해 보세요.</details>

### 2-B. 의존성 수집: `get`과 `update_reaction`

**Q2.7** [예측] `03-conditional-deps.mjs`의 Part 1을 실행하기 전에, 체크포인트 1~4에서 `fx.deps`, `a.reactions`, `b.reactions`, `runs` 값을 예측하세요. 실행한 뒤에는 "의존성은 선언하는 것이 아니라 매 실행마다 다시 수집된다"는 말이 코드의 어느 부분에 해당하는지 짚으세요.

<details><summary>힌트 1</summary><code>get</code>에서 <code>active_reaction</code>이 <code>null</code>이 아닐 때 하는 일을 보세요.</details>
<details><summary>힌트 2</summary><code>update_reaction</code>의 <code>try</code> 블록에서 <code>reaction.fn()</code>을 호출한 뒤 <code>deps</code>를 어떻게 교체하는지 보세요.</details>

**Q2.8** [추적] 체크포인트 3을 만든 실행(`flag`가 `false`가 된 뒤의 재실행)에서, 함수가 끝난 시점의 `skipped_deps`와 `new_deps` 값은 무엇입니까? 그 값으로 `update_reaction`이 `remove_reactions(reaction, skipped_deps)`를 호출하면 어떤 edge가 끊기고 어떤 edge가 새로 생깁니까? 이어서 Part 2를 실행하고, 같은 signal을 두 번 읽었을 때 `reactions`에 중복이 생기는 이유와, 그 중복이 effect를 두 번 실행시키지 않는 이유를 설명하세요.

<details><summary>힌트 1</summary><code>get</code>의 <code>deps[skipped_deps] === signal</code> 조건과 <code>update_reaction</code>의 318~340줄을 함께 읽으세요.</details>
<details><summary>힌트 2</summary>중복이 실행 횟수에 영향을 주지 않는 이유는 <code>mark_reactions</code>의 첫 번째 <code>continue</code> 조건에 있습니다.</details>

**Q2.9** [추적] `active_reaction`은 어디에서 설정되고 어디에서 복원됩니까? `update_reaction`은 `BRANCH_EFFECT`나 `ROOT_EFFECT`를 실행할 때 `active_reaction`을 `null`로 둡니다. 이 처리가 없다면 `effect_root(() => get(x))` 같은 코드에서 어떤 일이 일어납니까? 또 effect 안에서 `untrack(() => get(d))`로 derived를 읽으면 effect와 `d` 사이, 그리고 `d`와 `d`의 source 사이에는 각각 edge가 생깁니까?

<details><summary>힌트 1</summary><code>update_reaction</code>의 310줄, <code>untrack</code>의 구현, 그리고 <code>execute_derived</code>가 내부적으로 다시 <code>update_reaction</code>을 호출한다는 점을 보세요.</details>
<details><summary>힌트 2</summary>root와 branch는 "구조"를 담당하는 effect입니다. 구조를 담당하는 effect가 상태 변경으로 다시 실행되면 그 아래의 모든 자식이 파괴됩니다.</details>

**Q2.10** [설명] `skipped_deps` 최적화는 "대부분의 재실행은 같은 의존성을 같은 순서로 읽는다"는 가정에 기댑니다. 이 가정이 깨지는 입력 패턴(예: 읽는 순서가 매번 뒤집히는 경우)에서는 비용이 어떻게 달라집니까? 단순히 매번 새 배열을 만드는 구현과 비교해서 장단점을 정리하세요.

<details><summary>힌트 1</summary><code>runtime.js</code>의 <code>new_deps</code> 선언부(101~107줄)에 붙은 주석을 읽으세요.</details>
<details><summary>힌트 2</summary>순서가 바뀌면 <code>skipped_deps</code>가 0에서 멈춥니다. 그때 <code>remove_reactions</code>와 <code>reactions.push</code>가 몇 번 호출되는지 세어 보세요.</details>

### 2-C. 스케줄링과 effect 트리

**Q2.11** [추적] `schedule_effect`는 effect 자체를 큐에 넣지 않고, 부모를 따라 올라가 root effect를 큐에 넣습니다. 올라가는 동안 root와 branch effect의 `CLEAN` 플래그를 끕니다. 이 처리가 맡는 역할 두 가지를 찾으세요. root와 branch effect에서 `CLEAN`은 일반 reaction에서와 어떻게 다른 의미로 쓰입니까?

<details><summary>힌트 1</summary><code>schedule_effect</code>의 <code>return</code> 조건, 그리고 <code>process_effects</code>의 <code>is_skippable_branch</code>를 함께 보세요.</details>
<details><summary>힌트 2</summary>같은 root 아래에서 effect 100개가 동시에 dirty가 되면 <code>queued_root_effects</code>에는 몇 개가 들어갑니까? 트리가 아주 크고 dirty effect가 한 개뿐이라면 <code>process_effects</code>는 트리 전체를 방문합니까?</details>

**Q2.12** [예측] `04-batching.mjs`를 실행하기 전에, 세 번의 `set`에 대해 effect가 몇 번 실행되는지, microtask가 실행되기 전에 `get(double)`이 반환하는 값과 그 읽기가 derived를 계산하는지를 예측하세요. 실행한 뒤에는 `queueMicrotask`를 호출하는 위치와 `is_micro_task_queued`의 역할을 설명하세요.

<details><summary>힌트 1</summary><code>schedule_effect</code>의 첫 부분과 <code>process_deferred</code>를 보세요.</details>
<details><summary>힌트 2</summary>derived를 읽는 것은 스케줄러를 거치지 않습니다. <code>get</code>이 derived를 만났을 때 하는 일을 다시 보세요.</details>

**Q2.13** [예측] `05-self-write.mjs`의 Case 1과 Case 3에서 effect가 몇 번 실행되는지 예측한 뒤 실행하세요. 특히 Case 3은 effect가 **아직 읽지 않은** state에 먼저 쓰는데도 다시 실행됩니다. `internal_set`의 169~185줄과 `get`의 755~764줄(`untracked_writes`)을 추적해서, 이 특별한 경로가 없다면 effect의 첫 실행과 두 번째 이후 실행이 어떻게 다르게 동작하게 되는지 설명하세요.

<details><summary>힌트 1</summary>effect의 첫 실행 중에는 그 effect가 아직 어떤 source의 <code>reactions</code>에도 들어 있지 않습니다. 의존성 edge는 함수가 끝난 뒤에 연결됩니다.</details>
<details><summary>힌트 2</summary>두 번째 실행부터는 effect가 이미 <code>reactions</code>에 있으므로 <code>mark_reactions</code>가 자연스럽게 그 effect를 다시 표시합니다. 첫 실행에서 같은 결과를 내려면 무엇을 흉내 내야 할까요? Case 3이 세 번째 실행으로 이어지지 않는 이유는 <code>internal_set</code>의 첫 줄에 있습니다.</details>

**Q2.14** [추적] `05-self-write.mjs`의 Case 2는 `effect_update_depth_exceeded` 에러로 끝나는데, `runs`가 1,000이 아니라 500입니다. `infinite_loop_guard`가 호출되는 모든 위치를 찾아서 이 숫자를 설명하세요. 이어서 `process_deferred`의 `flush_count > 1001` 검사가 5.0.0 코드에서 실제로 참이 될 수 있는지 판단하고, `git -C svelte blame -L 551,565 -- packages/svelte/src/internal/client/runtime.js`로 이 숫자가 어떤 커밋에서 왜 바뀌었는지 확인하세요.

<details><summary>힌트 1</summary><code>flush_sync</code>와 <code>flush_queued_root_effects</code>를 보세요. <code>flush_sync</code>는 자기 자신을 재귀 호출합니다.</details>
<details><summary>힌트 2</summary>재귀 한 번마다 <code>flush_count</code>가 몇 씩 증가하는지 세어 보세요. 그리고 <code>infinite_loop_guard</code>가 에러를 던지기 직전에 <code>flush_count</code>를 어떤 값으로 바꾸는지 보세요. <code>flush_count</code>를 증가시키는 곳이 그 함수 말고도 있습니까?</details>

**Q2.15** [예측] `06-effect-order.mjs`에서 phase 1과 phase 2의 전체 로그를 예측해서 노트에 적은 뒤 실행하세요. 그다음 다음 질문에 답하세요.
- `render_effect`와 `effect`의 실행 시점은 어떻게 다릅니까? `process_effects`가 두 종류를 다르게 다루는 부분을 짚으세요.
- phase 2에서 `C.1`은 왜 부모인 `C`보다 **먼저** 한 번, `C`가 다시 실행된 뒤에 또 한 번, 총 두 번 실행됩니까?
- phase 1에서 `C.2`가 `D.1`보다 늦게 실행되는 이유는 무엇입니까?

<details><summary>힌트 1</summary><code>process_effects</code>는 render effect를 만나면 그 자리에서 실행하고 자식으로 내려가지만, 일반 effect는 <code>effects</code> 배열에 모아 두기만 합니다. 모아 둔 effect는 언제 실행됩니까?</details>
<details><summary>힌트 2</summary><code>C</code>가 다시 실행되면 <code>update_effect</code>가 먼저 무엇을 파괴합니까? 이미 dirty로 표시되어 있던 기존 <code>C.1</code>은 그 전에 어디에서 실행되었습니까? 실행 중에 새로 만들어진 <code>effect</code>는 같은 flush 안에서 실행됩니까, 아니면 다음 flush로 넘어갑니까?</details>

**Q2.16** [예측] `07-effect-tree.mjs`에서 `set(n, 1)`과 `destroy()`가 출력하는 run/teardown 줄의 순서를 예측하세요. 실행한 뒤에는 `update_effect`가 재실행 전에 하는 일을 순서대로 나열하고, 자식 effect를 재사용하지 않고 매번 파괴한 뒤 새로 만드는 이유를 설명하세요. 마지막으로 `BLOCK_EFFECT`는 왜 `destroy_effect_children`이 아니라 `destroy_block_effect_children`을 사용하는지 추측해 보세요(3단계에서 `{#if}`를 읽을 때 확인합니다).

<details><summary>힌트 1</summary><code>update_effect</code>의 <code>try</code> 블록(433~443줄)을 보세요.</details>
<details><summary>힌트 2</summary>자식 effect는 부모가 실행될 때 클로저로 부모의 지역 변수(<code>v</code>)를 캡처합니다. 오래된 자식을 남겨 두면 그 자식은 어떤 값을 보게 될까요?</details>

**Q2.17** [관찰] `07-effect-tree.mjs`가 출력한 트리에는 `once` effect가 없고, `child` effect는 이름 없이 `(anonymous)`로 표시됩니다. 각각 어떤 코드 때문입니까? 이렇게 트리에서 effect를 제거하거나 `fn`을 비워도 안전한 이유는 무엇입니까?

<details><summary>힌트 1</summary><code>flush_queued_effects</code>의 538~546줄과 <code>create_effect</code>의 <code>inert</code> 계산을 보세요.</details>
<details><summary>힌트 2</summary>deps가 하나도 없는 effect가 다시 실행될 수 있는 경로가 있습니까? teardown이 있는 effect는 왜 트리에 남아 있어야 합니까?</details>

### 2-D. derived의 소유권과 메모리

**Q2.18** [관찰] `08-derived-ownership.mjs`의 Part 1에서 체크포인트 [1]과 [2]를 보세요. effect 밖에서 만든 derived `d`는 `UNOWNED` 플래그를 가지며, `get(d)`로 읽은 뒤에도 `count.reactions`에 등록되지 않습니다. 또한 계산이 끝난 뒤에도 `CLEAN`이 아니라 `MAYBE_DIRTY` 상태로 남습니다. 각각 어떤 코드 때문이며, 두 동작이 왜 반드시 함께 있어야 합니까?

<details><summary>힌트 1</summary><code>derived</code>에서 <code>UNOWNED</code>를 붙이는 조건, <code>update_reaction</code>의 <code>skip_reaction</code>, <code>update_derived</code>의 status 계산, <code>check_dirtiness</code>의 마지막 부분을 보세요.</details>
<details><summary>힌트 2</summary>owner가 없는 derived를 <code>count.reactions</code>에 등록하면 그 derived를 누가 언제 정리합니까? 반대로 등록하지 않았는데 <code>CLEAN</code>으로 표시하면, <code>count</code>가 바뀌었을 때 누가 그 derived에 알려 줍니까?</details>

**Q2.19** [추적] Part 1의 체크포인트 [3]과 [4]에서는 effect가 `d`를 읽는 동안에만 `count.reactions`에 `d`가 등록되고, effect가 파괴되면 다시 빠집니다. 연결되는 지점과 분리되는 지점을 코드에서 각각 찾으세요.

<details><summary>힌트 1</summary>연결은 <code>check_dirtiness</code>의 203~213줄, 분리는 <code>remove_reaction</code>의 374~391줄을 보세요.</details>
<details><summary>힌트 2</summary><code>remove_reaction</code>은 derived의 마지막 reaction이 사라졌을 때 그 derived의 <code>deps</code> 쪽 edge까지 연쇄적으로 끊습니다. 이것이 없으면 무엇이 GC되지 못할까요?</details>

**Q2.20** [설명] Part 2의 owned derived는 마지막 reader를 잃으면 `DISCONNECTED | MAYBE_DIRTY` 상태가 됩니다. 분리된 동안 `s`가 바뀌면 `d`는 그 변경 알림을 받지 못합니다. 그런데도 [7]에서 올바른 값 105를 읽을 수 있는 이유는 무엇입니까? 분리할 때 상태를 `MAYBE_DIRTY`로 바꾸는 처리가 없었다면 어떤 버그가 생깁니까? 마지막으로 effect의 `deriveds` 목록에는 어떤 조건을 만족한 derived만 등록되는지 `get`에서 찾고, 그 목록이 언제 정리되는지 확인하세요. 목록에 등록되지 않은 owned derived는 어떻게 그래프에서 떨어져 나갑니까?

<details><summary>힌트 1</summary><code>check_dirtiness</code>의 188~194줄(<code>DISCONNECTED</code> 처리)과 215줄(version 비교)을 보세요.</details>
<details><summary>힌트 2</summary><code>get</code>의 765~771줄은 어떤 경우에만 실행됩니까? <code>destroy_effect_deriveds</code>는 <code>update_effect</code>와 <code>destroy_effect</code>에서 호출됩니다. Svelte 테스트 <code>deriveds read inside the root/branches are cleaned up</code>도 참고하세요.</details>

**Q2.21** [예측] `09-unsafe-mutation.mjs`를 실행하기 전에, 세 개의 derived 중 어떤 것이 에러를 던지는지, 그리고 마지막 bonus는 에러를 던지는지 예측하세요. 실행한 뒤에는 (1) derived 안에서 외부 state에 쓰는 것을 금지하는 이유, (2) derived 안에서 만든 지역 state에는 쓸 수 있지만 읽을 수는 없는 이유, (3) bonus가 에러 없이 통과한 이유를 설명하세요.

<details><summary>힌트 1</summary><code>set</code>의 검사 조건, <code>push_derived_source</code>, <code>get</code>의 <code>state_unsafe_local_read</code> 검사, <code>is_runes</code>를 보세요.</details>
<details><summary>힌트 2</summary>derived는 lazy하게, 즉 "누군가 읽을 때" 계산됩니다. 그 계산 시점은 예측할 수 있습니까? 지역 state를 읽으면 derived가 자기 자신이 만든 source에 의존하게 되는데, 다음 실행에서 그 source는 어떻게 됩니까? bonus는 <code>root()</code> 밖에서 실행되므로 <code>component_context</code>가 무엇인지 생각해 보세요.</details>

### 2-E. 깊은 반응성: `proxy`

**Q2.22** [예측] `10-proxy-object.mjs`의 처음 네 줄 출력을 예측하세요. 실행한 뒤에는 `p.a = 10`이 원본 `raw.a`를 바꾸지 않는 이유를 `set` trap에서 찾고, 이 설계가 의도한 바를 `defineProperty` trap의 주석에서 찾으세요. `STATE_SYMBOL`은 어떤 두 가지 용도로 쓰입니까?

<details><summary>힌트 1</summary><code>proxy.js</code>의 <code>set</code> trap에 <code>Reflect.set</code>이나 <code>target[prop] = value</code>가 있는지 찾아보세요. 80~82줄 주석도 읽으세요.</details>
<details><summary>힌트 2</summary><code>proxy()</code>의 첫 번째 <code>if</code> 문과 <code>get</code> trap의 <code>STATE_SYMBOL</code> 분기를 보세요.</details>

**Q2.23** [예측] 같은 lab의 run 횟수 표를 예측하세요. 특히 다음 두 가지를 설명하세요.
- `p.c = 1`처럼 새 키를 추가하면 기존 키의 source는 하나도 바뀌지 않는데, `Object.keys(p)`를 읽는 effect가 다시 실행됩니다. 어떤 source가 이를 가능하게 합니까?
- `p.nested = { b: 3 }`으로 객체를 교체하면 `Object.keys(p)`를 읽는 effect도 다시 실행됩니다. 키 목록은 바뀌지 않았는데 왜 다시 실행됩니까?

<details><summary>힌트 1</summary><code>ownKeys</code> trap의 첫 줄을 보세요. 그리고 <code>Object.keys</code>가 내부적으로 어떤 trap을 추가로 호출하는지 생각해 보세요.</details>
<details><summary>힌트 2</summary><code>getOwnPropertyDescriptor</code> trap의 171줄을 보세요.</details>

**Q2.24** [예측] `11-proxy-array.mjs`에서 각 단계마다 어떤 effect가 다시 실행되는지 예측하세요. 실행한 뒤에는 (1) 배열의 `length` source만 다른 키와 달리 처음부터 만들어 두는 이유, (2) `arr.push(3)` 한 번이 `set` trap을 몇 번 호출하는지, (3) `arr.length = 0`이 `arr[0]`을 읽는 effect까지 다시 실행시키는 경로를 설명하세요.

<details><summary>힌트 1</summary><code>proxy()</code>의 41~45줄, <code>set</code> trap의 224~237줄과 270~282줄을 보세요.</details>
<details><summary>힌트 2</summary><code>Array.prototype.push</code>는 명세상 인덱스에 값을 쓰고, 그다음 <code>length</code>를 씁니다. 두 번의 쓰기가 각각 어떤 source를 건드리는지 따라가 보세요.</details>

## 체크포인트

코드를 보지 않고 다음 항목을 설명할 수 있으면 이 단계를 마친 것입니다.

1. `set(count, 1)` 한 번이 일으키는 일을 "표시 단계"(`mark_reactions`, `schedule_effect`)와 "실행 단계"(`flush` → `check_dirtiness` → `update_effect`)로 나누어 칠판에 그릴 수 있습니다.
2. `DIRTY`, `MAYBE_DIRTY`, `CLEAN`, 그리고 전역 `version`이 각각 어떤 질문("확실히 바뀌었나?", "바뀌었을 수도 있나?", "의존성이 나보다 새로운가?")에 답하는지 말할 수 있습니다.
3. `$effect`와 `$effect.pre`(그리고 템플릿 표현식)가 실행되는 시점과 순서가 다른 이유를 설명할 수 있습니다.
4. unowned derived와 owned derived가 그래프에 연결되고 분리되는 규칙을 메모리 누수 관점에서 설명할 수 있습니다.
5. `$state({...})`의 프로퍼티 하나를 읽고 쓸 때 어떤 source가 언제 만들어지고 갱신되는지 설명할 수 있습니다.

## 더 나아가기

1. **미니 signal 라이브러리 구현**: `labs/02-signals/mini/`에 100줄 안팎으로 `state`, `derived`, `effect`, `get`, `set`, `flushSync`를 직접 구현하세요. 그다음 `01-maybe-dirty.mjs`, `02-diamond.mjs`, `03-conditional-deps.mjs`, `05-self-write.mjs`의 import 경로를 여러분의 구현으로 바꿔서 같은 결과(효과 실행 횟수, 계산 횟수)가 나오는지 확인하세요. `DIRTY`/`MAYBE_DIRTY` 두 단계 색칠과 전역 version 비교를 넣지 않으면 어떤 lab이 깨지는지 관찰하는 것이 핵심입니다.
2. **최신 버전과 비교**: `git -C svelte show main:packages/svelte/src/internal/client/runtime.js`에서 `read_version`과 `rv`를 검색하세요. Q2.8에서 관찰한 `reactions` 중복을 최신 버전은 어떻게 없앴습니까? `git -C svelte log -S 'read_version' --oneline main -- packages/svelte/src/internal/client/runtime.js`로 이 변경을 도입한 커밋과 PR을 찾아 동기를 확인하세요. 같은 방식으로 `main`의 `reactivity/batch.js`가 왜 생겼는지도 5단계 예습으로 살펴보세요.
3. **테스트 읽기**: `tests/signals/test.ts`에서 `deriveds update upon reconnection` 테스트 세 개를 읽고, 각각 어떤 버그를 막기 위한 테스트인지 추측해서 적으세요. 그다음 `git -C svelte log -L '/deriveds update upon reconnection #1/,+20:packages/svelte/tests/signals/test.ts'`로 테스트가 추가된 커밋을 찾아 추측을 확인하세요.
