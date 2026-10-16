---
id: T1.5
title: "textContent와 nodeValue의 차이"
from: Q1.2
date: 2026-10-13
tags: [dom, text, performance]
status: answered
---

## 질문

상태를 읽는 텍스트도 `template_effect` 안에서 매번 `p.textContent = ...`를 실행하면 공백 자리도 `$.child`도 필요 없을 텐데, Svelte는 왜 텍스트 노드의 `nodeValue`를 바꾸는 `set_text`를 쓰는가? 두 방식은 DOM에서 무엇이 다른가?

## 짧은 답

요소에 `textContent`를 대입하면 값을 바꿀 때마다 기존 텍스트 노드를 제거하고 새 노드를 만들어 붙입니다. `nodeValue`를 바꾸면 처음 만든 텍스트 노드를 그대로 두고 내용만 바꿉니다. 두 방식 모두 DOM 변경이지만, `nodeValue` 방식은 노드를 만들고 떼어 내고 다시 붙이는 작업과 버려진 노드를 정리하는 비용을 아낍니다.

## 자세히

Svelte는 동적인 텍스트가 들어갈 자리에 템플릿 단계에서 공백 한 칸짜리 텍스트 노드를 미리 만들어 둡니다(Q1.2). 컴파일된 코드는 `$.child(p)`로 이 노드를 변수에 잡아 두고, 이후 `set_text`로 그 노드의 `nodeValue`만 바꿉니다.

> 근거: `src/internal/client/render.js:50-59` (`set_text`)

`set_text`는 텍스트 노드에 마지막으로 쓴 문자열을 `__t` 필드에 기억해 두고, 새 값이 같으면 DOM에 쓰지 않습니다. `__t`는 런타임 초기화 때 `Text.prototype`에 미리 선언됩니다.

> 근거: `src/internal/client/render.js:54`, `src/internal/client/dom/operations.js:50`

반면 바뀌지 않는 텍스트는 `textContent`로 한 번만 설정하고 끝냅니다. 이 경우에는 텍스트 노드를 붙잡아 둘 필요가 없으므로 템플릿의 `<p>`도 비어 있습니다.

> 근거: `scratch/compiled/03-text-kinds.compiled.js:18` (`p.textContent = ...`), `:21`, `:54` (`$.child`, `$.set_text`)

"DOM 조작 비용이 없다"는 표현은 지나칩니다. `nodeValue` 방식에서도 텍스트 내용이 바뀌면 `characterData` 변경이 기록되고, 브라우저는 그 텍스트를 다시 그려야 합니다. 아끼는 것은 노드의 생성, 제거, 삽입입니다.

## 실험

`scratch/01-textcontent-vs-nodevalue.mjs`: 같은 값을 세 번 바꾸면서 `MutationObserver`로 기록합니다.

```
[textContent] 값을 3번 바꿈
  childList     추가 1개, 제거 1개
  childList     추가 1개, 제거 1개
  childList     추가 1개, 제거 1개
  처음의 텍스트 노드가 그대로 남아 있는가: false

[nodeValue] 값을 3번 바꿈
  characterData 텍스트 노드 내용 변경 (이전 값: " ")
  characterData 텍스트 노드 내용 변경 (이전 값: "state: 1")
  characterData 텍스트 노드 내용 변경 (이전 값: "state: 2")
  처음의 텍스트 노드가 그대로 남아 있는가: true
```

## 더 볼 것

- `__t` 캐시로 같은 값 쓰기를 건너뛰는 동작은 Q1.13에서 다시 다룹니다.
