# kit — AGENTS.md

이 파일은 `kit.code0987.me/v1/app.css`를 쓰는 모든 서비스의 UI를 짤 때 읽는 계약이다. 사람이 아니라 AI가 읽는다 — 산문 설명 대신 표와 목록으로 구성한다. 원본: `bundle/src/safelist.css`(허용 클래스 전체), `tokens/tokens.css`(토큰), `docs/2026-08-28-kit-design.md`(스펙), `docs/2026-08-28-pilot-report.md`(파일럿에서 드러난 함정).

## 0. 가장 먼저 알아야 할 것 — 조용한 실패

**틀린 클래스를 써도 에러가 안 난다. 그냥 스타일이 안 먹는다.** 원인은 세 가지이고 겉보기 증상이 동일하다.

1. **safelist에 없는 클래스** — kit은 서비스 마크업을 스캔하지 않는 중앙 선컴파일 방식이다. §3의 허용 목록에 없는 클래스는 번들 자체에 존재하지 않는다.
2. **레이어 우선순위** — kit의 모든 클래스는 `@layer components`/`@layer utilities` 안에 있다. 서비스 CSS에 `@layer`로 감싸지 않은 전역 리셋(`*{margin:0}` 등)이 하나라도 있으면, CSS Cascading Layers 규칙상 그 리셋은 **명시도와 무관하게** kit의 어떤 클래스보다 항상 이긴다. 클래스가 마크업에 정확히 붙어 있고 번들에도 존재하는데 효과가 없다면 이것을 의심한다. 해결: 서비스 CSS의 **전역 리셋만**(스타일시트 전체가 아니라) `@layer base { ... }`로 감싼다 — kit도 `base` 레이어를 쓰고 kit의 `<link>`가 먼저 로드되므로, 감싼 뒤에도 소스 순서상 서비스 쪽이 여전히 이긴다. 서비스가 kit을 오버라이드하려는 `.btn`/`.card`/`.input` 같은 규칙은 감싸지 않고 레이어 없이 남긴다 — 그것까지 감싸면 이번엔 kit의 `@layer components`가 서비스를 이기기 시작한다(우선순위 역전).

3. **캐시된 옛 번들** — kit 번들은 `max-age=300, stale-while-revalidate=60`으로 서빙된다(2026-08-29 이전에는 swr이 86400이라 최대 24시간이었다). 방금 kit에 추가한 클래스를 쓰는 HTML을 배포하면, 재방문자는 **새 HTML + 최대 6분 묵은 번들**을 받아 그 클래스만 무효가 될 수 있다(스펙 §11.6). kit에 새 클래스를 추가하는 마이그레이션은 **kit을 먼저 배포하고 반영을 확인한 뒤** 서비스 HTML을 배포한다.

   **검증할 때 `Ctrl+Shift+R`을 믿지 않는다.** 교차 출처 서브리소스인 kit 번들은 강제 새로고침으로도 갱신되지 않는 경우가 있다 — 마이그레이션 중 이 때문에 멀쩡한 구현을 두 번 잘못 진단했다. `?cb=<타임스탬프>`를 붙인 프로브 페이지에서 확인하거나, 로드된 번들을 `fetch(href, {cache:'no-store'})`로 다시 받아 비교한다. `curl`도 브라우저 캐시를 공유하지 않으므로 둘이 서로 다른 답을 준다.

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
| `success` / `warning` / `danger` / `info` | — | 의미색. bg 위 3:1 이상 보장(라이트에서는 AA). `info`는 2026-08-29 승격 — `agent-gate`(`.badge.safe`)와 `novel`이 각자 만들어 쓰고 있었다 |

표면 계단은 `bg < surface < surface-2 < border < border-strong` 순으로 L값이 단조 증가한다 — 구분이 필요하면 이 순서를 따라 올라간다.

