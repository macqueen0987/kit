# kit 공용 디자인 시스템 설계

- 작성일: 2026-08-28
- 대상: `E:\Workspace\services\kit` (신규), 소비 서비스 11개
- 상태: **1~3단계 구현 완료** (§9 참조). `agent-gate` 파일럿 결과는 `docs/2026-08-28-pilot-report.md` 참조

## 1. 목표

서비스마다 CSS를 따로 굴리고 있어 같은 사람이 만든 서비스로 보이지 않는다. 기존 서비스 대부분이 대규모 재작성을 앞두고 있으므로, 그 김에 공용 기반을 세운다.

1. **한 제품군으로 읽히게 한다** — 표면·텍스트·타이포·간격을 전 서비스가 공유한다.
2. **한 번 바꾸면 전파된다** — 토큰을 고치면 빌드 없는 서비스는 5분 내 반영된다.
3. **AI가 같은 어휘로 UI를 짠다** — 허용 클래스 목록이 문서로 존재하고, 각 서비스 `CLAUDE.md`가 이를 참조한다.
4. **빌드 파이프라인을 늘리지 않는다** — Python 서비스에 node 빌드를 추가하지 않는다.

### 비목표

- 라이트 테마. kit은 다크 전용이다.
- 각 서비스의 기능·레이아웃 변경. 이 문서는 시각 계층만 다룬다.
- 외부 배포. PyPI·npm 레지스트리에 올리지 않는다.
- `novel`의 안드로이드 앱. 네이티브라 대상이 아니다.

## 2. 현황

| 서비스 | 현재 상태 |
|---|---|
| `agent-gate` | `:root` CSS 변수, 다크, teal accent. **목표 구조에 가장 가깝다** |
| `itad` | `:root` CSS 변수, 다크, orange accent. 두 번째로 가깝다 |
| `profile` | 구식 네이밍(`--header-background-color`), Inter + Noto Sans KR |
| `gallery` | 화면별 CSS 파일 분리(`board.css`, `home.css`, …) |
| `mpw` | Tailwind 빌드 존재(`tailwind-build/input.css`) |
| `stock` | Vite 앱(`web/`), 컴포넌트별 CSS |
| `COLLARS` | pnpm 모노레포, React, BlockNote 등 외부 UI 포함 |
| `logflare` `iot` `aitg` `chzzk-auth` | 각자 개별 CSS |

`agent-gate`와 `itad`가 이미 `--bg / --surface / --text / --muted / --accent / --success / --warning / --danger / --border / --radius`라는 사실상 동일한 이름 체계를 쓰고 있다. **새로 만드는 게 아니라 이미 수렴한 것을 계약으로 확정하는 작업이다.**

`profile`의 CSS가 `projects/mpw/nginx/html/profile/`에 복사되어 있다. 마이그레이션 시 함께 제거한다.

## 3. 결정 사항

| 항목 | 결정 | 근거 |
|---|---|---|
| CSS 베이스 | Tailwind v4 | AI 생성 정확도가 가장 높다 |
| 배포 방식 | 자체 선컴파일 번들을 edge에서 서빙 | 공식 play CDN(`cdn.tailwindcss.com`)은 브라우저에서 JIT 컴파일해 프로덕션 비권장. 우리는 결과물만 올린다 |
| 유틸리티 범위 | 큐레이션(safelist) | 서비스 마크업을 스캔하지 않고 중앙 빌드하려면 safelist가 필수다 |
| 기본 컬러 팔레트 | **제외** | `bg-red-500`이 되는 순간 서비스마다 자기 빨강을 고른다. 대신 `bg-danger`를 쓴다 |
| 그 외 유틸리티 | 넉넉히 허용 | 초반 마찰을 줄인다. 실사용 데이터가 쌓이면 걷어낸다 |
| accent | 서비스별 재정의 허용 | 나머지 토큰은 공유. 대시보드 여러 개를 동시에 열었을 때 구분이 필요하다 |
| 색 공간 | oklch | L값만 조정해 지각적으로 균등한 계단을 만든다. hex로는 서비스마다 어긋난다 |
| 패키지 배포 | 레지스트리 없이 git/로컬 경로 | 전부 같은 머신·같은 소유자다 |

## 4. 구조

