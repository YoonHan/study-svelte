---
id: T1.8
title: "요소 사이의 공백 한 칸"
from: Q1.3
date: 2026-10-14
tags: [compiler, whitespace, html]
status: answered
---

## 질문

템플릿 문자열을 보면 요소 사이에 공백이 한 칸씩 들어 있다(`<b>static</b> <i>static</i>`). 공백이 없어도 파서는 해석할 수 있을 텐데, 왜 넣는가?

## 짧은 답

파서를 위한 공백이 아니라, 원본에 있던 줄바꿈과 들여쓰기를 **화면 결과가 같은 가장 짧은 형태**로 줄여서 남긴 것입니다. 인라인 요소 사이의 공백은 화면에 보이므로 완전히 지우면 `static static`이 `staticstatic`으로 바뀝니다. 반대로 줄바꿈과 들여쓰기는 화면에서 어차피 공백 한 칸으로 보이므로 여러 글자를 그대로 남길 필요가 없습니다.

## 자세히

원본에서 `</b>`와 `<i>` 사이에는 줄바꿈 문자와 들여쓰기가 있습니다. HTML에서는 이런 공백 문자도 텍스트 노드가 됩니다.

```svelte
<b>static</b>
<i>static</i>
```

컴파일러는 이 공백만 있는 텍스트를 다음 규칙으로 정리합니다.

- 맨 앞과 맨 뒤의 공백은 지웁니다.
- 노드 사이에 있는 공백만으로 된 텍스트는 공백 한 칸으로 줄입니다.
- `td`, `option`, `head`처럼 공백이 의미 없는 요소 안에서는 아예 지웁니다.

> 근거: `src/compiler/phases/3-transform/utils.js:130-135` (`clean_nodes`의 주석)

HTML은 소스의 줄바꿈도 공백 한 칸처럼 다루므로, 원본처럼 줄바꿈이 있어도 화면에는 `static static`이 한 줄로 보입니다. 처음에는 두 줄로 보일 것이라고 착각했는데, 인라인 요소는 블록 요소와 달리 줄을 바꾸지 않습니다.

이 공백 텍스트 노드는 노드 탐색에도 영향을 줍니다. `09-anchors`에서 `<em>`에 도달하는 `$.sibling(text, 5)`의 `5`는 `<b>` → 공백 → `<i>` → 공백 → `<em>`처럼 공백 노드까지 세어서 나온 숫자입니다(Q1.3).

## 실험

브라우저 주소창에서 확인할 수 있습니다. `%0A`는 줄바꿈 문자입니다.

```
data:text/html,<b>static</b> <i>static</i>     → static static
data:text/html,<b>static</b>%0A<i>static</i>   → static static
data:text/html,<b>static</b><i>static</i>      → staticstatic
```

## 더 볼 것

- 컴파일 옵션 `preserveWhitespace`를 켜면 이 정리를 하지 않습니다. 출력이 어떻게 달라지는지는 아직 비교하지 않았습니다.
