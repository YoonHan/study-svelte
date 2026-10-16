# 2단계 answer key: signal 시스템

> 스포일러: 학습자는 열람하지 않는 것을 권장합니다.

튜터가 학습자의 답을 확인하거나 `/hint`, `/quiz`를 수행할 때 참고하는 채점 기준입니다. 줄 번호는 모두 `svelte@5.0.0` 기준입니다. 학습자의 답이 아래 핵심 포인트와 표현이 달라도, 같은 메커니즘을 정확하게 짚었다면 정답으로 인정합니다. lab 출력값은 2026-10-12에 Node 24에서 실제로 실행해서 확인한 값입니다.

---

## 2-A. 그래프의 재료

### Q2.1 effect와 effect_root의 실행 시점

- `create_effect(type, fn, sync, push)`의 세 번째 인자 `sync`가 결정합니다. `sync`가 `true`이면 그 자리에서 `update_effect`를 호출하고, `false`이면 `schedule_effect`로 큐에 넣습니다.
- `effect_root`, `render_effect`, `block`(따라서 `template_effect`), `branch`, `inspect_effect`는 `sync = true`입니다. `effect`(따라서 deferred가 아닌 `user_effect`)만 `sync = false`입니다.
- 결론적으로 `render_effect`와 `template_effect`는 생성 즉시 실행되는 쪽에 속합니다.
- 근거: `svelte/packages/svelte/src/internal/client/reactivity/effects.js:86` (`create_effect`), `:120-135` (sync 분기), `:243-248` (`effect_root`), `:254-256` (`effect`), `:314-316` (`render_effect`), `:322-337` (`template_effect`, `block`).

### Q2.2 version이 0에서 2가 되는 이유

- `version`은 signal별 카운터가 아니라 전역 단조 증가 카운터 `current_version`에서 발급받은 "논리 시각"입니다. `increment_version()`은 `++current_version`을 반환합니다.
- `00-hello.mjs`에서는 첫 flush 때 `double`이 계산되면서 `update_derived`가 `increment_version()`을 호출해 `double.version = 1`을 받았습니다. 그다음 `set(count, 1)`이 `internal_set`에서 다시 호출해 2를 받았습니다.
- 전역 시계가 필요한 이유는 `check_dirtiness`가 **서로 다른 signal**의 version을 비교하기 때문입니다(`dependency.version > reaction.version`). reaction의 version은 "내가 마지막으로 계산된 시각"이고, 의존성의 version은 "마지막으로 값이 바뀐 시각"입니다. 둘을 비교하려면 같은 시계를 써야 합니다. effect도 실행이 끝나면 `effect.version = current_version`으로 시각을 기록합니다.
- 근거: `svelte/packages/svelte/src/internal/client/runtime.js:124` (`current_version`), `:159-161` (`increment_version`), `:215-217` (version 비교), `:443` (effect version 기록); `svelte/packages/svelte/src/internal/client/reactivity/sources.js:160`; `svelte/packages/svelte/src/internal/client/reactivity/deriveds.js:156-159`.

### Q2.3 타입 관계와 양방향 edge

- `Signal { f, version }` ← `Value { reactions, equals, v }`, `Reaction { fn, deps, parent }`. `Derived`는 `Value`이면서 `Reaction`이고(`children` 추가), `Effect`는 `Reaction`입니다(트리 포인터 `first/last/next/prev`, `teardown`, `deriveds`, `nodes_start/end`, `ctx` 추가). source는 `Value`일 뿐이므로 `deps`가 없습니다.
- derived는 다른 signal을 읽는 쪽(Reaction)이면서 다른 reaction이 읽는 쪽(Value)이므로 그래프의 중간 노드입니다.
- `reactions`(하향 edge)는 `mark_reactions`가 순회합니다. 변경이 생기면 "나를 읽는 쪽"을 찾아 표시해야 하기 때문입니다.
- `deps`(상향 edge)는 `check_dirtiness`가 순회합니다. `MAYBE_DIRTY`인 reaction이 "내가 읽은 것 중 실제로 바뀐 것이 있는가"를 확인하기 때문입니다. `remove_reactions`가 edge를 끊을 때도 `deps`를 순회합니다.
- 한쪽만 저장했다면 반대 방향을 찾기 위해 그래프 전체를 탐색해야 합니다. 예를 들어 `reactions`가 없으면 `set` 때 누가 나를 읽는지 알 수 없습니다.
- 근거: `svelte/packages/svelte/src/internal/client/reactivity/types.d.ts:3-63`; `svelte/packages/svelte/src/internal/client/reactivity/sources.js:217-251`; `svelte/packages/svelte/src/internal/client/runtime.js:174-228`, `:399-406`.

### Q2.4 값이 바뀌지 않는 derived (01-maybe-dirty)

- 실제 출력: `set(count, 2)` 직후 `parity`는 `DERIVED | DIRTY`, `fx`는 `EFFECT | MAYBE_DIRTY`입니다. 최종 `effect_runs = 1`, `parity_computations = 2`입니다. `count.reactions`에는 `parity`만 있습니다.
- `internal_set`이 `mark_reactions(count, DIRTY)`를 호출하면 직접 reaction인 `parity`가 `DIRTY`가 됩니다. `parity`가 이전에 `CLEAN`이었으므로 `mark_reactions(parity, MAYBE_DIRTY)`로 재귀하고, `fx`는 `MAYBE_DIRTY`가 되며 `schedule_effect`로 예약됩니다.
- flush에서 `flush_queued_effects`가 `check_dirtiness(fx)`를 호출합니다. `fx`는 `MAYBE_DIRTY`이므로 deps를 순회하고, `parity`가 `DIRTY`이므로 `update_derived(parity)`로 다시 계산합니다(두 번째 계산).
- 새 값 0이 이전 값과 같으므로(`equals`) `update_derived`는 `version`을 올리지 않습니다. 따라서 `parity.version(1) > fx.version(1)`이 거짓이고, `fx`는 `CLEAN`으로 바뀌며 실행되지 않습니다.
- 근거: `svelte/packages/svelte/src/internal/client/reactivity/sources.js:162`, `:240-248`; `svelte/packages/svelte/src/internal/client/runtime.js:181-224`, `:530`; `svelte/packages/svelte/src/internal/client/reactivity/deriveds.js:149-160`.