```
services/kit/
  tokens/
    tokens.css              단일 진실 공급원. @theme 블록 하나
  bundle/
    src/
      app.css                진입점. @import "tailwindcss" source(none) + import 순서 고정
      safelist.css           허용 유틸리티 목록. @source inline() 디렉티브 모음
      components.css         @layer components. .btn/.card/...
    dist/app.css             빌드 결과. edge가 이걸 서빙 (커밋한다)
  scripts/
    color.mjs                oklch → 선형 sRGB, 대비비. 순수 함수만
    parse-tokens.mjs         tokens.css에서 토큰 이름/값 추출
  tests/
    color.test.mjs           색 변환·대비비 수학
    tokens.test.mjs          토큰 대비비가 WCAG AA를 통과하는지
    bundle.test.mjs          빌드 산출물이 계약을 지키는지
  jinja/
    code0987_kit/
      templates/            head, header, nav, button, badge, alert, empty, pagination
      __init__.py           Jinja 환경 등록 헬퍼
    pyproject.toml
  react/
    preset.js               tokens.css를 참조하는 Tailwind preset
    src/                    Button, Card, Input, Badge, EmptyState, Alert
    package.json
  docs/
  AGENTS.md                 허용 클래스 목록과 사용례. 각 서비스 CLAUDE.md가 참조
```

산출물 3종이 전부 `tokens/tokens.css` 하나를 바라본다.

`bundle/src/safelist.txt`가 아니라 `bundle/src/safelist.css`다 — Tailwind v4의 safelist 기제가 CSS 안의 `@source inline()` 디렉티브이므로, 별도 텍스트 파일을 두면 CSS로 옮기는 변환 단계가 하나 더 생긴다. 구현 과정에서 CSS 파일 하나로 합쳤다. `jinja/`와 `react/`는 아직 구현되지 않았다(§9 참조) — 소비자가 생기는 단계에서 채운다.

### 4.1 서브도메인과 컨테이너

`kit.code0987.me`로 서빙하되 **전용 컨테이너를 만들지 않는다.** `bundle/dist`를 edge Caddy에 볼륨 마운트하고 `file_server`로 직접 내보낸다.

- 컨테이너가 늘지 않는다.
- 새 장애점이 생기지 않는다. edge가 죽으면 어차피 소비 서비스도 같이 죽으므로 위험 증가분이 0이다.

이로 인해 edge 설계의 "디렉터리명 = 컨테이너명 = 서브도메인" 규칙에서 **컨테이너 항목만 비는 예외**가 된다. `services/kit`은 실행 중인 서비스가 아니라 edge가 서빙하는 산출물의 소스다. edge 설계 문서에 예외로 명시한다.

## 5. 토큰

`tokens/tokens.css`는 Tailwind v4 `@theme` 블록 하나다. `@theme`은 유틸리티와 CSS 변수를 **동시에** 생성하므로, 기존 서비스는 손으로 쓴 CSS에서 `var(--color-surface)`를 먼저 쓰고 클래스 전환은 나중에 할 수 있다. 이것이 마이그레이션 부담을 크게 낮춘다.

```css
@theme {
  /* 표면 — L값만 올린 계단 */
  --color-bg:            oklch(0.145 0.005 285);
  --color-surface:       oklch(0.185 0.006 285);
  --color-surface-2:     oklch(0.225 0.007 285);
  --color-border:        oklch(0.300 0.008 285);
  --color-border-strong: oklch(0.400 0.010 285);

  /* 텍스트 */
  --color-text:  oklch(0.970 0.000 285);
  --color-muted: oklch(0.720 0.012 285);
  --color-dim:   oklch(0.560 0.012 285);

  /* 의미색 */
  --color-accent:    oklch(0.780 0.130 185);
  --color-success:   oklch(0.800 0.160 150);
  --color-warning:   oklch(0.830 0.140 85);
  --color-danger:    oklch(0.700 0.170 25);
  --color-on-accent: oklch(0.160 0.010 285);

  --font-sans: "Noto Sans KR", "Noto Sans", system-ui, sans-serif;
  --font-mono: "Noto Sans Mono", ui-monospace, SFMono-Regular, monospace;

  --radius: 0.625rem;
}
```

