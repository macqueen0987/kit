# kit — AGENTS.md

이 파일은 `kit.code0987.me/v1/app.css`를 쓰는 모든 서비스의 UI를 짤 때 읽는 계약이다. 사람이 아니라 AI가 읽는다 — 산문 설명 대신 표와 목록으로 구성한다. 원본: `bundle/src/safelist.css`(허용 클래스 전체), `tokens/tokens.css`(토큰), `docs/2026-08-28-kit-design.md`(스펙), `docs/2026-08-28-pilot-report.md`(파일럿에서 드러난 함정).

## 0. 가장 먼저 알아야 할 것 — 조용한 실패

**틀린 클래스를 써도 에러가 안 난다. 그냥 스타일이 안 먹는다.** 원인은 두 가지이고 겉보기 증상이 동일하다.

1. **safelist에 없는 클래스** — kit은 서비스 마크업을 스캔하지 않는 중앙 선컴파일 방식이다. §2의 허용 목록에 없는 클래스는 번들 자체에 존재하지 않는다.
2. **레이어 우선순위** — kit의 모든 클래스는 `@layer components`/`@layer utilities` 안에 있다. 서비스 CSS에 `@layer`로 감싸지 않은 전역 리셋(`*{margin:0}` 등)이 하나라도 있으면, CSS Cascading Layers 규칙상 그 리셋은 **명시도와 무관하게** kit의 어떤 클래스보다 항상 이긴다. 클래스가 마크업에 정확히 붙어 있고 번들에도 존재하는데 효과가 없다면 이것을 의심한다. 해결: 서비스 CSS의 전역 리셋을 `@layer base { ... }`로 감싼다 — kit도 `base` 레이어를 쓰고 kit의 `<link>`가 먼저 로드되므로, 감싼 뒤에도 소스 순서상 서비스 쪽이 여전히 이긴다.

이 서비스에 체크박스/라디오/토글이 있다면 §4를 먼저 본다 — kit에 대응 컴포넌트가 없다.

## 1. 토큰 (`--color-*`, CSS 변수 겸 유틸리티 접두사)

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

**금지: Tailwind 기본 팔레트 전체** (`bg-red-500`, `text-gray-400`, `bg-zinc-900` 등). 번들에 없다 — 색이 필요하면 항상 위 토큰 중 하나를 쓴다. 서비스마다 자기 빨강을 고르는 것을 막기 위한 정책 결정이다(스펙 §3).

**금지: 임의값** (`text-[13px]`, `bg-[#ff0000]`). 선컴파일 방식에서 원리적으로 생성 불가능하다 — safelist에 없는 게 아니라 애초에 만들 수 없다. 탈출구는 서비스 자체 CSS에서 `var(--color-surface)` 등 토큰 변수를 직접 쓰는 것뿐이다.

## 2. 허용 유틸리티 (safelist 요약 — 정확한 목록은 `bundle/src/safelist.css`)

