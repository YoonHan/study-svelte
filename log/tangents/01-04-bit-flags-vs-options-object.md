---
id: T1.4
title: "플래그를 비트로 관리하는 이유"
from: Q1.1
date: 2026-10-13
tags: [compiler, runtime, bundle-size, performance]
status: answered
---

## 질문

`TEMPLATE_USE_IMPORT_NODE` 같은 플래그 값을 비트로 관리하고 비트 연산을 하는 이유는 코드 성능 때문인가, 아니면 다른 이유도 있는가?

## 짧은 답

성능도 이유이지만, 플래그가 쓰이는 곳에 따라 이유가 조금씩 다릅니다. 런타임 객체의 상태 플래그는 메모리와 확인 비용을 줄이려는 것이고, 컴파일 결과에 들어가는 플래그는 여기에 더해 **번들 크기**를 줄이는 효과가 있습니다. minifier는 옵션 객체의 속성 이름을 줄이지 못하기 때문입니다. 플래그를 늘려도 함수의 매개변수 목록을 바꿀 필요가 없다는 점도 이점입니다.

## 자세히

Svelte에서 비트 플래그는 성격이 다른 두 곳에 쓰입니다.

**1. 컴파일 결과에 들어가는 플래그**

`TEMPLATE_*`, `EACH_*`, `PROPS_*` 같은 플래그는 컴파일러와 런타임이 함께 씁니다. 컴파일러가 숫자로 계산해서 컴파일 결과에 넣고, 런타임이 비트 연산으로 다시 꺼냅니다.

> 근거: `src/constants.js:18-19` (`TEMPLATE_FRAGMENT`, `TEMPLATE_USE_IMPORT_NODE`)

**2. 런타임 객체의 상태 플래그**

`DIRTY`, `CLEAN`, `DESTROYED` 같은 플래그 약 20개가 모든 effect와 derived 객체의 `f` 필드 하나에 함께 저장됩니다. effect 객체는 앱 안에 수천 개가 만들어질 수 있으므로, boolean 필드 20개 대신 숫자 하나에 담으면 객체가 작아지고 상태 확인도 비트 연산 한 번으로 끝납니다.

> 근거: `src/internal/client/constants.js:1-21`, `src/internal/client/runtime.js:504-505` (`effect.f ^= CLEAN`)

### 옵션 객체였다면 무엇이 달라졌을까

처음에는 "같은 옵션인데도 실행할 때마다 새 객체를 만드는 문제"를 떠올렸지만, 이 경우에는 해당하지 않습니다. `var root = $.template(...)`은 컴포넌트 함수 바깥, 즉 모듈 최상위에 있으므로 모듈을 처음 불러올 때 한 번만 실행됩니다. 옵션 객체를 썼더라도 템플릿 하나당 객체는 하나만 생깁니다.

> 근거: `scratch/compiled/11-custom-element.compiled.js:4` (모듈 최상위의 `$.template` 호출)

차이는 실행 비용이 아니라 **전송 비용**에서 납니다. minifier는 지역 변수처럼 모든 참조 위치를 확실히 아는 이름만 줄일 수 있습니다. 속성 이름은 `options.fragment`로도, `options["frag" + "ment"]`처럼 실행 중에 만든 문자열로도 접근할 수 있으므로 minifier가 손대지 않습니다.

## 실험

`scratch/01-bitflag-vs-options-minify.mjs`: 템플릿 50개짜리 모듈을 두 방식으로 만들어 terser로 압축합니다.

```
[비트 플래그] minify 후 2581 bytes   예시: p.template("<p></p> <p></p>",3)
[옵션 객체]   minify 후 4131 bytes   예시: p.template("<p></p> <p></p>",{fragment:!0,use_import_node:!0})
[비트 플래그] minify + gzip 후 228 bytes
[옵션 객체]   minify + gzip 후 269 bytes
```

모듈 이름 `$`는 `p`로, `true`는 `!0`으로 줄었지만 속성 이름은 그대로 남았습니다. 다만 실제 전송에는 gzip이 걸리므로 차이가 크게 줄어듭니다. 이 실험은 템플릿 50개가 모두 같아서 gzip이 유난히 잘 압축하는 경우입니다. 그러니 비트 플래그를 택한 이유는 전송 크기 하나라기보다 여러 이점이 겹친 결과로 보는 편이 맞습니다.

## 더 볼 것

- 실제로 이 선택을 한 PR이나 토론이 있는지는 확인하지 않았습니다. 5단계(코드 고고학)에서 추적할 수 있습니다.