중립색은 순수 회색이 아니라 hue 285(청보라)로 살짝 치우쳐 있다. 순수 회색은 accent와 붙었을 때 고르지 않은 색으로 읽힌다.

`--color-dim`은 **본문용이 아니다.** 라벨·비활성 상태 전용이다.

### 5.1 폰트

**Noto Sans KR**로 통일하고 Google Fonts에서 받는다. 모노는 같은 가족의 **Noto Sans Mono**를 쓴다.

현재 `profile`은 Inter + Noto Sans KR을 조합하고 `itad`는 시스템 `Malgun Gothic`을 쓴다. 한글이 섞이는 서비스가 대부분이라 라틴/한글 획 굵기 불일치가 가장 눈에 띄는 불일치인데, Noto Sans KR은 라틴까지 한 가족 안에 있으므로 이 문제가 사라진다.

Google Fonts CSS2 API는 `unicode-range`로 서브셋을 쪼개 내려주므로, 한글 글리프 전체를 받지 않는다. 자체 호스팅 대비 origin 하나가 늘지만(`fonts.googleapis.com` + `fonts.gstatic.com`) 관리 비용이 0이다.

폰트 링크는 `kit.head()` 매크로와 번들의 `@import`가 각각 처리하므로 서비스 코드에는 나타나지 않는다.

### 5.2 서비스별 accent

L을 0.780으로 고정하고 hue만 돌린다. 그래서 어느 서비스를 열어도 강조색의 무게감이 같다.

| 서비스 | hue | chroma | 별칭 |
|---|---|---|---|
| `agent-gate` | 185 | 0.130 | teal (기본값) |
| `aitg` | 215 | 0.125 | azure |
| `logflare` | 240 | 0.135 | blue |
| `COLLARS` | 265 | 0.130 | indigo |
| `profile` | 285 | 0.115 | violet |
| `mpw` | 305 | 0.130 | purple |
| `gallery` | 330 | 0.140 | magenta |
| `novel` | 20 | 0.140 | rose |
| `itad` | 55 | 0.150 | orange |
| `stock` | 95 | 0.125 | gold |
| `iot` | 130 | 0.150 | lime |
| `chzzk-auth` | 160 | 0.150 | spring |

서비스는 `<html style="--color-accent: oklch(0.780 0.150 55)">` 한 줄로 재정의한다. Jinja 쪽은 `kit.head(accent=...)` 매크로가 처리한다.

확인용 팔레트 페이지: https://claude.ai/code/artifact/eaee59c8-66b4-49f2-b501-2db4c81d3120 — 이 페이지는 구현 시 `kit.code0987.me/` 쇼케이스로 옮긴다.

## 6. 번들

### 6.1 safelist 정책

| 축 | 허용 |
|---|---|
| 색 | **kit 토큰만.** Tailwind 기본 팔레트 전체 제외 |
| 간격 | `0 0.5 1 1.5 2 2.5 3 3.5 4 5 6 8 10 12 16` (p/m/gap/space 전 방향) |
| 타이포 | `text-xs`~`text-7xl`, weight 4종, leading 3종, tracking 3종 |
| 레이아웃 | flex/grid/position/z/overflow 전반, `grid-cols-1~12`, `w-full`, `max-w-*` |
| 크기 | `w/h/min-w/min-h/size`의 숫자 스케일(`4~64`, `11` 포함), `w-{1/2,1/3,2/3,1/4,3/4}` |
| 형태 | `rounded{,-xs,-sm,-md,-lg,-xl,-full,-none}`, `border{,-0,-t,-b,-l,-r}`, `shadow-{sm,md,lg}` |
| 기타 | `opacity-*`, `transition-*`, `cursor-*` |
| variant | `hover: focus-visible: active: disabled: group-hover: sm: md: lg: xl:` |

`agent-gate` 파일럿(`docs/2026-08-28-pilot-report.md`)에서 하프스텝 간격(`gap-2.5` 등), `min-w`/`min-h`의 숫자 스케일 전체, 4px 라디우스 단계(`rounded-xs`)가 비어 있음이 드러나 채웠다. **체크박스/토글 컴포넌트는 여전히 없다** — kit에 대응하는 유틸리티·컴포넌트 클래스가 전혀 없어, 폼에 체크박스가 있는 서비스는 소규모 커스텀 CSS를 남길 수밖에 없다. §12의 후속 작업 최우선 항목이다.

