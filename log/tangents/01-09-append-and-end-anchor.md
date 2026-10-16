---
id: T1.9
title: "append라는 이름과 끝 표시 anchor"
from: Q1.4
date: 2026-10-16
tags: [runtime, dom, anchor, naming]
status: answered
---

## 질문

`$.append(anchor, dom)`의 구현은 `anchor.before(dom)`, 즉 anchor의 앞에 넣는 것이다. 그렇다면 함수 이름이 `prepend`여야 하는 것 아닌가? 왜 `append`인가?

## 짧은 답

Svelte에서 anchor는 어떤 구역의 **끝**을 표시하는 노드입니다. 그렇게 보면 "anchor의 앞에 넣기"는 "그 구역의 맨 끝에 덧붙이기"가 되므로 `append`라는 이름이 자연스럽습니다. 이름의 의도를 설명하는 주석은 없지만, anchor가 실제로 구역의 끝에 놓인다는 사실은 마운트 결과로 확인했습니다.

## 자세히

`append`는 hydration 중이 아니면 `anchor.before(dom)`을 실행합니다.

> 근거: `src/internal/client/dom/template.js:239-252` (`anchor.before`는 `:251`)

컴포넌트를 마운트할 때 `_mount`는 대상 요소에 빈 텍스트 노드를 하나 붙이고, 이 노드를 컴포넌트 함수의 첫 번째 인자 `$$anchor`로 넘깁니다.

> 근거: `src/internal/client/render.js:229` (`target.appendChild(create_text())`), `:249` (`Component(anchor_node, props)`)

컴포넌트 함수는 마지막에 `$.append($$anchor, fragment)`를 실행하므로, 컴포넌트의 DOM 전체가 이 빈 텍스트 노드의 앞에 들어갑니다. 그래서 빈 텍스트 노드는 마운트 기록에서는 가장 먼저 삽입되지만, 마운트가 끝난 뒤에는 대상 요소의 맨 마지막 자식이 됩니다.

같은 구조가 블록에서도 반복됩니다. `{#if}` 블록은 템플릿 안의 `<!>`를 anchor로 받고, 내용을 그 앞에 삽입합니다.

> 근거: `src/internal/client/dom/blocks/if.js:27` (`anchor = node`), `:64` (`consequent_fn(anchor)`)

모두 끝 표시 노드를 먼저 두고 내용은 그 앞에 넣는 방식입니다. 이 방식 때문에 템플릿이 블록의 anchor로 시작하면, 블록 내용이 컴포넌트의 시작 노드보다 앞에 놓이는 문제가 생깁니다. `template()`이 앞에 `<!>`를 하나 더 붙이는 이유가 여기에 있습니다(Q1.4).

## 실험

`08-blocks.svelte`를 마운트한 기록과 마운트 후의 노드 순서입니다.

```
── mount ─────────────────────────────
  insert    ""  (into #app)          ← 가장 먼저 삽입
  insert    <!---->  (into #app)
  ...

마운트 후 #app: 첫 노드 <!---->  / 마지막 노드 ""  / 전체 13개
```

> 근거: `scratch/compiled/08-blocks.mount.txt`. 마운트 후 노드 순서는 jsdom에서 일회성으로 확인했습니다.

## 더 볼 것

- `{#each}` 블록도 같은 구조인지는 Q1.18에서 확인합니다.
