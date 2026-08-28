# kit — AGENTS.md

이 파일은 `kit.code0987.me/v1/app.css`를 쓰는 모든 서비스의 UI를 짤 때 읽는 계약이다. 사람이 아니라 AI가 읽는다 — 산문 설명 대신 표와 목록으로 구성한다. 원본: `bundle/src/safelist.css`(허용 클래스 전체), `tokens/tokens.css`(토큰), `docs/2026-08-28-kit-design.md`(스펙), `docs/2026-08-28-pilot-report.md`(파일럿에서 드러난 함정).

## 0. 가장 먼저 알아야 할 것 — 조용한 실패

**틀린 클래스를 써도 에러가 안 난다. 그냥 스타일이 안 먹는다.** 원인은 두 가지이고 겉보기 증상이 동일하다.

1. **safelist에 없는 클래스** — kit은 서비스 마크업을 스캔하지 않는 중앙 선컴파일 방식이다. §3의 허용 목록에 없는 클래스는 번들 자체에 존재하지 않는다.
2. **레이어 우선순위** — kit의 모든 클래스는 `@layer components`/`@layer utilities` 안에 있다. 서비스 CSS에 `@layer`로 감싸지 않은 전역 리셋(`*{margin:0}` 등)이 하나라도 있으면, CSS Cascading Layers 규칙상 그 리셋은 **명시도와 무관하게** kit의 어떤 클래스보다 항상 이긴다. 클래스가 마크업에 정확히 붙어 있고 번들에도 존재하는데 효과가 없다면 이것을 의심한다. 해결: 서비스 CSS의 **전역 리셋만**(스타일시트 전체가 아니라) `@layer base { ... }`로 감싼다 — kit도 `base` 레이어를 쓰고 kit의 `<link>`가 먼저 로드되므로, 감싼 뒤에도 소스 순서상 서비스 쪽이 여전히 이긴다. 서비스가 kit을 오버라이드하려는 `.btn`/`.card`/`.input` 같은 규칙은 감싸지 않고 레이어 없이 남긴다 — 그것까지 감싸면 이번엔 kit의 `@layer components`가 서비스를 이기기 시작한다(우선순위 역전).

이 서비스에 체크박스/라디오/토글이 있다면 §5를 먼저 본다 — kit에 대응 컴포넌트가 없다.

## 1. kit의 `<link>`를 붙이는 순간 이미 화면이 바뀐다 — Tailwind Preflight

**kit은 Tailwind v4 기반이라 번들에 Tailwind의 표준 Preflight(전역 리셋)가 통째로 들어 있다.** `<link>` 하나만 붙여도, 토큰이든 유틸리티든 아무것도 아직 안 썼어도, 다음이 즉시 적용된다.

| 리셋 대상 | 규칙(요약) | 눈에 보이는 효과 |
|---|---|---|
| 전체 | `*,::before,::after{box-sizing:border-box}` | 대개 무해 |
| 여백·테두리 | `*{margin:0;padding:0;border:0 solid}` | 브라우저 기본 여백이 있던 모든 요소(`p`,`h1`,`ul`,`body` 등)가 붙어버린다 |
| 헤딩 | `h1`~`h6{font-size:inherit;font-weight:inherit}` | 헤딩이 본문과 같은 크기·굵기로 줄어든다(유틸리티 클래스로 다시 키워야 한다) |
| 목록 | `ol,ul,menu{list-style:none}` | 불릿·번호가 전부 사라진다 |
| 이미지 계열 | `img,svg,video{display:block}` | 인라인 여백(baseline gap)이 없어진다 |
| 링크 | `a{text-decoration:inherit}` | 기본 밑줄이 사라진다(부모의 `text-decoration`을 물려받는다) |

**이것이 스펙 §9.1의 마이그레이션 절차 0단계다.** "`:root` 토큰만 바꾸니 HTML·JS 무변경, 안전하고 눈에 안 띄는 단계"라고 생각하고 `<link>`부터 걸면, 그 순간 헤딩이 작아지고 리스트 마커가 사라지고 링크 밑줄이 없어지는 걸 보고 당황하게 된다 — 원인은 아직 손대지 않은 토큰이 아니라 이 Preflight다. 서비스가 자기 헤딩·리스트 스타일을 이미 갖고 있다면(§0의 레이어 규칙을 따랐을 때) 그 규칙이 나중에 로드되어 이기므로 최종 결과는 바뀌지 않지만, **그 사이 낙차를 스크린샷으로 미리 확인하지 않으면 무엇이 kit 탓이고 무엇이 서비스 CSS 누락 탓인지 구분할 수 없다.** `agent-gate` 파일럿은 자체 전역 리셋을 이미 갖고 있어 이 낙차가 드러나지 않았다 — 다음 대상 `itad`는 `*{box-sizing:border-box}` 하나뿐이라 헤딩·리스트가 브라우저 기본값에 의존하므로, `<link>`를 붙이는 즉시 이 표의 효과를 전부 체감한다.

