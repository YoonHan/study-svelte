---
id: T1.6
title: "컴파일러가 함수 호출을 보수적으로 판단하는 이유"
from: Q1.2
date: 2026-10-13
tags: [compiler, reactivity, tradeoff]
status: partial
---

## 질문

`{format(name)}`처럼 상태를 전혀 읽지 않는 함수 호출도 컴파일러는 "바뀔 수 있다"고 보고 `template_effect`를 만든다. 함수 본문이 매개변수만 쓰는지 정도는 컴파일 타임에 분석할 수 있을 것 같은데, 왜 이렇게 보수적으로 판단하는가? Svelte 팀은 이런 트레이드오프를 어떤 근거로 결정했는가?

## 짧은 답

함수 본문만 봐서는 결과가 바뀌는지 알 수 없습니다. 인자로 `$state` 객체가 들어오면 본문이 매개변수만 읽어도 결과가 바뀌는데, 무엇이 들어오는지는 호출하는 쪽에서 정해지기 때문입니다. 그래서 5.0.0의 컴파일러는 **전역 함수를 호출하고 지역 이름을 하나도 참조하지 않는 경우**만 정적으로 보고, 나머지는 모두 동적으로 처리합니다. 잘못 판단해서 생긴 effect는 런타임이 의존성 없음을 확인하고 effect 트리에서 빼므로, 보수적인 판단의 비용은 작습니다. Svelte 팀이 이 결정을 내린 과정은 아직 추적하지 않았습니다.

## 자세히

### 함수 본문 분석만으로는 부족한 이유

처음 세운 기준은 "외부에서 import한 함수가 아니고, 본문이 자체 선언한 변수와 매개변수로만 이루어져 있으면 결과가 바뀌지 않는다"였습니다. 이 기준은 다음 예제에서 깨집니다.

```svelte
<script>
	let counter = $state({ count: 0 });
	function format(n) { return `#${n.count}`; }
</script>

<p>call: {format(counter)}</p>
```

`format`은 매개변수만 쓰지만, 인자 `counter`가 반응형 객체라서 `n.count`를 읽는 동작이 곧 상태를 읽는 동작이 됩니다. 버튼으로 `counter.count`를 바꾸면 텍스트도 바뀌어야 합니다. 이런 경우를 모두 가려내려면 프로그램 전체의 데이터 흐름을 추적해야 합니다.

### 5.0.0 컴파일러의 실제 규칙

함수 호출을 만나면 컴파일러는 두 가지를 확인합니다. 호출하는 함수가 "순수"한지(`is_pure`), 그리고 식 안에 의존성이 있는지입니다. 둘 중 하나라도 걸리면 `has_call`과 `has_state`를 켭니다.

> 근거: `src/compiler/phases/2-analyze/visitors/CallExpression.js:173-181` (조건은 `:178`)

`is_pure`는 함수 이름이 컴포넌트 스코프에 **선언되어 있지 않으면**, 즉 `Math` 같은 전역이면 `true`를 돌려줍니다. 함수의 본문은 분석하지 않습니다.

> 근거: `src/compiler/phases/2-analyze/visitors/shared/utils.js:183-198` (`binding === null`이면 `true`, `:193`)

의존성은 식 안에서 컴포넌트 스코프에 선언된 이름을 참조할 때마다 추가됩니다. `$state`인지 `const`인지는 따지지 않습니다.

> 근거: `src/compiler/phases/2-analyze/visitors/Identifier.js:90-93`

그 결과는 다음과 같습니다.

| 식 | `is_pure` | 지역 의존성 | 결과 |
|---|---|---|---|
| `{Math.max(1, 2)}` | `true` (전역) | 없음 | 정적: `textContent` |
| `{String(name)}` (`name`은 `const`) | `true` (전역) | 있음 | 동적: `template_effect` |
| `{format(name)}` (`format`은 지역 함수) | `false` | 있음 | 동적: `template_effect` |
| `{Math.max(count, 1)}` (`count`는 `$state`) | `true` (전역) | 있음 | 동적: `template_effect` |

`CallExpression.js`의 TODO 주석도 "의존성이 있으면 모두 상태로 가정하는데 실제로는 그렇지 않을 수 있다"고 인정하며, 거짓 양성을 감수하는 트레이드오프라고 적고 있습니다.

### 보수적인 판단의 비용

정적인 것을 동적으로 잘못 판단하면 effect가 하나 더 생길 뿐 화면은 정상입니다. 반대로 동적인 것을 정적으로 잘못 판단하면 화면이 갱신되지 않는 버그가 됩니다. 그래서 컴파일러는 확신할 수 없으면 동적으로 판단합니다.

그리고 런타임이 이 비용을 다시 줄여 줍니다. effect를 처음 실행한 뒤 의존성(`deps`)도 DOM도 정리 함수도 없으면, 그 effect는 effect 트리에 아예 추가하지 않습니다. 런타임은 함수가 순수한지 모르지만, 실행해 보고 실제로 읽은 상태를 기준으로 판단하기 때문에 정확합니다.

> 근거: `src/internal/client/reactivity/effects.js:137-145`, `template_effect`는 `block()`을 거쳐 `sync = true`로 만들어짐(`effects.js:322-337`)

정리하면 컴파일러는 보수적으로, 런타임은 실행 결과를 기준으로 정확하게 판단하는 역할 분담입니다.

## 실험

| 원본 | 컴파일 결과 | 확인한 것 |
|---|---|---|
| `scratch/03b-static-call.svelte` | `scratch/compiled/03b-static-call.compiled.js` | `{format(name)}` → 동적 |
| `scratch/03c-global-call.svelte` | `scratch/compiled/03c-global-call.compiled.js` | `{Math.max(1, 2)}` → 정적, `{String(name)}` → 동적 |
| `scratch/03d-global-call-with-state.svelte` | `scratch/compiled/03d-global-call-with-state.compiled.js` | `{Math.max(count, 1)}` → 동적 |

## 더 볼 것

- **열린 질문**: Svelte 팀이 프로그램 전체의 데이터 흐름 분석 대신 이 규칙을 택한 근거. `CallExpression.js:174-177`의 TODO 주석이 https://github.com/sveltejs/svelte/issues/13266 을 가리킵니다. 5단계에서 추적합니다(`PROGRESS.md` 백로그).