### Q2.5 다이아몬드와 glitch-free (02-diamond)

- 실제 출력: `seen = ['2+3', '4+6', '6+9']`, `computations = { b: 3, c: 3 }`입니다. 즉 `set`마다 effect가 정확히 한 번 실행되고 derived도 한 번씩 계산됩니다.
- `set`은 아무것도 실행하지 않고 표시만 합니다(`mark_reactions`, `schedule_effect`). effect는 표시 단계가 모두 끝난 뒤 flush에서 실행됩니다.
- effect가 실행되면서 `get(b)`, `get(c)`를 호출하면 `get`이 `check_dirtiness` → `update_derived`로 그 자리에서 최신 값을 계산합니다(pull). 따라서 effect가 보는 `b`와 `c`는 항상 같은 시점의 `a`에서 계산된 값입니다.
- effect는 `a`에 대해 이미 `DIRTY`로 표시되면 `mark_reactions`의 `DIRTY` 건너뛰기 조건 때문에 다시 예약되지 않습니다. 또 같은 root가 이미 큐에 있으면 `schedule_effect`가 중복으로 넣지 않습니다.
- 근거: `svelte/packages/svelte/src/internal/client/reactivity/sources.js:229`; `svelte/packages/svelte/src/internal/client/runtime.js:571-592`, `:774-780`.

### Q2.6 push-pull 대신 다른 방식

- (가) 모두 `DIRTY`로 표시하면 값이 바뀌지 않은 derived 뒤에 있는 effect도 무조건 다시 실행됩니다. `01-maybe-dirty`에서 `effect_runs`가 2가 됩니다. derived의 핵심 이점인 "값이 같으면 하위 전파를 끊는다(equality cutoff)"가 사라집니다.
- (나) `set`마다 즉시 다시 계산하면 아무도 읽지 않는 derived도 계산됩니다(laziness 상실). 한 이벤트 핸들러에서 `set`을 여러 번 하면 그때마다 계산합니다(`04-batching`에서 1회가 아니라 여러 회). 계산 순서를 잘못 잡으면 다이아몬드에서 일관되지 않은 중간 상태가 보이며, 이를 피하려면 위상 정렬이 필요합니다.
- 현재 방식은 표시 비용(그래프 순회)만 `set` 때 내고, 계산 비용은 실제로 읽을 때 한 번만 냅니다. 대신 `MAYBE_DIRTY` 검증 때 deps를 다시 순회하는 비용이 있습니다.
- 근거: 설계 판단 문제이므로 `sources.js:217-251`, `runtime.js:174-228`, `deriveds.js:149-160`을 근거로 들면 충분합니다.

## 2-B. 의존성 수집

### Q2.7 조건부 의존성 (03-conditional-deps Part 1)

- 실제 출력: 체크포인트 1에서 `fx.deps = ['flag', 'a']`, `a.reactions = ['fx']`, `b.reactions = null`입니다. `set(b)` 뒤에도 `runs = 1`입니다. 체크포인트 3에서 `fx.deps = ['flag', 'b']`, `a.reactions = null`, `b.reactions = ['fx']`입니다. `set(a)` 뒤에도 `runs = 2`입니다.
- `get`은 `active_reaction`이 있으면 읽은 signal을 기록합니다. 의존성 목록은 선언되지 않고, 매 실행 중에 실제로 호출된 `get`으로 다시 만들어집니다.
- 실행이 끝나면 `update_reaction`이 새 목록으로 `deps`를 교체하고, 더 이상 읽지 않는 signal의 `reactions`에서 자신을 제거합니다.
- 근거: `svelte/packages/svelte/src/internal/client/runtime.js:738-753` (수집), `:315-340` (교체).

### Q2.8 skipped_deps, new_deps, reactions 중복