Preflight는 kit에서 뺄 수 없다(Tailwind v4를 쓰는 이상 전제조건, 스펙 §3). **`<link>`를 붙이기 전/후로 반드시 강제 새로고침 스크린샷을 남긴다.**

## 2. 토큰 (`--color-*`, CSS 변수 겸 유틸리티 접두사)

| 이름 | 값(oklch) | 용도 |
|---|---|---|
| `bg` | 0.145 0.005 285 | 페이지 배경 |
| `surface` | 0.185 0.006 285 | 카드·패널 |
| `surface-2` | 0.225 0.007 285 | 카드 안 카드 |
| `border` | 0.300 0.008 285 | 일반 경계선 |
| `border-strong` | 0.400 0.010 285 | 강조 경계선, input 기본 |
| `text` | 0.970 0.000 285 | 본문 텍스트 |
| `muted` | 0.720 0.012 285 | 보조 텍스트 (본문도 가능, AA 통과) |
| `dim` | 0.560 0.012 285 | **라벨·비활성 전용. 본문에 쓰지 않는다** (AA 미보장, AA-Large만) |
| `accent` | 0.780 0.130 185(서비스별 hue 다름) | 강조. 서비스가 `--color-accent` 재정의 가능 |
| `on-accent` | 0.160 0.010 285 | accent 배경 위 텍스트 |
| `success` / `warning` / `danger` | — | 의미색. bg 위 3:1 이상 보장 |

표면 계단은 `bg < surface < surface-2 < border < border-strong` 순으로 L값이 단조 증가한다 — 구분이 필요하면 이 순서를 따라 올라간다.

**규칙: `bg-accent` 위의 텍스트는 반드시 `text-on-accent`를 쓴다.** `text-text`(1.72:1)를 포함해 다른 어떤 텍스트 토큰도 `bg-accent` 위에서 AA를 보장하지 않는다 — accent는 서비스별로 hue가 바뀌는 토큰이라(§7) 조합을 눈으로 검증하기 어렵고, `bg-accent`와 `text-text`가 둘 다 safelist에 있어 이 조합 자체를 막는 장치가 safelist 수준에는 없다. `on-accent`만 12개 서비스 accent 전부에서 AA 통과가 테스트로 보장돼 있다(`tests/tokens.test.mjs`).

**금지: Tailwind 기본 팔레트 전체** (`bg-red-500`, `text-gray-400`, `bg-zinc-900` 등). 번들에 없다 — 색이 필요하면 항상 위 토큰 중 하나를 쓴다. 서비스마다 자기 빨강을 고르는 것을 막기 위한 정책 결정이다(스펙 §3).

**금지: 임의값** (`text-[13px]`, `bg-[#ff0000]`). 선컴파일 방식에서 원리적으로 생성 불가능하다 — safelist에 없는 게 아니라 애초에 만들 수 없다. 탈출구는 서비스 자체 CSS에서 `var(--color-surface)` 등 토큰 변수를 직접 쓰는 것뿐이다.

### 2.1 폰트

**Noto Sans KR / Noto Sans Mono는 번들의 `@import` 한 줄이 자동으로 로드한다** (`bundle/src/app.css` 최상단, Google Fonts CSS2). `--font-sans`/`--font-mono` 토큰이 이 폰트를 가리키므로, kit의 `<link>` 하나만 걸면 폰트도 함께 로드된다 — 서비스가 폰트 `<link>`를 따로 추가할 필요가 없다. 속도가 중요하면 자체 `preconnect` 힌트(`fonts.googleapis.com`, `fonts.gstatic.com`)를 추가하는 것은 여전히 유효하지만 필수는 아니다.

## 3. 허용 유틸리티 (safelist 요약 — 정확한 목록은 `bundle/src/safelist.css`)