brotli 압축 후 **6.8KB**로 실측됐다(Task 3 fix round 기준, 파일럿 gap-fill 이후 **7.0KB**) — 스펙 초안의 80~120KB 예상은 실측 대비 자릿수 하나가 틀렸다. 렌더 블로킹 부담이 사실상 없는 수준이라, "실사용 데이터가 쌓이면 걷어낸다"는 축소 계획은 근거를 잃었다(§11.3, §12 참조). 초반에 유틸리티 범위를 넉넉히 유지하는 정책 그대로 간다.

`@source inline()`이 스캔 없이 클래스를 강제 생성하며, `{hover:,focus:,}underline` 형태의 확장 문법을 지원한다.

### 6.2 임의값은 불가능하다

`text-[13px]`, `bg-[#ff0000]` 같은 임의값은 **선컴파일 방식에서 원리적으로 지원할 수 없다.** 정책 선택이 아니라 제약이다.

탈출구는 서비스 자체 CSS에서 `var(--color-surface)` 등 토큰 변수를 직접 쓰는 것이다.

### 6.3 컴포넌트 클래스

`@layer components`에서 `@apply`로 구성한다.

```
.btn  .btn-primary  .btn-ghost  .btn-danger
.card  .card-header  .card-body
.input  .select  .textarea
.badge  .badge-{ok,warn,danger,accent}
.table
.alert-{ok,warn,danger}
.empty
.pagination
```

## 7. 소비 경로

```
tokens/tokens.css ──┬─→ bundle/dist/app.css → <link>  → Jinja 서비스 9개
                    └─→ react/preset.js     → import  → COLLARS, stock/web
```

### 7.1 빌드 없는 서비스 (Jinja 9개)

`code0987-kit` pip 패키지를 설치하고 템플릿에서 매크로를 쓴다.

```jinja
{{ kit.head(accent="oklch(0.780 0.150 55)") }}
```

이 한 줄이 번들 `<link>`, Google Fonts 링크와 `preconnect`, accent 주입을 처리한다. **CDN URL이 서비스 코드에 하드코딩되지 않는다.** v2로 옮기거나 도메인이 바뀌어도 pip 패키지만 올리면 9개가 따라온다.

매크로: `head()` `header()` `nav()` `button()` `badge()` `alert()` `empty_state()` `pagination()`

### 7.2 빌드 있는 앱 (COLLARS, stock/web)

`@code0987/kit`을 git 태그로 참조한다. preset으로 정상 Tailwind 빌드를 하므로 safelist 제약을 받지 않고 purge가 정확하다.

React 컴포넌트는 `Button` `Card` `Input` `Badge` `EmptyState` `Alert` 6개로 시작한다. 미리 만들어두면 안 쓰이는 컴포넌트를 유지보수하게 된다.

**이 두 앱은 즉시 전파에 묶지 않는다.** 토큰 하나 고칠 때마다 두 앱의 빌드가 깨질 위험을 떠안을 이유가 없다. 각자 원할 때 태그를 올린다.

## 8. 배포와 버저닝

### 8.1 URL

```
kit.code0987.me/v1/app.css      major만 경로에. 계속 갱신되는 mutable URL
kit.code0987.me/v2/app.css      파괴적 변경 시 신설. v1은 유지
```

`app.<hash>.css` 같은 불변 URL은 쓰지 않는다. 서비스마다 `<link>`를 고쳐야 하고, 그것은 "한 번 바꾸면 전 서비스 반영"이라는 목표를 정면으로 깨뜨린다.

### 8.2 캐시

```
Cache-Control: public, max-age=300, stale-while-revalidate=86400, stale-if-error=604800
```

5분이면 전파된다. `stale-if-error`가 있어 origin이 죽어도 Cloudflare가 일주일치 사본을 계속 내준다. 급하면 Cloudflare purge로 즉시 반영한다.