| 축 | 값 |
|---|---|
| 색 유틸리티 | `{bg,text,border}-{위 토큰 이름}` + `hover:/focus-visible:/active:/disabled:/group-hover:` variant |
| 간격 (p/m/gap, 방향별) | `0 0.5 1 1.5 2 2.5 3 3.5 4 5 6 8 10 12 16` (4px 배수 + 하프스텝 2px) |
| `space-x/y` | `0 1 2 3 4 6 8` |
| 타이포 크기 | `text-xs`~`text-7xl` |
| font-weight | `light normal medium semibold bold` |
| leading / tracking | `tight snug normal relaxed` / `tight normal wide` |
| 레이아웃 | flex/grid/position/z/overflow 전반, `grid-cols-{1..6,12}`, `col-span-{1..4,full}` |
| 크기 (w/h/min-w/min-h/size) | 숫자 스케일 `4 5 6 8 10 11 12 16 20 24 32 48 64` + `full/auto/fit/screen` + 분수 `w-{1/2,1/3,2/3,1/4,3/4}` |
| max-w | `xs sm md lg xl 2xl 3xl 4xl 5xl full none` (임의 px 없음 — 가장 가까운 값을 고른다) |
| 형태 | `rounded{,-xs,-sm,-md,-lg,-xl,-full,-none}`, `border{,-0,-2,-t,-r,-b,-l}`, `shadow-{sm,md,lg,none}` |
| 기타 | `opacity-{0,40,50,60,75,100}`, `cursor-pointer/not-allowed`, `transition{,-colors,-opacity,-transform}`, `duration-{100,150,200,300}` |
| 텍스트 처리 | `break-words/all/normal`, `text-balance/pretty/ellipsis`, `whitespace-{normal,pre,pre-wrap}`, `sr-only`, `font-{sans,mono}` |
| 구분선·기타 | `divide-{y,x}` + `divide-{border,border-strong}`, `-m{t,b,l,r,x,y}-{1,2,3,4}`, `ring-{0,1,2}` + `ring-{accent,border,danger}` |
| variant | `hover: focus-visible: active: disabled: group-hover: md: lg:` |

**`rounded-sm` 대신 `rounded-xs`를 쓸 때가 있다.** 서비스 `:root`가 `--radius-sm`을 자체 재정의하면 (agent-gate가 8px로 재정의한 실례가 있다) `rounded-sm`이 kit이 의도한 4px가 아니라 그 값을 낸다. 정확히 4px가 필요하면 `rounded-xs`(kit이 통제하는 `--radius-xs`, 서비스가 거의 재정의하지 않는 이름)를 쓴다.

목록에 없는 클래스가 필요하면 **추측해서 쓰지 않는다.** §0의 조용한 실패를 겪는다. `bundle/src/safelist.css`에서 실제 존재를 확인하거나, 없으면 스케일 단위로 추가를 요청한다(개별 클래스 하나만 추가하면 같은 이유로 다시 구멍이 생긴다).

## 3. 컴포넌트 클래스 (`@layer components`)

```
.btn  .btn-primary  .btn-ghost  .btn-danger
.card  .card-header  .card-body
.input  .select  .textarea
.badge  .badge-{accent,ok,warn,danger}
.table
.alert-{ok,warn,danger}
.empty
.pagination
```

`.card-header`는 `display:flex; justify-content:space-between`이다 — 제목과 설명을 한 줄에 넣지 않는다. 제목만 헤더에, 설명은 `.card-body` 첫 줄에 둔다.

## 4. kit에 없는 것 (만들지 않는다, 대체 방법을 쓴다)

| 없는 것 | 상태 | 대체 |
|---|---|---|
| checkbox / radio / toggle 컴포넌트, `accent-*` 유틸리티 | **완전히 없다.** kit의 가장 확실한 반복 구멍 | 서비스 CSS에 최소 규칙만 남긴다: `input[type=checkbox]{accent-color:var(--accent)}` 등. 새로 만들지 않는다 — 이 문서 갱신 시점에는 아직 계획에 없다 |
| 정확한 px 단위 (`max-w-[560px]`, `text-[15px]`) | 원리적으로 불가 (§1) | 가장 가까운 스케일 값으로 근사하거나 서비스 CSS에서 `var(--color-*)`/직접 값 사용 |

## 5. 라이트 테마

없다. kit은 다크 전용이다. 라이트 테마 클래스나 토큰을 요청하지 않는다.

## 6. 서비스별 accent

`<html style="--color-accent: oklch(0.780 0.130 <hue>)">` 한 줄로 재정의한다. L=0.780 고정, hue만 서비스마다 다르다 — 값은 `docs/2026-08-28-kit-design.md` §5.2 표를 따른다. `on-accent`(텍스트)는 재정의하지 않는다 — 모든 서비스 accent 위에서 AA 통과가 이미 테스트로 보장돼 있다.