| 축 | 값 |
|---|---|
| 색 유틸리티 | `{bg,text,border}-{위 토큰 이름}` + `hover:/focus-visible:/active:/disabled:/group-hover:` variant |
| 간격 (p/m/gap, 방향별) | `0 0.5 1 1.5 2 2.5 3 3.5 4 5 6 8 10 12 16` (4px 배수 + 하프스텝 2px) |
| `space-x/y` | `0 1 2 3 4 6 8` |
| 타이포 크기 | `text-xs`~`text-7xl` |
| font-weight | `light normal medium semibold bold` |
| leading / tracking | `tight snug normal relaxed` / `tight normal wide` |
| 레이아웃 | flex/grid/position/z/overflow 전반, `grid-cols-{1..6,12}`, `col-span-{1..4,full}` |
| `w` | 숫자 `4 5 6 8 10 11 12 16 20 24 32 48 64` + `full auto fit screen` + 분수 `w-{1/2,1/3,2/3,1/4,3/4}` |
| `h` | 숫자 `4 5 6 8 10 11 12 16 20 24 32 48 64` + `full auto fit screen` (분수 없음) |
| `min-w` | 숫자 `4 5 6 8 10 11 12 16 20 24 32 48 64` + `0 full` **만** (`auto`/`fit`/`screen` 없음) |
| `min-h` | 숫자 `4 5 6 8 10 11 12 16 20 24 32 48 64` + `0 full screen` **만** (`auto`/`fit` 없음 — `min-w`와 다르게 `screen`은 있다) |
| `size` | 숫자 `4 5 6 8 10 11 12` **만** (16 이상 없음, `full`/`auto`/`fit`/`screen` 전부 없음) |
| `max-h` | `full screen` 만 (숫자 스케일 없음) |
| max-w | `xs sm md lg xl 2xl 3xl 4xl 5xl full none` (임의 px 없음 — 가장 가까운 값을 고른다) |
| 형태 | `rounded{,-xs,-sm,-md,-lg,-xl,-full,-none}`, `border{,-0,-2,-t,-r,-b,-l}`, `shadow-{sm,md,lg,none}` |
| 기타 | `opacity-{0,40,50,60,75,100}`, `cursor-pointer/not-allowed`, `transition{,-colors,-opacity,-transform}`, `duration-{100,150,200,300}` |
| 텍스트 처리 | `break-words/all/normal`, `text-balance/pretty/ellipsis`, `whitespace-{normal,pre,pre-wrap}`, `sr-only`, `font-{sans,mono}` |
| 구분선·기타 | `divide-{y,x}` + `divide-{border,border-strong}`, `-m{t,b,l,r,x,y}-{1,2,3,4}`, `ring-{0,1,2}` + `ring-{accent,border,danger}` |
| variant | `hover: focus-visible: active: disabled: group-hover: md: lg:` — **`sm:`/`xl:`는 의도적으로 없다**(§3.1) |

### 3.1 `md:`/`lg:`가 커버하는 범위 (breakpoint당)

레이아웃 스위치 4개뿐 아니라 아래 축도 `md:`/`lg:` 두 breakpoint에서 쓸 수 있다.

| 축 | `md:`/`lg:`로 쓸 수 있는 값 |
|---|---|
| 레이아웃 표시 | `block flex grid hidden` |
| grid | `grid-cols-{1,2,3,4}`, `col-span-{1,2,3,4,full}` |
| flex 방향 | `flex-row flex-col` |
| 정렬 | `items-{start,center,end,stretch}`, `justify-{start,center,end,stretch,between,around,evenly}` |
| 너비 | `w-full w-auto` |
| 간격(p/px/py/m/mx/my/gap) | 기본 스케일과 동일: `0 0.5 1 1.5 2 2.5 3 3.5 4 5 6 8 10 12 16` |
| 텍스트 크기 | `text-{sm,base,lg,xl,2xl}` |

`sm:`/`xl:`는 없다 — 스펙 초안은 넷 다 나열했지만 실제로 필요했던 사례가 지금까지 하나도 없었다(agent-gate 파일럿도 md:/lg:까지만 요구했다). §0 조용한 실패의 원칙을 breakpoint 축에도 그대로 적용해, 쓰이지도 않을 것을 미리 만들어 "이걸 써도 되나?"라는 잘못된 신호를 주지 않기로 했다. 필요해지면 그때 스케일 단위로(위 표와 동일한 범위로) 추가한다 — `sm:p-4` 같은 개별 클래스를 먼저 써보고 되는지 확인하지 않는다.

**`rounded-sm` 대신 `rounded-xs`를 쓸 때가 있다.** 서비스 `:root`가 `--radius-sm`을 자체 재정의하면 (agent-gate가 8px로 재정의한 실례가 있다) `rounded-sm`이 kit이 의도한 4px가 아니라 그 값을 낸다. 정확히 4px가 필요하면 `rounded-xs`(kit이 통제하는 `--radius-xs`, 서비스가 거의 재정의하지 않는 이름)를 쓴다. 이 문제는 Tailwind가 직접 생성하는 `rounded*` 유틸리티에만 해당한다 — kit 컴포넌트 클래스(`.btn`/`.card`/`.input`/`.alert`)의 radius는 §4.1에서 별도로 보호된다.