- 체크포인트 3을 만든 실행에서 이전 `deps`는 `[flag, a]`입니다. 첫 `get(flag)`는 `deps[0] === flag`이므로 `skipped_deps = 1`이 됩니다. 다음 `get(b)`는 `deps[1] === a`가 아니므로 `new_deps = [b]`가 됩니다. 종료 시 `skipped_deps = 1`, `new_deps = [b]`입니다.
- `remove_reactions(fx, 1)`은 `deps[1]`부터, 즉 `a.reactions`에서 `fx`를 제거합니다. 그다음 `deps.length = 2`, `deps[1] = b`로 교체하고, `skipped_deps` 이후 항목인 `b.reactions`에 `fx`를 추가합니다. `flag`의 edge는 건드리지 않습니다.
- Part 2 실제 출력: `count.reactions = ['fx', 'fx']`, `fx.deps = ['count', 'count']`입니다. 첫 실행에서 `deps`가 `null`이므로 두 번의 `get`이 모두 `new_deps`에 push되고, 이후 `deps[i].reactions.push(reaction)`이 항목마다 실행되기 때문입니다. 5.0.0의 `get`에는 중복 제거가 없습니다.
- 중복이 있어도 effect는 한 번만 실행됩니다. `mark_reactions`가 첫 번째 `fx`를 `DIRTY`로 만들고 나면 두 번째 `fx`는 `(flags & DIRTY) !== 0` 조건으로 건너뜁니다. 비용은 메모리와 순회 시간뿐입니다.
- 이후 버전에서는 `read_version`과 signal의 `rv` 필드로 중복을 제거합니다(PR #14945 "chore: improve signal performance by reducing duplicate deps"). 학습자가 이를 찾았다면 가점입니다.
- 근거: `svelte/packages/svelte/src/internal/client/runtime.js:747-753`, `:318-336`, `:359-373`; `svelte/packages/svelte/src/internal/client/reactivity/sources.js:229`.

### Q2.9 active_reaction, root/branch, untrack

- `active_reaction`은 `update_reaction`에서 설정하고 `finally`에서 복원합니다(스택처럼 동작). `untrack`, `execute_effect_teardown`, `destroy_effect`, `pop`도 일시적으로 바꾸고 복원합니다.
- `update_reaction`은 `BRANCH_EFFECT | ROOT_EFFECT`이면 `active_reaction = null`로 둡니다. 따라서 root나 branch 함수 안에서 직접 읽은 signal은 의존성으로 기록되지 않습니다.
- 이 처리가 없으면 `effect_root(() => get(x))`에서 root가 `x.reactions`에 들어갑니다. 그러면 `set(x)`가 `mark_reactions`로 root의 상태를 `DIRTY`로 바꿉니다. 그런데 root와 branch의 `CLEAN` 플래그는 "하위에 dirty effect가 있는가"를 나타내는 용도로 쓰이므로(Q2.11) 그 의미가 오염됩니다. 또한 설계상 root와 branch는 구조를 담당하므로, 상태 변경 때문에 다시 실행되면 자식 effect와 DOM이 모두 파괴되고 다시 만들어지게 됩니다. 이런 일을 막기 위해 의존성을 수집하지 않습니다.
- `untrack(() => get(d))`: `untrack`이 `active_reaction`을 `null`로 바꾸므로 effect와 `d` 사이에는 edge가 생기지 않습니다. 하지만 `d`가 계산될 때 `execute_derived` → `update_reaction(d)`가 `active_reaction = d`로 설정하므로 `d`와 `d`의 source 사이의 edge는 정상적으로 생깁니다(owned/unowned 규칙은 따로 적용됩니다).
- 근거: `svelte/packages/svelte/src/internal/client/runtime.js:310`, `:343-350`, `:840-848`; `svelte/packages/svelte/src/internal/client/reactivity/deriveds.js:110-143`.

### Q2.10 skipped_deps 최적화의 손익

- 주석에 따르면 대부분의 재실행은 같은 deps를 같은 순서로 읽으므로, 그 경우 `new_deps` 배열을 아예 만들지 않아 GC 비용을 줄입니다. 기존 `deps` 배열과 기존 edge를 그대로 재사용합니다.
- 읽는 순서가 매번 뒤집히면 첫 `get`에서 `skipped_deps`가 0으로 멈춥니다. 그러면 새 배열을 만들고, `remove_reactions(reaction, 0)`으로 모든 edge를 끊은 뒤 모두 다시 연결합니다. 이때 `remove_reaction`이 `indexOf`로 선형 탐색하므로 reaction이 많은 signal에서는 비용이 커집니다.
- 매번 새 배열을 만드는 구현은 동작이 단순하고 비용이 예측 가능하지만, 흔한 경우에도 할당과 edge 재연결 비용을 냅니다. 현재 구현은 흔한 경우를 최적화하고 드문 경우의 비용을 감수합니다.
- 근거: `svelte/packages/svelte/src/internal/client/runtime.js:101-109`, `:318-340`, `:359-373`, `:747-753`.

## 2-C. 스케줄링과 effect 트리

### Q2.11 schedule_effect와 CLEAN의 두 가지 의미

- `schedule_effect`는 부모를 따라 올라가며 root 또는 branch effect를 만날 때마다 `CLEAN`인지 확인합니다. 이미 `CLEAN`이 아니면 즉시 `return`하고, `CLEAN`이면 끄고 계속 올라갑니다. 마지막에 도달한 최상위 effect(root)를 `queued_root_effects`에 넣습니다.
- 역할 1, 중복 제거: 같은 root 아래에서 effect 여러 개가 dirty가 되어도 root는 한 번만 큐에 들어갑니다. 경로상의 branch가 이미 표시되어 있으면 그 위로는 올라가지도 않습니다.
- 역할 2, 탐색 범위 축소(breadcrumb): `process_effects`는 `BRANCH_EFFECT`이면서 `CLEAN`인 노드를 `is_skippable_branch`로 건너뜁니다. 즉 dirty effect로 가는 경로에 있는 branch만 방문하므로, 큰 트리에서 dirty effect가 하나뿐이어도 트리 전체를 돌지 않습니다. 방문한 branch는 `f ^= CLEAN`으로 다시 `CLEAN`을 켭니다. root는 `flush_queued_root_effects`에서 다시 켭니다.
- 일반 reaction에서 `CLEAN`은 "내 값이 최신이다"를 뜻합니다. root와 branch에서 `CLEAN`은 "내 하위 트리에 처리할 dirty effect가 없다"를 뜻합니다. root와 branch는 의존성을 수집하지 않으므로(Q2.9) 이 비트를 다른 용도로 쓸 수 있습니다.
- 근거: `svelte/packages/svelte/src/internal/client/runtime.js:571-592`, `:504-506`, `:611-617`.

### Q2.12 여러 번의 set과 한 번의 flush (04-batching)

- 실제 출력: 세 번의 `set` 직후 `effect_runs = 1`(아직 실행되지 않음)입니다. `get(double)`은 6을 반환하며 그 자리에서 derived를 계산합니다("(derived computed)" 출력). microtask 뒤 effect는 한 번 실행되어 `n=3 double=6`을 보고, 이때 derived를 다시 계산하지 않습니다. 최종 `effect_runs = 2`입니다.
- `schedule_effect`는 `scheduler_mode === FLUSH_MICROTASK`이고 `is_micro_task_queued`가 거짓일 때만 `queueMicrotask(process_deferred)`를 호출하고 플래그를 켭니다. 그래서 여러 번 `set`해도 microtask는 한 번만 예약됩니다. `process_deferred`가 플래그를 끄고 큐를 처리합니다.
- derived를 읽는 경로는 스케줄러와 무관합니다. `get`이 `check_dirtiness`와 `update_derived`로 즉시 최신 값을 만들고 `CLEAN`(owned) 또는 `MAYBE_DIRTY`(unowned)로 바꿉니다. 이 lab의 `double`은 effect 밖에서 만들었으므로 unowned입니다. effect가 나중에 읽을 때는 version 비교만으로 재계산 없이 통과합니다.
- 근거: `svelte/packages/svelte/src/internal/client/runtime.js:44-46`, `:551-565`, `:571-577`, `:774-780`.

### Q2.13 state에 쓰는 effect (05-self-write Case 1, 3)

- 실제 출력: Case 1은 `runs = 4, n = 3`, Case 3은 `runs = 2`입니다.
- Case 1(읽은 뒤 쓰기): 첫 실행 중 `get(n)`이 `new_deps = [n]`을 만듭니다. 그다음 `set`에서 `internal_set`의 특별 경로가 `active_effect`가 `CLEAN`이고(`update_effect`가 실행 전에 `CLEAN`으로 설정) `new_deps.includes(n)`이므로 effect를 `DIRTY`로 바꾸고 `schedule_effect`합니다. 두 번째 실행부터는 effect가 이미 `n.reactions`에 있으므로 `mark_reactions`가 같은 일을 합니다. `n`이 3이 되면 쓰지 않으므로 멈춥니다(0, 1, 2, 3에서 총 4회).
- Case 3(쓴 뒤 읽기): 첫 실행의 `set(n, 5)` 시점에는 아직 `n`을 읽지 않았으므로 `untracked_writes = [n]`에 기록합니다. 이어서 `get(n)`이 `untracked_writes.includes(n)`을 확인하고 effect를 `DIRTY`로 바꾸어 예약합니다. 두 번째 실행에서는 `set(n, 5)`가 같은 값이므로 `internal_set`의 첫 줄 `source.equals(value)`에서 아무 일도 하지 않습니다. 따라서 2회에서 멈춥니다.
- 특별 경로가 없다면, 첫 실행에서는 effect가 아직 어떤 `reactions`에도 등록되지 않았으므로 자기가 읽은(또는 곧 읽을) state에 써도 다시 실행되지 않습니다. 반면 두 번째 실행부터는 `mark_reactions`가 다시 실행시킵니다. 즉 같은 코드가 첫 실행과 이후 실행에서 다르게 동작하는 비일관성이 생깁니다. 특별 경로는 첫 실행에서 `mark_reactions`의 효과를 흉내 냅니다.
- `BRANCH_EFFECT`는 이 처리에서 제외됩니다.
- 근거: `svelte/packages/svelte/src/internal/client/reactivity/sources.js:158`, `:164-185`; `svelte/packages/svelte/src/internal/client/runtime.js:111-121`, `:419`, `:755-764`. 관련 테스트는 `svelte/packages/svelte/tests/signals/test.ts:362-402`입니다.

### Q2.14 무한 루프 감지가 500회에서 멈추는 이유 (05-self-write Case 2)

- 실제 출력: `threw: effect_update_depth_exceeded`, `runs = 500`입니다.
- `infinite_loop_guard`는 `flush_count > 1000`이면 에러를 던지고, 아니면 `flush_count++`합니다. 이 함수는 `flush_sync`의 시작과 `flush_queued_root_effects`의 시작(큐가 비어 있지 않을 때) 두 곳에서 호출됩니다.
- effect가 매번 자신을 다시 예약하면 `flush_sync`가 `queued_root_effects`(이번 라운드의 `root_effects`)가 비어 있지 않으므로 자기 자신을 재귀 호출합니다. 재귀 한 번마다 `flush_sync`에서 1, `flush_queued_root_effects`에서 1, 합계 2씩 증가하므로 effect는 약 500회 실행된 뒤 1,000을 넘깁니다.
- microtask 경로에서는 `process_deferred` → `flush_queued_root_effects`가 한 번 실행될 때마다 1씩 증가하고, effect가 다시 예약되면 새 microtask가 잡힙니다. `is_micro_task_queued`가 다시 켜졌으므로 `flush_count`는 0으로 초기화되지 않고 계속 누적되며, 약 1,000회에서 가드가 에러를 던집니다.
- `flush_count > 1001` 검사: `flush_count`를 증가시키는 곳은 `infinite_loop_guard`뿐이고, 이 함수는 값이 1,000을 넘으면 `flush_count = 0`으로 초기화한 뒤 던집니다. 따라서 `flush_count`의 최댓값은 1001이고, 5.0.0에서 이 조건은 사실상 참이 되지 않는 방어 코드입니다. 학습자가 "도달하지 않는다"고 판단하거나 "가드가 실패했을 때를 대비한 이중 안전장치"라고 판단하면 모두 인정하되, 근거로 초기화 코드를 짚었는지 확인합니다.
- `git blame` 결과: 553줄은 커밋 `97e41dc1c`(PR #11815 "fix: coherent infinite loop guard", 2024-05-29)에서 `101`을 `1001`로 바꾼 것입니다. 가드의 임계값과 숫자를 맞추려는 변경입니다.
- 근거: `svelte/packages/svelte/src/internal/client/runtime.js:460-484`, `:490-495`, `:551-565`, `:669-702`.

### Q2.15 render_effect와 effect의 실행 순서 (06-effect-order)

- 실제 출력은 다음과 같습니다.
  ```
  B  render_effect 0
  D  render_effect 0
     D.2 render_effect (child of D) 0
  --- end of root fn
  === phase 1 ===
  A  effect 0
  C  effect 0
     C.1 render_effect (child of C) 0
     D.1 effect (child of D) 0
     C.2 effect (child of C) 0
  === phase 2 ===
  B  render_effect 1
  D  render_effect 1
     D.2 render_effect (child of D) 1
     C.1 render_effect (child of C) 1
  A  effect 1
  C  effect 1
     C.1 render_effect (child of C) 1
     D.1 effect (child of D) 1
     C.2 effect (child of C) 1
  ```
- `render_effect`는 생성 즉시 실행되고(Q2.1), flush 때는 `process_effects`가 트리를 깊이 우선으로 돌면서 dirty인 render effect를 **그 자리에서** 실행한 뒤 자식으로 내려갑니다. 일반 `EFFECT`는 `effects` 배열에 모으기만 하고, 트리 순회가 끝난 뒤 `collected_effects`에 넣으며, 이어서 그 effect의 하위 트리를 `process_effects`로 다시 처리합니다. 모인 effect는 `flush_queued_effects`에서 마지막에 실행됩니다. 결과적으로 같은 root 안에서는 render effect(템플릿 갱신, `$effect.pre`)가 모두 끝난 뒤 user effect(`$effect`)가 실행됩니다.
- phase 2의 `C.1` 이중 실행: `process_effects(root)`가 `C`를 수집한 뒤, 수집 루프에서 `process_effects(C)`를 호출합니다. 이때 기존 `C.1`은 render effect이고 `n` 때문에 dirty이므로 **부모 `C`보다 먼저** 실행됩니다. 그 뒤 `flush_queued_effects`에서 `C`가 다시 실행되면 `update_effect`가 `destroy_effect_children(C)`로 기존 `C.1`과 `C.2`를 파괴하고, `C`의 함수가 새 `C.1`을 만들며 새 `C.1`이 동기적으로 다시 실행됩니다. 즉 이미 실행된 자식이 곧바로 파괴되고 다시 만들어지는 낭비가 있습니다.
- phase 1의 `C.2`가 `D.1`보다 늦은 이유: `D.1`은 `D`가 root 함수 안에서 동기 실행될 때 이미 만들어져 있어서 첫 라운드에서 수집됩니다. `C.2`는 첫 라운드에서 `C`가 실행되는 동안 **새로** 만들어지고, `effect`이므로 `schedule_effect`로 root를 다시 큐에 넣습니다. 그래서 `flush_sync`의 다음 재귀 라운드에서 실행됩니다. phase 2의 `C.2`도 같은 이유로 마지막에 실행됩니다(기존 `C.2`는 `DESTROYED`라서 `flush_queued_effects`에서 건너뜁니다).
- 근거: `svelte/packages/svelte/src/internal/client/runtime.js:523-531`, `:605-661`, `:683-690`; `svelte/packages/svelte/src/internal/client/reactivity/effects.js:120-135`.

### Q2.16 재실행 전 자식 파괴와 teardown 순서 (07-effect-tree)

- 실제 출력: `set(n, 1)` 때 `child teardown (n=0)` → `parent teardown (n=0)` → `parent run (n=1)` → `child run (n=1)` → `once run` 순서입니다. `destroy()` 때 `child teardown (n=1)` → `parent teardown (n=1)` 순서입니다. 기존 child는 새 child와 다른 객체이고 플래그는 `EFFECT | DESTROYED`입니다.
- `update_effect` 순서: (1) `DESTROYED`면 중단, (2) 상태를 `CLEAN`으로 설정, (3) `active_effect`와 `component_context` 교체, (4) `destroy_effect_deriveds`로 이 effect의 `deriveds` 목록에 있는 derived 파괴, (5) 자식 effect 파괴(`BLOCK_EFFECT`이면 branch를 제외하고 파괴), (6) 자기 teardown 실행, (7) `update_reaction`으로 함수 실행 및 deps 갱신, (8) 반환값을 새 teardown으로 저장, (9) `version` 기록.
- 매번 파괴하고 새로 만드는 이유: 자식은 부모 실행 시점의 지역 값(`v`)을 클로저로 캡처합니다. 재사용하면 오래된 값을 보거나, 부모의 새 실행에서 만들어지지 않는 자식이 남아 누수가 생깁니다. 부모 함수가 "자식 집합 전체를 다시 기술한다"는 모델을 단순하게 유지하는 선택입니다.
- `destroy_block_effect_children`은 `BRANCH_EFFECT`인 자식을 남깁니다. `{#if}`나 `{#each}` 같은 블록은 branch를 직접 관리하면서 조건이 바뀌지 않으면 기존 branch(와 그 DOM)를 유지하고, 바뀌면 pause/resume과 transition을 거쳐 정리하기 때문입니다. 3단계에서 확인하므로 이 부분은 추측 수준이어도 됩니다.
- 근거: `svelte/packages/svelte/src/internal/client/runtime.js:412-458`; `svelte/packages/svelte/src/internal/client/reactivity/effects.js:350-364`, `:387-412`, `:419-488`.

### Q2.17 사라진 once와 이름 없는 child (07-effect-tree)

- 실제 트리 출력: root(`ROOT_EFFECT | CLEAN | EFFECT_RAN`) → `parent` → `(anonymous)` 하나뿐입니다.
- `flush_queued_effects`는 effect를 실행한 뒤 `deps === null && first === null && nodes_start === null`이면, teardown이 없을 때 `unlink_effect`로 트리에서 제거하고(`once`), teardown이 있을 때는 트리에 남기되 `effect.fn = null`로 함수 참조를 버립니다(`child`). `fn`이 `null`이 되어 lab의 `print_tree`가 이름을 찾지 못합니다.
- 안전한 이유: deps가 없으면 다시 실행될 경로가 없습니다(아무 source의 `reactions`에도 없음). 자식과 DOM도 없으므로 파괴할 때 할 일이 없습니다. teardown이 있는 effect는 부모가 파괴되거나 재실행될 때 teardown을 호출해야 하므로 트리에 남아야 하지만, 함수 자체는 다시 호출되지 않으므로 버려도 됩니다.
- 동기 effect(`render_effect` 등)는 `create_effect`의 `inert` 계산으로 처음부터 트리에 추가하지 않습니다. 비동기 effect는 실행 전에는 deps를 알 수 없으므로 일단 트리에 넣고, 실행 후 `flush_queued_effects`에서 판단합니다(538~546줄 주석).
- 근거: `svelte/packages/svelte/src/internal/client/runtime.js:530-546`; `svelte/packages/svelte/src/internal/client/reactivity/effects.js:137-157`, `:495-507`.

## 2-D. derived의 소유권과 메모리

### Q2.18 unowned derived (08 Part 1 [1], [2])

- 실제 출력: [1]에서 `count.reactions = null`, `d`는 `DERIVED | UNOWNED | MAYBE_DIRTY`, `deps = ['count']`입니다. [2]에서 값 2를 올바르게 반환하고 상태는 계속 `MAYBE_DIRTY`입니다.
- `derived()`는 생성 시점에 `active_effect === null`이면 `UNOWNED`를 붙입니다. owner(정리해 줄 effect)가 없다는 뜻입니다.
- `update_reaction`은 `skip_reaction = !is_flushing_effect && (flags & UNOWNED) !== 0`으로 설정하고, `skip_reaction`이면 `deps[i].reactions.push(reaction)`을 하지 않습니다. 즉 `d.deps`는 기록하지만 `count.reactions`에는 `d`를 등록하지 않습니다.
- `update_derived`는 `UNOWNED`(또는 `skip_reaction`)이고 deps가 있으면 상태를 `CLEAN`이 아닌 `MAYBE_DIRTY`로 설정합니다. `check_dirtiness`도 "Unowned signals should never be marked as clean"에 따라 unowned를 `CLEAN`으로 바꾸지 않습니다.
- 두 동작은 짝입니다. 등록을 하지 않는 이유는 owner가 없는 derived를 source의 `reactions`에 넣으면 아무도 그 edge를 끊어 주지 않아 derived가 source만큼 오래 살아남는 메모리 누수가 생기기 때문입니다. 등록하지 않았으므로 `count`가 바뀌어도 `d`는 알림을 받지 못합니다. 그래서 `d`는 영원히 "바뀌었을 수도 있다"(`MAYBE_DIRTY`) 상태로 두고, 읽을 때마다 deps의 version을 직접 비교해서 최신인지 확인합니다.
- 근거: `svelte/packages/svelte/src/internal/client/reactivity/deriveds.js:36-38`, `:151-154`; `svelte/packages/svelte/src/internal/client/runtime.js:126-128`, `:311`, `:332-336`, `:221-224`. 관련 테스트는 `svelte/packages/svelte/tests/signals/test.ts:620-643`입니다.

### Q2.19 unowned derived의 연결과 분리 (08 Part 1 [3], [4])

- 실제 출력: [3]에서 `count.reactions = ['d']`, `d.reactions = ['fx']`입니다. [4]에서 `count.reactions = null`, `d.reactions = null`입니다.
- 연결: effect(`fx`)가 `get(d)`를 호출하면 `check_dirtiness(d)`가 deps를 순회합니다. `is_unowned && active_effect !== null && !skip_reaction`이고 `count.reactions`에 `d`가 없으면 `d`를 등록합니다. effect 안에서 읽힌다는 것은 effect가 `d`를 붙잡고 있다는 뜻이므로, 그동안은 알림을 받는 편이 효율적이고 effect가 정리될 때 함께 끊을 수 있습니다.
- 분리: effect가 파괴되면 `destroy_effect` → `remove_reactions(fx, 0)` → `remove_reaction(fx, d)`가 `d.reactions`에서 `fx`를 지웁니다. `d.reactions`가 `null`이 되고 `d`가 derived이므로 `MAYBE_DIRTY`로 바꾸고 `remove_reactions(d, 0)`으로 `count.reactions`에서도 `d`를 지웁니다. 연쇄 분리가 없으면 `count`가 `d`를 계속 참조하므로, 컴포넌트가 사라진 뒤에도 `d`와 `d`가 참조하는 클로저가 GC되지 않습니다.
- 근거: `svelte/packages/svelte/src/internal/client/runtime.js:203-213`, `:359-392`; `svelte/packages/svelte/src/internal/client/reactivity/effects.js:453`. 관련 테스트는 `svelte/packages/svelte/tests/signals/test.ts:645-679`입니다.

### Q2.20 owned derived의 DISCONNECTED와 재연결 (08 Part 2)

- 실제 출력: [5]에서 `s.reactions = ['owned']`, `owned`는 `DERIVED | CLEAN`입니다. [6]에서 `s.reactions = null`, `owned`는 `DERIVED | DISCONNECTED | MAYBE_DIRTY`입니다. [7]에서 `get(d) = 105`, `s.reactions = ['owned']`, `owned`는 `DERIVED | CLEAN`입니다.
- 마지막 reader가 사라지면 `remove_reaction`이 derived를 `MAYBE_DIRTY`로 바꾸고, owned이면 `DISCONNECTED`를 붙인 뒤 `deps` 쪽 edge를 끊습니다. 아무도 읽지 않는 derived가 source에 계속 매달려 있지 않게 하기 위해서입니다.
- 분리된 동안에는 `s`가 바뀌어도 `d`가 표시되지 않습니다. 그러나 분리할 때 이미 `MAYBE_DIRTY`로 바꾸었으므로, 다음에 읽을 때 `check_dirtiness`가 반드시 deps를 검증합니다. `DISCONNECTED`이면 먼저 모든 deps의 `reactions`에 자신을 다시 등록하고 플래그를 지웁니다(재연결). 이어서 `s.version > d.version`이므로 다시 계산해서 105를 얻습니다.
- `MAYBE_DIRTY`로 바꾸지 않았다면 `d`는 `CLEAN`으로 남고, `check_dirtiness`가 즉시 `false`를 반환해서 오래된 값 100을 계속 돌려주는 버그가 생깁니다.
- owned derived의 `parent`는 생성 시점의 `active_effect`입니다. `get`은 `active_reaction`이 없는 곳에서(예: root나 branch 함수 안에서) 아직 한 번도 계산되지 않은(`deps === null`) derived를 읽을 때만 `parent.deriveds`에 등록합니다. reaction이 없으니 reader 연쇄 분리로 정리될 수 없는 경우를 부모 effect가 책임지는 것입니다. 이 목록은 부모 effect가 다시 실행되거나 파괴될 때 `destroy_effect_deriveds` → `destroy_derived`로 정리됩니다. 파괴된 derived를 다시 읽으면 `get`이 메모이제이션 없이 실행만 하고 파괴 상태를 유지합니다.
- 목록에 등록되지 않은 owned derived(이 lab처럼 render effect 안에서 읽힌 경우)는 reader가 사라질 때 `remove_reaction`의 연쇄 분리로 source들의 `reactions`에서 빠지고, 더 이상 참조하는 곳이 없으면 GC 대상이 됩니다. 관련 테스트는 `svelte/packages/svelte/tests/signals/test.ts:473-493`, `:728-741`입니다.
- 근거: `svelte/packages/svelte/src/internal/client/runtime.js:376-391`, `:188-194`, `:215-217`, `:433`, `:724-731`, `:765-771`; `svelte/packages/svelte/src/internal/client/reactivity/effects.js:370-380`, `:451`; `svelte/packages/svelte/src/internal/client/reactivity/deriveds.js:54`, `:166-173`.

### Q2.21 derived 안에서 state에 쓰기 (09-unsafe-mutation)

- 실제 출력: `threw: state_unsafe_mutation`, `ok   : 5`, `threw: state_unsafe_local_read`, `bonus ok   : outside / other = 2`입니다.
- `set`은 `active_reaction`이 `DERIVED` 또는 `BLOCK_EFFECT`이고, runes 모드이며, 대상 source가 이 derived 안에서 만든 것(`derived_sources`)이 아니면 `state_unsafe_mutation`을 던집니다.
- (1) 금지 이유: derived는 lazy하게 "누군가 읽을 때" 계산되므로 계산 시점과 횟수를 예측할 수 없습니다. 그런 곳에서 외부 state를 바꾸면 결과가 읽기 순서에 따라 달라집니다. 또 표시 단계나 다른 reaction의 실행 도중에 새로운 표시가 끼어들어 그래프 일관성이 깨집니다. derived는 순수한 계산이어야 한다는 규칙을 런타임에서 강제합니다. 템플릿 표현식(`BLOCK_EFFECT`)에도 같은 규칙이 적용됩니다.
- (2) 지역 state: `state()`는 `push_derived_source`로 현재 derived의 `derived_sources`에 기록되므로 쓰기는 허용됩니다(외부에 영향이 없으므로). 그러나 `get`은 `derived_sources`에 있는 signal을 읽으면 `state_unsafe_local_read`를 던집니다. 읽으면 derived가 자기가 만든 source에 의존하게 되는데, 다음 계산에서는 그 source가 새로 만들어지므로 의존 관계가 의미가 없고 자기 자신을 무효화하는 순환이 생길 수 있기 때문입니다. `untrack`으로 읽으면 `active_reaction`이 `null`이 되어 검사를 통과합니다.
- (3) bonus는 `root()` 밖에서 실행되므로 `component_context`가 `null`이고 `is_runes()`가 `false`입니다. 따라서 `set`의 검사 조건이 성립하지 않습니다. 이 검사는 runes 모드 컴포넌트 안에서만 동작합니다.
- 근거: `svelte/packages/svelte/src/internal/client/reactivity/sources.js:64-66`, `:105-115`, `:136-149`; `svelte/packages/svelte/src/internal/client/runtime.js:87-99`, `:164-166`, `:739-741`. 관련 테스트는 `svelte/packages/svelte/tests/signals/test.ts:698-707`입니다.

## 2-E. 깊은 반응성: proxy

### Q2.22 proxy는 원본을 수정하지 않는다 (10-proxy-object)

- 실제 출력: `raw.a = 1 / p.a = 10`, `p.nested === raw.nested ? false`, `proxy(p) === p ? true`, `p[STATE_SYMBOL] === raw ? true`입니다.
- `set` trap은 값을 프로퍼티별 source에 `set(s, proxy(value, metadata))`로 저장할 뿐, `target[prop] = value`나 `Reflect.set`을 호출하지 않습니다(setter가 있는 경우에만 setter를 호출합니다). 그래서 원본은 바뀌지 않습니다.
- 의도는 `defineProperty` trap의 주석에 있습니다. 값을 target에 쓰지 않아야 "state can be forked", 즉 원본을 공유하면서 상태를 분기할 수 있고, Proxy invariant 문제도 피할 수 있습니다. 학습자가 "원본 객체를 오염시키지 않는다", "source가 진실의 원천이다"라는 취지로 답하면 정답입니다.
- `p.nested`는 `get` trap이 source를 지연 생성할 때 `proxy(target[prop], metadata)`로 감싼 새 Proxy이므로 `raw.nested`와 다릅니다.
- `STATE_SYMBOL`의 두 용도: (1) `proxy()`가 `STATE_SYMBOL in value`로 이미 proxy인지 확인해서 이중 감싸기를 막습니다(`has` trap이 `true`를 반환). (2) `get` trap이 `STATE_SYMBOL`에 대해 원본 `value`를 반환하므로 `get_proxied_value`나 `is`가 원본끼리 비교할 수 있습니다.
- 근거: `svelte/packages/svelte/src/internal/client/proxy.js:24-28`, `:80-82`, `:129-131`, `:137-140`, `:194-196`, `:219-288`, `:324-338`.

### Q2.23 새 키 추가와 객체 교체 (10-proxy-object)

- 실제 출력:
  ```
  initial                    {"reads_a":1,"reads_nested_b":1,"reads_keys":1}
  p.nested.b = 3             {"reads_a":1,"reads_nested_b":2,"reads_keys":1}
  p.c = 1 (new key)          {"reads_a":1,"reads_nested_b":2,"reads_keys":2}
  p.a = 10 (same value)      {"reads_a":1,"reads_nested_b":2,"reads_keys":2}
  p.nested = { b: 3 }        {"reads_a":1,"reads_nested_b":3,"reads_keys":3}
  delete p.c                 {"reads_a":1,"reads_nested_b":3,"reads_keys":4}
  ```
- 새 키: proxy마다 `version` source가 하나 있습니다. `ownKeys` trap은 첫 줄에서 `get(version)`을 호출하므로 키 목록을 읽는 reaction은 `version`에 의존합니다. `set` trap은 키가 새로 생길 때(`!has`), `deleteProperty`는 키를 지울 때 `update_version(version)`을 호출합니다. 기존 키의 source만으로는 "키 집합이 바뀌었다"를 표현할 수 없으므로 별도 source가 필요합니다.
- 객체 교체: `Object.keys`는 명세상 `ownKeys` 뒤에 각 키의 열거 가능 여부를 확인하려고 `getOwnPropertyDescriptor` trap을 호출합니다. 이 trap은 `descriptor.value = get(s)`로 값 source를 읽으므로, `Object.keys(p)`를 읽는 effect는 `a`, `nested`, `c`의 값 source에도 의존하게 됩니다. `p.nested`에 새 객체를 넣으면 `nested` source의 값(새 proxy)이 바뀌므로 다시 실행됩니다. `p.nested.b = 3`은 안쪽 proxy의 source만 바꾸므로 영향이 없고, `p.a = 10`은 같은 값이라 `equals`에서 걸러집니다.
- 근거: `svelte/packages/svelte/src/internal/client/proxy.js:39`, `:166-187`, `:270-285`, `:290-305`, `:313-319`, `:117-118`.

### Q2.24 배열과 length (11-proxy-array)

- 실제 출력:
  ```
  initial                {"reads_length":1,"reads_first":1,"reads_last":1} → [1,2]
  arr.push(3)            {"reads_length":2,"reads_first":1,"reads_last":2} → [1,2,3]
  arr[0] = 1 (same)      {"reads_length":2,"reads_first":1,"reads_last":2} → [1,2,3]
  arr[5] = 6 (hole)      {"reads_length":3,"reads_first":1,"reads_last":3} → [1,2,3,null,null,6]
  arr.length = 0         {"reads_length":4,"reads_first":2,"reads_last":4} → []
  ```
- (1) `length`는 주석대로 "mutations to the array are properly synced with our proxy"를 위해 미리 만듭니다. proxy는 원본 배열에 쓰지 않으므로(Q2.22) 원본의 `length`는 바뀌지 않습니다. 따라서 길이는 처음부터 source로 관리해야 하고, 인덱스에 쓸 때(`n >= ls.v`)나 인덱스를 지울 때 이 source를 함께 갱신해야 합니다. 지연 생성하면 첫 읽기 전에 일어난 인덱스 쓰기를 길이에 반영할 수 없습니다.
- (2) `arr.push(3)`은 명세상 `arr[2] = 3`과 `arr.length = 3` 두 번의 `[[Set]]`을 일으키므로 `set` trap이 두 번 호출됩니다. 첫 호출에서 새 인덱스이므로 `length` source를 3으로 올리고 `version`을 갱신합니다. 두 번째 호출의 `length = 3`은 같은 값이라 `equals`에서 걸러집니다. `reads_first`는 `arr[0]` source가 바뀌지 않았으므로 다시 실행되지 않습니다.
- (3) `arr.length = 0`: `set` trap의 224~237줄이 `value`(0)부터 이전 길이까지 각 인덱스의 source를 `UNINITIALIZED`로 설정합니다. `arr[0]` source가 바뀌므로 `reads_first`가 다시 실행되고, `get` trap은 `UNINITIALIZED`를 `undefined`로 돌려줍니다. 이후 `length` source도 0이 됩니다.
- 근거: `svelte/packages/svelte/src/internal/client/proxy.js:41-45`, `:160`, `:224-237`, `:249-252`, `:270-285`.

---

## 체크포인트 채점 기준 (`/quiz 02`)

1. 표시 단계와 실행 단계: `internal_set` → `mark_reactions`(직접 reaction은 `DIRTY`, 그 아래는 `MAYBE_DIRTY`, effect는 `schedule_effect`) → microtask 또는 `flushSync` → `flush_queued_root_effects` → `process_effects`(render effect 실행, effect 수집) → `flush_queued_effects` → `check_dirtiness` → `update_effect`. derived는 이 흐름 밖에서 `get`이 pull합니다.
2. `DIRTY`는 "직접 의존하는 source가 확실히 바뀌었다", `MAYBE_DIRTY`는 "중간 derived가 바뀌었을 수도 있으니 확인하라", `CLEAN`은 "최신이다"(root/branch에서는 "하위에 할 일이 없다")입니다. 전역 `version`은 "의존성이 나보다 나중에 바뀌었는가"를 판정합니다.
3. `$effect`는 `effect`(비동기, 수집 후 마지막 실행, 컴포넌트 초기화 중에는 `pop`까지 지연)이고, `$effect.pre`와 템플릿 표현식은 `render_effect`/`template_effect`(생성 즉시 실행, flush 때 트리 순회 중 실행)입니다.
4. unowned는 effect 안에서 읽힐 때만 연결되고 항상 `MAYBE_DIRTY`이며, owned는 정상 연결되다가 reader가 없으면 `DISCONNECTED`가 되고 다시 읽힐 때 재연결됩니다. reaction 밖에서 처음 읽힌 owned derived는 부모 effect의 `deriveds` 목록에 들어가 부모가 정리합니다.
5. proxy 프로퍼티 source는 처음 읽거나 쓸 때 만들어지고(`length`만 예외), 쓰기는 원본이 아닌 source를 갱신하며, 키 추가와 삭제는 `version` source를 갱신합니다.