**규칙: `bg-accent` 위의 텍스트는 반드시 `text-on-accent`를 쓴다.** `text-text`(1.72:1)를 포함해 다른 어떤 텍스트 토큰도 `bg-accent` 위에서 AA를 보장하지 않는다 — accent는 서비스별로 hue가 바뀌는 토큰이라(§7) 조합을 눈으로 검증하기 어렵고, `bg-accent`와 `text-text`가 둘 다 safelist에 있어 이 조합 자체를 막는 장치가 safelist 수준에는 없다. `on-accent`만 모든 서비스 accent에서 AA 통과가 테스트로 보장돼 있다(`tests/tokens.test.mjs`).

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
.checkbox  .radio  .switch
.field  .check-row
.table
.empty
.pagination
```

**이름이 겹치면 조용히 혼종이 된다.** 위 이름은 일부러 일반적이라 서비스가 이미 같은 이름을 쓰고 있을 수 있다(실제로 `agent-gate`·`itad`·`chzzk-auth`·`novel` 5개 서비스에서 11건 겹친다). 서비스 CSS는 레이어 밖이라 **자기가 정의한 속성만** 이기고, 정의하지 않은 속성은 kit이 채운다 — `itad`의 `.btn`은 `display`를 안 정해 kit의 `inline-flex`를, `.badge`는 `font-weight`를 안 정해 kit의 `500`을 물려받았다. 겹치는 목록은 `known-class-collisions.json`에 있고 `pnpm test`가 **새로 생긴 겹침만** 실패시킨다(`node scripts/check-class-collisions.mjs`로 현황을 본다). 서비스 규칙에서 속성을 지울 때 kit 값이 드러난다는 점을 기억한다.

**베이스 클래스만 붙이고 모디파이어를 빠뜨리면 조용히 반쪽짜리가 렌더된다** — 에러도 안 나고 §0의 조용한 실패와 겉보기 증상이 비슷하다.

- **베이스+모디파이어 둘 다 필요**: `.alert`(베이스가 padding·flex·`border-left-width`를 담당, `.alert-ok` 같은 모디파이어 없이 `.alert`만 쓰면 `border-left`가 회색으로 거의 안 보인다)+`.alert-*`; `.badge`(베이스는 padding·모양만, 배경·글자색은 모디파이어가 낸다 — `.badge`만 쓰면 색 없는 투명한 알약이 된다)+`.badge-*`; `.btn`(색은 `.btn-primary`/`.btn-ghost`/`.btn-danger`가 낸다 — `.btn`만 쓰면 테두리가 투명해 보이지 않는다)+`.btn-*`.
- **베이스만으로 완결**: `.card`(배경·테두리·radius가 이미 있다 — `.card-header`/`.card-body`는 모디파이어가 아니라 선택적 자식 구조), `.input`/`.select`/`.textarea`, `.table`, `.empty`, `.pagination`.

`.card-header`는 `display:flex; justify-content:space-between`이다 — 제목과 설명을 한 줄에 넣지 않는다. 제목만 헤더에, 설명은 `.card-body` 첫 줄에 둔다.

### 4.1 `--kit-radius` — 컴포넌트 radius는 소비자의 `--radius` 재정의에서 격리돼 있다

`.btn`/`.card`/`.input`,`.select`,`.textarea`/`.alert`는 내부적으로 공개 토큰 `--radius`가 아니라 프라이빗 토큰 `--kit-radius`(값은 동일하게 `0.625rem`)를 쓴다. 소비 서비스가 자기 `:root`에서 `--radius`를 재정의해도(예: `itad`) 이 컴포넌트들의 모양은 바뀌지 않는다 — 예전에는 바뀌었고, 빠져나갈 방법이 없었다(§9.1의 2번 항목이 원래 경고하던 문제). `--radius` 자체는 여전히 공개 토큰으로 남아 있고, Tailwind가 직접 생성하는 유틸리티 클래스(`rounded`, `rounded-lg` 등)는 계속 `--radius`/`--radius-*`를 참조한다 — 그건 소비자가 자기 페이지의 `rounded` 계열을 바꿀 수 있어야 하는 의도된 동작이므로 그대로 둔다.

### 4.2 폼 컨트롤 — 두 층으로 되어 있다

**1층: 클래스를 붙이지 않아도 적용된다** (`@layer base`, 마크업 변경 0)

| 대상 | 효과 |
|---|---|
| `input[type=checkbox]`, `input[type=radio]` | `accent-color`가 서비스 accent를 따른다 |
| `input[type=number]` | 위아래 스피너가 사라진다. `min`/`max`/`step` 검증과 키보드 화살표는 그대로다 |
| `textarea` | 오른쪽 아래 크기 조절 손잡이가 사라진다(`resize:none`). 높이는 `rows`나 CSS로 정한다. 내용에 맞춰 늘리려면 서비스에서 `field-sizing: content`를 켠다 |

서비스가 되돌리고 싶으면 자기 CSS에서 그냥 덮으면 된다 — 앞의 두 규칙은 `:where()`로 감싸 명시도가 0이고, 서비스 CSS는 어차피 레이어 밖이라 항상 이긴다. **`textarea`만 `:where()` 없이 쓴다** — Preflight가 같은 레이어에서 `textarea{resize:vertical}`로 이 속성을 명시적으로 켜기 때문에, 같은 레이어 안에서 소스 순서보다 먼저 비교되는 명시도에서 0으로는 이길 수 없다. 반대로 서비스가 `.textarea{resize:vertical}` 같은 규칙을 남겨두면 그 서비스에만 손잡이가 계속 보인다(`agent-gate`가 실제로 그랬다).

**2층: 모양까지 통제할 때 쓰는 opt-in 클래스**

| 클래스 | 쓰는 곳 |
|---|---|
| `.checkbox` `.radio` | `appearance:none` 기반. 18px, 체크 표시·점은 `--color-on-accent`. `:indeterminate`는 가로 막대로 표시된다 |
| `.switch` | 36×20 토글. `<input type="checkbox" class="switch">` 로 쓴다 |
| `.check-row` | 컨트롤+라벨 한 줄. **44px 터치 타깃을 라벨이 확보한다** — 컨트롤 자체는 18px라 단독으로는 모바일에서 누르기 어렵다 |
| `.field` | 라벨 위, 컨트롤 아래의 세로 묶음 |

`.checkbox`/`.radio`/`.switch`는 `appearance:none`이라 1층의 `accent-color`가 더 이상 관여하지 않는다 — 둘을 섞어 쓰면 색이 어긋나지 않고 그냥 2층이 이긴다.

**`.select`는 열린 목록까지 kit이 그린다.** `appearance: base-select`(Chromium 135+)로 팝업·`option`·선택 표시를 CSS로 스타일한다. 지원하지 않는 브라우저(현재 Firefox·Safari)는 닫힌 버튼의 화살표만 적용된 채 네이티브 목록이 뜬다 — 기능이 빠지는 것이지 깨지지 않는다. **서비스는 `.select`에 `background`·`padding` 단축 속성을 쓰면 안 된다** — 화살표(`background-image`)와 화살표 자리(`padding-right`)가 함께 지워져 표시자가 아예 없는 셀렉트가 된다. `background-color`, `padding-block`/`padding-left`를 쓴다. `agent-gate`·`itad` 둘 다 이 함정에 걸려 있었다.

## 5. kit에 없는 것 (만들지 않는다, 대체 방법을 쓴다)

| 없는 것 | 상태 | 대체 |
|---|---|---|
| ~~checkbox / radio / toggle~~ | **해소됨** — §4.2를 본다 | — |
| 정확한 px 단위 (`max-w-[560px]`, `text-[15px]`) | 원리적으로 불가 (§2) | 가장 가까운 스케일 값으로 근사하거나 서비스 CSS에서 `var(--color-*)`/직접 값 사용 |

## 6. 라이트 테마

**있다. 단, 기본은 다크이고 서비스가 명시적으로 켜야 한다.**

`<html>`의 `data-theme` 속성으로 고른다.

| `data-theme` | 결과 |
|---|---|
| (속성 없음) | **다크.** 지금까지의 모든 서비스가 여기 해당한다 |
| `"dark"` | 다크 고정. 기본과 같지만 3상태 토글 UI에 필요하다 |
| `"light"` | 라이트 고정 |
| `"auto"` | 시스템 설정(`prefers-color-scheme`)을 따른다 |

**kit은 `prefers-color-scheme`을 기본으로 따르지 않는다.** 이미 마이그레이션한 서비스들은 자기 CSS에 다크를 전제한 값을 레이어 밖에 갖고 있고(`chzzk-auth`의 파란 배경 그라데이션, `profile`의 그라데이션 배너), 그것들은 kit 토큰을 따라오지 않는다. kit이 시스템 설정만 보고 뒤집으면 그 서비스들이 예고 없이 깨진다. `auto`는 서비스가 자기 화면을 라이트에서 확인한 뒤에 켜는 것이다.

라이트로 바뀌는 것은 `--color-*` 값뿐이다. 클래스 이름은 다크와 완전히 같다 — `dark:` 같은 variant는 없고, 필요하지도 않다.

### 6.1 accent는 `--kit-accent`로 주입한다

**서비스가 주입하는 이름은 `--color-accent`가 아니라 `--kit-accent`다.**

```html
<style>:root{--kit-accent:oklch(0.780 0.150 55)}</style>
```

`--kit-accent`가 서비스가 고르는 씨앗이고, `--color-accent`는 kit이 테마에 맞춰 밝기를 조정해 내보내는 값이다. 라이트에서는 같은 hue·chroma를 유지한 채 L을 0.78에서 **0.52로 낮춘다** — 다크용 L 0.78을 흰 바탕에 그대로 쓰면 링크 글자가 2:1도 안 나온다.

**`--color-accent`를 직접 덮으면** 다크에서는 동작하지만 라이트에서 그 밝은 값이 그대로 쓰여 대비가 무너진다. Jinja 서비스는 `kit.head(accent=...)` 매크로가 알아서 처리하므로 신경 쓸 필요 없다.

`--kit-accent`를 주입하지 않으면 kit 기본값(agent-gate teal, hue 185)이 쓰인다.

### 6.2 라이트에서 서비스가 확인할 것

토큰만 바꿔서는 끝나지 않는다. `chzzk-auth` 마이그레이션에서 확인된 것:

- **`rgba()`·16진수 리터럴로 박힌 색.** `:root`만 바꾸면 배경 그라데이션·테두리·박스섀도가 옛 색으로 남는다. `color-mix(in oklab, var(--color-accent) N%, transparent)`로 옮긴다.
- **다크를 전제한 오버레이.** `rgba(255,255,255,0.06)` 같은 흰색 반투명 테두리는 라이트에서 보이지 않는다.
- **이미지 자산.** 어두운 글자로 그려진 로고는 어두운 면 위에서 사라진다(`profile`의 SQLAlchemy·AWS 로고가 실제로 그랬다).

## 7. 서비스별 accent

`<style>:root{--kit-accent:oklch(0.780 0.130 <hue>)}</style>` 한 줄로 주입한다(Jinja 서비스는 `kit.head(accent=...)` 매크로가 처리한다). **`--color-accent`가 아니라 `--kit-accent`다** — 이유는 §6.1. L=0.780 고정, hue만 서비스마다 다르다 — 값은 `docs/2026-08-28-kit-design.md` §5.2 표를 따른다. `on-accent`(텍스트)는 재정의하지 않는다 — 모든 서비스 accent 위에서 AA 통과가 이미 테스트로 보장돼 있다. accent 위에 텍스트를 올릴 때는 §2의 규칙대로 `text-on-accent`만 쓴다.
