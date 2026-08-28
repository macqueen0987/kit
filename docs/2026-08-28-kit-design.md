# kit 공용 디자인 시스템 설계

- 작성일: 2026-08-28
- 대상: `E:\Workspace\services\kit` (신규), 소비 서비스 11개
- 상태: **설계 확정, 미구현**

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
    src/app.css             @import "tailwindcss" + @source inline + @layer components
    safelist.txt            허용 유틸리티 목록
    dist/app.css            빌드 결과. edge가 이걸 서빙
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
| 간격 | `0 0.5 1 1.5 2 3 4 5 6 8 10 12 16` (p/m/gap/space 전 방향) |
| 타이포 | `text-xs`~`text-7xl`, weight 4종, leading 3종, tracking 3종 |
| 레이아웃 | flex/grid/position/z/overflow 전반, `grid-cols-1~12`, `w-full`, `max-w-*` |
| 형태 | `rounded{,-sm,-lg,-full}`, `border{,-0,-t,-b,-l,-r}`, `shadow-{sm,md,lg}` |
| 기타 | `opacity-*`, `transition-*`, `cursor-*` |
| variant | `hover: focus-visible: active: disabled: group-hover: sm: md: lg: xl:` |

brotli 후 80~120KB로 예상한다. 초반에는 이대로 두고, 실사용 데이터가 쌓이면 안 쓰이는 것을 걷어낸다.

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

### 8.3 파괴적 변경의 정의

- **파괴적이 아님**: 토큰 *값* 변경. 색이 바뀌는 것은 의도한 동작이다.
- **파괴적임**: 토큰·컴포넌트 클래스의 **삭제 또는 개명**. 이때만 major를 올린다.

이 규칙이 없으면 매번 "이건 v2인가?"로 시간을 쓴다.

### 8.4 배포 흐름

```
services/kit 에서
  tokens.css 또는 safelist.txt 수정
  → pnpm build                  (bundle/dist/app.css 생성)
  → git commit
  → dist/ 는 볼륨 마운트라 즉시 반영, 재시작 불필요
  → Cloudflare purge (선택)
```

## 9. 마이그레이션 순서

1. `services/kit` 구축 — 소비자 0인 상태로 토큰·번들·매크로 완성, edge 마운트, `kit.code0987.me` 라우팅
2. `agent-gate` 파일럿 — 토큰 구조가 가장 가깝고 내부용이라 깨져도 영향이 적다. safelist 구멍이 여기서 드러난다
3. **중단하고 safelist 재점검** — 파일럿 결과를 반영한다
4. `itad` — `head()` / `header()` 매크로 실전 검증
5. `profile` — 가장 오래된 CSS. `projects/mpw/nginx/html/profile/` 중복을 함께 제거한다
6. `gallery` → `logflare` → `iot` → `mpw` → `aitg` → `chzzk-auth`
7. `stock/web` → `COLLARS` — React. COLLARS는 BlockNote 등 외부 UI와 얽혀 가장 복잡하므로 마지막

각 단계는 독립 커밋으로 되돌릴 수 있어야 한다.

**첫 구현 계획의 범위는 1~3단계까지다.** 4단계 이후는 파일럿에서 나온 safelist 수정과 매크로 API 변경을 반영한 뒤 별도 계획으로 쪼갠다. 11개 서비스 마이그레이션을 하나의 계획에 담으면 앞단의 학습이 뒷단에 반영되지 않는다.

## 10. 검증 기준

- `safelist.txt`의 모든 클래스가 `dist/app.css`에 존재한다 (빌드 후 자동 검사)
- `tokens.css`의 토큰 수와 번들의 `--color-*` 변수 수가 일치한다 (드리프트 탐지)
- **대비비 자동 검사** — 토큰 조합(`text`/`bg`, `muted`/`surface`, `accent`/`bg`, `on-accent`/`accent`)이 WCAG AA를 통과한다. oklch → 선형 sRGB 변환 후 계산한다. 서비스별 accent를 허용했으므로 특히 중요하다. 밝은 accent 위에 흰 텍스트가 오면 읽히지 않는다
- `kit.code0987.me/v1/app.css`가 200과 올바른 `Cache-Control`을 반환한다
- 각 서비스 마이그레이션 전후 주요 화면 2~3개의 스크린샷을 비교한다

## 11. 리스크

### 11.1 조용한 실패 (주 리스크)

safelist에 없는 클래스를 쓰면 **에러 없이 스타일이 안 먹는다.** A안의 구조적 대가다.

완화책은 각 서비스 템플릿을 스캔해 번들에 없는 Tailwind류 클래스를 리포트하는 린터(`kit lint <service>`)다. **§9의 2~3단계 결과를 보고 착수 여부를 정한다** — 파일럿에서 실제로 얼마나 아픈지 확인한 뒤 판단하는 편이 낫다.

### 11.2 kit이 edge에 의존한다

edge Caddy 설정 변경 시 `kit.code0987.me` 라우팅이 함께 검증되어야 한다. edge 설계 문서에 상호 참조를 남긴다.

### 11.3 번들 크기

초반 80~120KB(brotli)는 스타일시트로는 큰 편이다. 렌더 블로킹 리소스이므로 첫 화면에 부담이 된다. 실사용 클래스 데이터를 6개월 정도 모은 뒤 safelist를 조인다.

## 12. 후속 작업

- `kit lint <service>` — 미허용 클래스 탐지 (§11.1)
- `kit.code0987.me/` 쇼케이스 페이지 — 팔레트 확인 페이지를 옮긴다
- safelist 축소 — 실사용 데이터 확보 후
- edge 설계 문서에 §4.1 예외와 §11.2 상호 참조 추가