**Cloudflare 캐시 룰이 필수다.** Caddy가 위 `Cache-Control` 헤더를 정확히 보내도, Cloudflare 존에 캐시 룰이 없으면 Cloudflare가 존 전역 기본값(Browser Cache TTL)으로 그 값을 조용히 재작성한다 — 실제로 `max-age=300`이 `max-age=14400`(4시간)으로 바뀌는 것을 확인했다(Task 4, `docs/2026-08-28-pilot-report.md` §4.4). 응답은 200이고 헤더 이름도 그대로라 `curl`로 헤더 존재만 확인하면 놓친다. `kit.code0987.me` 호스트명 한정으로 `http_request_cache_settings` 페이즈에 캐시 룰을 만들어 `browser_ttl`/`edge_ttl`을 `respect_origin`으로 설정해야 origin이 보낸 값이 그대로 나간다 — 존 전역이 아니라 이 호스트명에만 적용되고 룰 삭제로 즉시 되돌릴 수 있다.

### 8.3 파괴적 변경의 정의

- **파괴적이 아님**: 토큰 *값* 변경. 색이 바뀌는 것은 의도한 동작이다.
- **파괴적임**: 토큰·컴포넌트 클래스의 **삭제 또는 개명**. 이때만 major를 올린다.

이 규칙이 없으면 매번 "이건 v2인가?"로 시간을 쓴다.

### 8.4 배포 흐름

```
services/kit 에서
  tokens.css 또는 safelist.css 수정
  → pnpm build                  (bundle/dist/app.css 생성)
  → git commit
  → dist/ 는 볼륨 마운트라 즉시 반영, 재시작 불필요
  → Cloudflare purge (선택)
```

## 9. 마이그레이션 순서

1. `services/kit` 구축 — 소비자 0인 상태로 토큰·번들 완성, edge 마운트, `kit.code0987.me` 라우팅. **Jinja 매크로는 이 단계에서 만들지 않는다** — 원래 계획은 1단계에 포함했으나, 첫 소비자 `agent-gate`가 Jinja가 아니라 FastAPI `FileResponse`로 정적 HTML을 서빙해 이 범위 안에 매크로의 소비자가 없었다. 검증되지 않은 API를 소비자 없이 굳히지 않기 위해 **4단계(`itad`, Jinja 서비스)로 옮겼다**
2. `agent-gate` 파일럿 — 토큰 구조가 가장 가깝고 내부용이라 깨져도 영향이 적다. safelist 구멍이 여기서 드러난다
3. **중단하고 safelist 재점검** — 파일럿 결과를 반영한다. 완료(`docs/2026-08-28-pilot-report.md`)
4. `itad` — `head()` / `header()` 매크로 최초 구현·실전 검증
5. `profile` — 가장 오래된 CSS. `projects/mpw/nginx/html/profile/` 중복을 함께 제거한다
6. `gallery` → `logflare` → `iot` → `mpw` → `aitg` → `chzzk-auth`
7. `stock/web` → `COLLARS` — React. COLLARS는 BlockNote 등 외부 UI와 얽혀 가장 복잡하므로 마지막

각 단계는 독립 커밋으로 되돌릴 수 있어야 한다.

**첫 구현 계획의 범위는 1~3단계까지였고, 완료됐다.** 4단계 이후는 파일럿에서 나온 safelist 수정과 매크로 API 변경을 반영한 뒤 별도 계획으로 쪼갠다. 11개 서비스 마이그레이션을 하나의 계획에 담으면 앞단의 학습이 뒷단에 반영되지 않는다.

### 9.1 표준 마이그레이션 절차

파일럿(§9-2·3, `docs/2026-08-28-pilot-report.md`)에서 드러난 것을 다음 서비스부터 절차로 못박는다. 순서가 중요하다 — 1번을 건너뛰면 이후 모든 단계에서 "클래스를 붙였는데 스타일이 안 먹는다"는 진단하기 어려운 실패를 만난다.

