# Svelte 5 Internals Study

Svelte 5의 내부 구현을 질문 중심으로 스스로 공부하기 위한 학습 환경입니다. 컴파일 결과물을 먼저 관찰하고, 런타임의 signal 시스템과 DOM 계층을 읽은 뒤에 컴파일러로 넘어갑니다. 마지막으로 git 이력과 PR을 통해 5.0.0 이후의 설계 변경을 추적합니다.

학습 기준 버전은 `svelte@5.0.0`입니다. 5.x 후반부에 들어간 비동기 지원(`batch.js` 등) 때문에 최신 코드는 처음 읽기에 복잡도가 높으므로, 뼈대가 가장 단순한 5.0.0에서 시작합니다.

## 시작하기

```bash
node tools/setup.mjs   # svelte/ 에 clone → study/5.0.0 브랜치 생성 → 의존성 설치 → signal 테스트 실행
```

이미 설정되어 있다면 이 단계는 건너뛰어도 됩니다. Node 22.15 이상이 필요합니다(`tools/loader.mjs`가 `module.registerHooks`를 사용합니다).

그다음 [`curriculum/00-overview.md`](curriculum/00-overview.md)를 읽고 1단계부터 시작합니다.

## 디렉터리 구조

| 경로 | 내용 |
|---|---|
| `curriculum/` | 단계별 질문지입니다. `00-overview.md`에 전체 로드맵과 학습 방법이 있습니다. |
| `notes/` | 질문에 대한 답을 직접 적는 노트입니다. 튜터가 채점할 때 이 파일을 읽습니다. |
| `labs/` | Node로 바로 실행하는 실험 스크립트입니다. `labs/lib/signals.mjs`는 Svelte 런타임의 signal API를 감싼 헬퍼입니다. |
| `playground/` | 실험용 `.svelte` 컴포넌트입니다. |
| `tools/` | 컴파일 결과 출력, jsdom 마운트 등 학습 도구입니다. |
| `svelte/` | Svelte 레포 전체 이력입니다(`study/5.0.0` 브랜치). git으로 추적하지 않습니다. |
| `PROGRESS.md` | 진행 상황, 막힌 질문, 스스로 떠올린 질문을 기록합니다. |
| `CLAUDE.md`, `.claude/` | Claude Code를 튜터로 동작하게 하는 설정과 채점 기준입니다. |

## 도구

```bash
# 컴파일 결과 보기 (client, production)
node tools/compile.mjs playground/Counter.svelte
node tools/compile.mjs playground/Counter.svelte --server   # SSR 출력
node tools/compile.mjs playground/Counter.svelte --dev      # dev 모드 출력
node tools/compile.mjs playground/Counter.svelte --ast      # parse 결과 (modern AST)
node tools/compile.mjs playground/Counter.svelte --legacy   # runes를 끈 Svelte 4 방식
node tools/compile.mjs playground/Counter.svelte --watch    # 저장할 때마다 다시 출력

# jsdom에 마운트하고, 각 단계에서 일어난 DOM 변경을 출력
node tools/mount.mjs playground/Counter.svelte --script labs/03-dom/counter.steps.mjs

# signal 그래프를 직접 만들고 내부 상태(flags, version, deps, reactions) 관찰
node labs/02-signals/00-hello.mjs

# Svelte 자체 테스트 (svelte/ 디렉터리에서)
cd svelte && npx -y pnpm@9.4.0 test signals
```

`tools/`와 `labs/`는 모두 `svelte/packages/svelte/src`를 직접 import합니다. 따라서 런타임이나 컴파일러 소스에 `console.log`나 `debugger`를 넣으면 실험 결과에 바로 반영됩니다. 실험이 끝나면 `git -C svelte diff`로 수정 내역을 확인하고 `git -C svelte checkout -- <file>`로 되돌립니다.

브라우저에서 확인하고 싶다면 Svelte 레포에 포함된 sandbox를 사용합니다.

```bash
cd svelte/playgrounds/sandbox && npx -y pnpm@9.4.0 dev   # src/main.svelte 를 수정하며 확인
```

## 튜터 사용법

이 디렉터리에서 Claude Code를 실행하면 `CLAUDE.md`에 따라 튜터로 동작합니다. 튜터는 정답을 바로 알려 주지 않고 질문과 힌트로 안내합니다.

| 명령 | 동작 |
|---|---|
| `/hint Q2.3` | 질문지에 있는 힌트보다 한 단계 더 구체적인 힌트를 줍니다. |
| `/check Q2.3` 또는 `/check 02` | `notes/`에 적은 답을 실제 코드와 대조해서 채점하고, 후속 질문을 던집니다. |
| `/quiz 02` | 코드를 보지 않고 설명할 수 있는지 구술 시험 방식으로 확인합니다. |

정답이 꼭 필요할 때는 "정답 알려줘"라고 명시적으로 요청하면 됩니다.