목록에 없는 클래스가 필요하면 **추측해서 쓰지 않는다.** §0의 조용한 실패를 겪는다. `bundle/src/safelist.css`에서 실제 존재를 확인하거나, 없으면 스케일 단위로 추가를 요청한다(개별 클래스 하나만 추가하면 같은 이유로 다시 구멍이 생긴다).

## 4. 컴포넌트 클래스 (`@layer components`)

```
.btn  .btn-primary  .btn-ghost  .btn-danger
.card  .card-header  .card-body
.input  .select  .textarea
.alert  .alert-{ok,warn,danger}
.badge  .badge-{accent,ok,warn,danger}
.table
.empty
.pagination
```

**베이스 클래스만 붙이고 모디파이어를 빠뜨리면 조용히 반쪽짜리가 렌더된다** — 에러도 안 나고 §0의 조용한 실패와 겉보기 증상이 비슷하다.

- **베이스+모디파이어 둘 다 필요**: `.alert`(베이스가 padding·flex·`border-left-width`를 담당, `.alert-ok` 같은 모디파이어 없이 `.alert`만 쓰면 `border-left`가 회색으로 거의 안 보인다)+`.alert-*`; `.badge`(베이스는 padding·모양만, 배경·글자색은 모디파이어가 낸다 — `.badge`만 쓰면 색 없는 투명한 알약이 된다)+`.badge-*`; `.btn`(색은 `.btn-primary`/`.btn-ghost`/`.btn-danger`가 낸다 — `.btn`만 쓰면 테두리가 투명해 보이지 않는다)+`.btn-*`.
- **베이스만으로 완결**: `.card`(배경·테두리·radius가 이미 있다 — `.card-header`/`.card-body`는 모디파이어가 아니라 선택적 자식 구조), `.input`/`.select`/`.textarea`, `.table`, `.empty`, `.pagination`.

`.card-header`는 `display:flex; justify-content:space-between`이다 — 제목과 설명을 한 줄에 넣지 않는다. 제목만 헤더에, 설명은 `.card-body` 첫 줄에 둔다.

### 4.1 `--kit-radius` — 컴포넌트 radius는 소비자의 `--radius` 재정의에서 격리돼 있다

`.btn`/`.card`/`.input`,`.select`,`.textarea`/`.alert`는 내부적으로 공개 토큰 `--radius`가 아니라 프라이빗 토큰 `--kit-radius`(값은 동일하게 `0.625rem`)를 쓴다. 소비 서비스가 자기 `:root`에서 `--radius`를 재정의해도(예: `itad`) 이 컴포넌트들의 모양은 바뀌지 않는다 — 예전에는 바뀌었고, 빠져나갈 방법이 없었다(§9.1의 2번 항목이 원래 경고하던 문제). `--radius` 자체는 여전히 공개 토큰으로 남아 있고, Tailwind가 직접 생성하는 유틸리티 클래스(`rounded`, `rounded-lg` 등)는 계속 `--radius`/`--radius-*`를 참조한다 — 그건 소비자가 자기 페이지의 `rounded` 계열을 바꿀 수 있어야 하는 의도된 동작이므로 그대로 둔다.

## 5. kit에 없는 것 (만들지 않는다, 대체 방법을 쓴다)

| 없는 것 | 상태 | 대체 |
|---|---|---|
| checkbox / radio / toggle 컴포넌트, `accent-*` 유틸리티 | **완전히 없다.** kit의 가장 확실한 반복 구멍 | 서비스 CSS에 최소 규칙만 남긴다: `input[type=checkbox]{accent-color:var(--accent)}` 등. 새로 만들지 않는다 — 이 문서 갱신 시점에는 아직 계획에 없다 |
| 정확한 px 단위 (`max-w-[560px]`, `text-[15px]`) | 원리적으로 불가 (§2) | 가장 가까운 스케일 값으로 근사하거나 서비스 CSS에서 `var(--color-*)`/직접 값 사용 |

## 6. 라이트 테마

없다. kit은 다크 전용이다. 라이트 테마 클래스나 토큰을 요청하지 않는다.

## 7. 서비스별 accent

`<html style="--color-accent: oklch(0.780 0.130 <hue>)">` 한 줄로 재정의한다. L=0.780 고정, hue만 서비스마다 다르다 — 값은 `docs/2026-08-28-kit-design.md` §5.2 표를 따른다(12개 서비스, `novel` 포함). `on-accent`(텍스트)는 재정의하지 않는다 — 모든 서비스 accent 위에서 AA 통과가 이미 테스트로 보장돼 있다. accent 위에 텍스트를 올릴 때는 §2의 규칙대로 `text-on-accent`만 쓴다.