1. **서비스 CSS의 전역 리셋·범용 규칙을 `@layer base`로 감싼다.** kit 번들은 Tailwind v4라 모든 규칙이 `@layer` 안에 있는 반면, 소비 서비스 9개는 전부 레이어 없는(unlayered) 평범한 CSS다. CSS Cascading Layers 명세상 레이어 없는 일반 선언은 명시도·소스 순서와 무관하게 레이어 안의 어떤 선언보다 항상 이긴다 — 즉 `*,*::before,*::after{margin:0;padding:0}` 같은 흔한 리셋 하나가 kit의 모든 `@layer components`/`@layer utilities` 클래스를 그 속성에 한해 통째로 무력화한다(§11.1 참조). 리셋을 kit과 같은 이름의 `@layer base`로 감싸면, kit의 `<link>`가 먼저 로드되는 한 같은 레이어 안에서 소스 순서가 다시 유효해져 서비스 쪽 리셋이 계속 이기면서도 kit의 컴포넌트·유틸리티가 정상 동작한다.
2. **서비스 `:root`의 변수명이 kit `@theme`가 내보내는 이름(`--radius`, `--radius-sm` 등 Tailwind 기본 테마 이름 포함)과 겹치는지 확인한다.** 겹치면 서비스 쪽 정의가 나중에 로드되어 kit이 의도한 값을 가린다. agent-gate의 `--radius`·`--radius-sm` 재정의가 실례다 — 안전한 값이 필요하면 서비스가 재정의하지 않은 이름(예: kit의 `--radius-xs`)을 쓴다.
3. `:root` 토큰만 kit 매핑으로 교체한다(HTML·JS 무변경). 기존 서비스가 `var(--bg)` 같은 짧은 이름을 쓰고 있었다면 그대로 두고 kit `--color-*`로 리다이렉트만 한다.
4. 브라우저 강제 새로고침으로 표면 계단·텍스트 가독성·의미색 구분·레이아웃을 확인한다. 여기서 "스타일이 안 먹는다"가 나오면 원인을 safelist 구멍과 레이어 충돌 둘 다 의심한다 — 둘의 겉보기 증상이 동일하다.
5. JS가 DOM 구조를 만들지 않는 영역부터 유틸리티 클래스로 전환한다. id·`data-*`는 건드리지 않는다. 필요한데 없는 클래스는 즉시 메모하고, 스케일 단위로 safelist에 반영한다(개별 클래스 추가 금지 — 같은 이유로 반복 방문하게 된다).
6. 전환한 영역에서만 쓰이던 죽은 CSS 규칙을 제거한다. JS가 참조하는 클래스는 지우지 않는다.

## 10. 검증 기준

- `safelist.css`의 모든 클래스가 `dist/app.css`에 존재한다 (빌드 후 자동 검사)
- `tokens.css`의 토큰 수와 번들의 `--color-*` 변수 수가 일치한다 (드리프트 탐지)
- **대비비 자동 검사** — 토큰 조합(`text`/`bg`, `muted`/`surface`, `accent`/`bg`, `on-accent`/`accent`)이 WCAG AA를 통과한다. oklch → 선형 sRGB 변환 후 계산한다. 서비스별 accent를 허용했으므로 특히 중요하다. 밝은 accent 위에 흰 텍스트가 오면 읽히지 않는다
- `kit.code0987.me/v1/app.css`가 200과 올바른 `Cache-Control`을 반환한다
- 각 서비스 마이그레이션 전후 주요 화면 2~3개의 스크린샷을 비교한다

## 11. 리스크

### 11.1 조용한 실패 (주 리스크)

조용한 실패에는 **두 가지 서로 다른 경로**가 있고, 겉보기 증상(클래스를 붙였는데 스타일이 안 먹는다)이 똑같아 원인 진단이 어렵다. 파일럿(`docs/2026-08-28-pilot-report.md`)에서 실제로 둘 다 겪었다.

**경로 1 — safelist 구멍.** safelist에 없는 클래스를 쓰면 **에러 없이 스타일이 안 먹는다.** 선컴파일(중앙 빌드) 방식의 구조적 대가다.

**경로 2 — CSS 레이어 우선순위.** kit 번들은 Tailwind v4라 모든 규칙이 `@layer properties, theme, base, components, utilities` 안에 있다. 반면 소비 서비스는 전부 레이어 없는(unlayered) 평범한 CSS를 갖고 있다. CSS Cascading and Layers 명세상 **레이어 없는 일반 선언은 명시도(specificity)나 소스 순서와 무관하게 어떤 레이어 안의 선언보다 항상 이긴다.** 서비스에 흔한 전역 리셋(`*,*::before,*::after{margin:0;padding:0}` 등) 하나가 레이어 없이 남아 있으면, 그 리셋이 건드리는 속성에 한해 kit의 `@layer components`/`@layer utilities` 선언은 명시도가 아무리 높아도 항상 진다. 클래스는 마크업에 정확히 붙어 있고 오류도 없다 — `getComputedStyle`로 값이 0인 것을 확인하기 전까지는 원인이 safelist 구멍인지 레이어 충돌인지 구분되지 않는다.

경로 2는 경로 1보다 진단하기 어렵다는 점에서 더 위험하다. safelist 구멍은 "이 클래스가 번들에 없다"로 확인 가능하지만, 레이어 충돌은 클래스가 번들에 있고 마크업에도 붙어 있는데 이긴 쪽이 다른 레이어라 발생한다. (정정: 이 계획의 앞선 기록 하나가 이 현상을 "명시도 동률에서 서비스 CSS가 이긴다"고 서술했는데, 이는 부정확하다 — 레이어 없는 선언은 명시도 비교 단계에 도달하기도 전에 이긴다. "동률"이 아니라 "무조건"이다.)

**완화책**: 경로 2는 §9.1의 표준 마이그레이션 절차 1번("서비스 CSS 리셋을 `@layer base`로 감싼다")으로 예방한다. 경로 1은 각 서비스 템플릿을 스캔해 번들에 없는 Tailwind류 클래스를 리포트하는 린터(`kit lint <service>`)로 완화할 수 있다. 파일럿에서 둘 다 정적 분석만으로 결정론적으로 탐지 가능함이 확인됐다 — (a) 서비스 CSS의 레이어 없는 규칙과 kit 셀렉터가 같은 속성을 건드리는지 대조, (b) HTML에서 쓰인 클래스와 kit/서비스 정의를 대조. `kit lint`는 아직 만들지 않았다 — 다음 마이그레이션(§9-4 이후)에서 조용한 실패가 실제로 반복되는지 다시 확인한 뒤 착수 여부를 정한다.

### 11.2 kit이 edge에 의존한다

edge Caddy 설정 변경 시 `kit.code0987.me` 라우팅이 함께 검증되어야 한다. edge 설계 문서에 상호 참조를 남긴다.

### 11.3 번들 크기 (실측)

**초안의 80~120KB(brotli) 예상은 틀렸다.** 실측은 raw 47.8KB / brotli **6.8KB**(Task 3 기준)이고, 파일럿에서 safelist를 확장한 뒤에도 raw 50.8KB / brotli **7.0KB**다 — 예상의 약 1/12~1/17 수준으로, 자릿수 하나가 틀렸다. Task 3 리뷰가 safelist의 카테시안 전개 완전성(색 39/39, 상태 variant 21/21, breakpoint 8/8, 간격 13/13)을 전수 검증했으므로 이는 safelist가 부실해서가 아니라 애초의 추정 자체가 근거 없이 컸던 것이다.

brotli 7KB는 렌더 블로킹 부담이 사실상 없는 수준이다. 이 항목은 더 이상 리스크가 아니다 — §12의 "safelist 축소" 후속 작업도 이 실측 앞에서 근거를 잃어 제거한다.

## 12. 후속 작업

- **checkbox/toggle 컴포넌트** — kit에 전혀 없다. 유틸리티(`accent-*`)도, 컴포넌트 클래스도 없어 설정 화면이 있는 서비스마다 소규모 커스텀 CSS가 반복된다. 파일럿에서 확인된 **가장 확실한 반복 구멍**이므로 다음 마이그레이션(itad)에서 우선 검토한다
- `kit lint <service>` — safelist 구멍과 레이어 우선순위 충돌 둘 다 탐지 (§11.1). 아직 만들지 않았다 — 조용한 실패가 계속 반복되는지 확인한 뒤 착수 여부를 정한다
- `kit.code0987.me/` 쇼케이스 페이지 — 팔레트 확인 페이지를 옮긴다
- Jinja 매크로 패키지(`jinja/code0987_kit`) — `itad` 마이그레이션(§9-4)에서 최초 구현
- edge 설계 문서에 §4.1 예외와 §11.2 상호 참조 추가 — 완료 (`infra/edge/docs/2026-08-27-edge-proxy-design.md`)
