# kit 공용 디자인 시스템 설계

- 작성일: 2026-08-28
- 대상: `E:\Workspace\services\kit` (신규), 소비 서비스 **9개** (`mpw`·`aitg`·`iot`가 빠져 12개에서 줄었다 — §2.1)
- 상태: **1~3단계 구현 완료** (§9 참조). `agent-gate` 파일럿 결과는 `docs/2026-08-28-pilot-report.md` 참조. 전체 브랜치 리뷰 fix wave 완료 — 상세는 `.superpowers/sdd/2026-08-28-kit-plan/task-7-report.md`의 "Final review fix wave" 절 참조

## 1. 목표

서비스마다 CSS를 따로 굴리고 있어 같은 사람이 만든 서비스로 보이지 않는다. 기존 서비스 대부분이 대규모 재작성을 앞두고 있으므로, 그 김에 공용 기반을 세운다.

1. **한 제품군으로 읽히게 한다** — 표면·텍스트·타이포·간격을 전 서비스가 공유한다.
2. **한 번 바꾸면 전파된다** — 토큰을 고치면 빌드 없는 서비스는 5분 내 반영된다.
3. **AI가 같은 어휘로 UI를 짠다** — 허용 클래스 목록이 문서로 존재하고, 각 서비스 `CLAUDE.md`가 이를 참조한다.
4. **빌드 파이프라인을 늘리지 않는다** — Python 서비스에 node 빌드를 추가하지 않는다.

### 비목표

- ~~라이트 테마~~ — **철회됨.** `gallery`(8,284줄)와 `novel`이 라이트/다크를 완전히 구현하고 있어, 다크 전용을 유지하면 두 서비스를 마이그레이션할 때 라이트 모드가 사라진다. 2026-08-29에 kit에 라이트를 추가했다(§5.4). 기본은 여전히 다크이고 서비스가 `data-theme`으로 켠다.
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
| `stock` | Vite 앱(`web/`), 컴포넌트별 CSS |
| `COLLARS` | pnpm 모노레포, React, BlockNote 등 외부 UI 포함 |
| `logflare` `chzzk-auth` `novel` | 각자 개별 CSS (`aitg`·`iot`는 빠졌다 — §2.1) |

`agent-gate`와 `itad`가 이미 `--bg / --surface / --text / --muted / --accent / --success / --warning / --danger / --border / --radius`라는 사실상 동일한 이름 체계를 쓰고 있다. **새로 만드는 게 아니라 이미 수렴한 것을 계약으로 확정하는 작업이다.**

~~`profile`의 CSS가 `projects/mpw/nginx/html/profile/`에 복사되어 있다.~~ **해소됨(2026-08-29)** — `profile` 마이그레이션에서 서비스 쪽 죽은 사본 `html/`을 지웠고, `projects/mpw`는 폐기됐다(§2.1).

### 2.1 대상에서 빠진 서비스 (2026-08-29)

#### `mpw` — 폐기된 모놀리스

**`mpw`는 폐기된 모놀리스였다.** "My Personal Web" — 프로필·dulgibro 갤러리·stock을 한 FastAPI 프로세스에 묶어 돌리던 컨테이너인데, 세 서브앱이 전부 독립 서비스로 이관된 뒤 껍데기만 남아 있었다.

| `mpw` 안에서 | 지금 |
|---|---|
| `/` 프로필 | `services/profile` |
| `/dulgibro` 갤러리 | `services/gallery` (`dulgibro.pics` 서빙) |
| `/i` stock | `services/stock` (`stock-api`) |

조사 결과: 컨테이너 없음(중지된 것조차), edge Caddyfile에 라우팅 없음, 마지막 커밋 2026-05-19. 워크스페이스 재편 문서(2026-08-27)가 이미 **"멈춤"** 으로 분류해 뒀다. 미커밋 78건 중 54건이 삭제였는데 그게 바로 두 서브앱을 걷어내던 해체 작업이었고, 커밋되지 않은 채 3개월 떠 있었다.

이 문서가 `mpw`를 대상으로 잡은 근거(§2의 "Tailwind 빌드 존재 `tailwind-build/input.css`")도 실제로는 `app/internal/stock/` 것이었다 — 지금은 `services/stock` 소관이다.

**그래서 `mpw`를 §2 현황, §5.2 accent 표, §9 마이그레이션 순서에서 모두 제거했다.** 대상은 12개에서 **11개**가 되고 hue 305(purple)는 비었다 — 새 서비스가 생기면 쓸 수 있다.

`projects/mpw`와 `archive/mpw-dup`은 2026-08-29에 폐기했다(합계 270MB). 폐기 전에 로컬에만 있던 미푸시 7커밋(dulgibro 갤러리 최초 구현)을 원격에 밀어 이력을 보존했다 — https://github.com/macqueen0987/personal-web. 크롬 확장 `toss-getter`만 `archive/mpw-toss-getter/`로 건졌고, 미커밋 해체 작업도 패치로 함께 남겼다.

#### `aitg` — 웹 표면이 없다

`aitg`는 **JSON API + Discord 봇**이다. `aitg-backend`(`services/aitg/main`)와 `aitg-discordbot` 두 컨테이너가 돌고 있고 `aitg.lan.code0987.me`로 라우팅되지만, 응답이 `{"Hello":"World"}`다 — CSS도 HTML도 템플릿도 **한 개도 없다**.

디자인 시스템이 관여할 표면 자체가 없으므로 §9 마이그레이션 순서에서 뺀다. accent hue 215(azure)는 그대로 둔다 — 나중에 관리 UI가 생기면 그때 쓴다. 폐기된 `mpw`(hue 305 반납)와 다른 점이다.

대상은 **10개**가 된다.

#### `iot` — 배포돼 있지 않다

`projects/iot`는 ESP32 스케치(`arduino/esp32heater`, 파일 3개)와 홈 IoT 서버(`homeserver`, FastAPI + nginx)로 되어 있다. 서버 쪽에 HTML 8개와 CSS 354줄이 있어 표면은 존재한다.

문제는 **돌지 않는다**는 것이다. 컨테이너 없음, edge Caddyfile 라우팅 없음, 마지막 커밋 2025-01-03(총 4커밋). 그 커밋 메시지가 "실제로 동작하는 첫번째 버전 … 기본적인 기능은 다 구현됨"이고, 그 뒤로 미커밋 11건이 19개월째 떠 있다. `docker-compose.yml`의 FastAPI 이미지 줄은 주석 처리돼 있다.

마이그레이션해도 **아무도 보지 않고, 브라우저로 검증할 수도 없다** — 이 계획이 매 서비스에서 회귀를 잡아낸 방법이 라이브 화면의 computed style 대조였는데 그걸 쓸 수 없다. 그래서 뺀다.

`mpw`와는 성격이 다르다. `mpw`는 내용이 세 서비스로 이관 완료된 뒤 껍데기만 남아 폐기가 명확했지만, `iot`는 이관된 것이 아니라 **그냥 중단된 프로젝트**다. 대체물이 없으므로 폐기하지 않고 그대로 둔다. accent hue 130(lime)도 `aitg`와 같이 **반납하지 않는다** — 다시 띄우는 날 그대로 쓴다.

대상은 **9개**가 된다.

**업데이트 (2026-09-05) — iot 재합류.** 위 진단은 더 이상 최신이 아니다. `projects/iot`는 이관이 아니라 **완전히 새로 작성**돼 `macqueen0987/IoT`(Universal IR/WiFi Remote — ESP32 MicroPython 노드 + FastAPI `ir-server` + SmartThings C2C 브리지)로 라즈베리파이 위에서 실제로 돈다. `docker-compose.prod.yml` 기준 운영 중이고 커밋도 활발하다 — 위에 적힌 "esp32heater"·"homeserver"·"4커밋" 서술은 그 이전 시도를 가리키는 것으로, 지금 코드베이스와는 무관하다.

홈 대시보드(`/`)가 `kit/v1/app.css`를 로드한다. **Jinja 서비스가 아니라 정적 HTML을 직접 서빙**하므로(`FileResponse` + `StaticFiles`), `jinja/kit.html` 매크로는 쓰지 않고 `<link>`·accent `<style>`을 손으로 써 넣었다 — 내용은 매크로가 만드는 것과 동일하다. 예약해뒀던 accent hue 130(lime)을 그대로 썼다 (`--kit-accent: oklch(0.780 0.150 130)`). `jinja/consumers.json`의 `pending`에서는 뺐다(Jinja 마이그레이션 대상이 아니므로 `consumers`에도 넣지 않는다).

대상은 다시 **10개**가 된다.

**최종 리뷰 문서 정정 — `novel` 누락.** 이전 판은 위 표에서 `novel`을 빠뜨린 채 "소비 서비스 11개"로 적었는데, §5.2 accent 표와 `scripts/parse-tokens.mjs`의 `SERVICE_ACCENTS`(테스트로 12개가 고정돼 있다)는 이미 처음부터 `novel`을 포함한 12개였다 — 표·서술과 실제 코드가 어긋나 있었다. `novel`을 위 표와 §9 마이그레이션 순서에 추가해 12개로 맞춘다. `novel`이 §1 비목표에서 제외한 것은 안드로이드 앱뿐, 웹 서비스(`novel.code0987.me`, `novel-app-1`)는 원래부터 대상이었다.

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

**전용 컨테이너를 만들지 않는다.** `bundle/dist`를 edge Caddy에 볼륨 마운트하고 `file_server`로 직접 내보내는 경로는 그대로다. 기본 CDN은 GitHub Pages(`https://macqueen0987.github.io/kit/v1/…`)다. edge 마운트는 optional origin이다.

- 컨테이너가 늘지 않는다.
- 소비자는 `KIT_BASE_URL`로 origin을 고른다. 기본값은 Pages라 MacServer가 내려도 기본값 소비자는 스타일이 남는다.

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

**폰트 로드는 번들의 `@import` 한 줄이 전부 처리한다** (`bundle/src/app.css` 최상단, 최종 리뷰 C1). `<link>` 하나로 토큰 스왑과 폰트 로드가 동시에 끝난다는 원래 약속이 이제 실제로 지켜진다.

이전 판은 이 문단에서 "폰트 링크는 `kit.head()` 매크로와 번들의 `@import`가 각각 처리한다"고 서술했지만, 실제로는 번들에 폰트 `@import`가 전혀 없었다 — `tokens.css`의 `--font-sans`/`--font-mono`가 `"Noto Sans KR"`을 가리키기만 할 뿐, 그 폰트를 로드하는 코드가 번들 어디에도 없어 링크되지 않은 폰트 이름이었다. 결과적으로 모든 소비자가 `system-ui`로 조용히 대체됐고, `agent-gate` 파일럿만 예외적으로 문제없어 보였던 것은 그 서비스의 HTML이 폰트 `<link>` 태그를 손으로 추가해 이 결함을 가렸기 때문이다. 이번 리뷰에서 `bundle/src/app.css`에 아래 `@import`를 추가해 그 약속을 실제로 지키게 했다.

```css
@import url("https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&family=Noto+Sans+Mono:wght@400;500;600&display=swap");
```

CSS 명세상 `@import`는 `@charset`과 블록 없는(empty) `@layer` 순서 선언을 제외한 모든 규칙보다 앞서야 하므로, 이 줄은 `app.css`의 다른 `@import`들보다도 위에 있다. `pnpm build` 후 `bundle/dist/app.css`를 직접 열어 이 `@import`가 파일 맨 앞부분에 그대로 살아 있는지, Tailwind 빌드가 순서를 바꾸거나 규칙을 지우지 않았는지 매번 확인한다(`tests/bundle.test.mjs`의 "C1" 테스트가 자동으로 이를 검사한다).

**Jinja `kit.head()` 매크로는 아직 구현되지 않았다**(§9 참조 — `itad` 마이그레이션에서 최초 구현). 지금은 번들의 `@import` 하나가 폰트 로드 전체를 책임진다. 매크로가 생기더라도 `head()`는 `<link rel="stylesheet">` 자체를 내보내는 역할만 하고, 폰트는 계속 번들 안에서 처리된다 — 매크로가 폰트를 별도로 로드하지 않는다.

소비 서비스는 속도를 위해 자체 `preconnect` 힌트(`fonts.googleapis.com`, `fonts.gstatic.com`)를 추가할 수 있지만, 폰트 `<link>` 자체를 추가할 필요는 더 이상 없다.

### 5.2 서비스별 accent

L을 0.780으로 고정하고 hue만 돌린다. 그래서 어느 서비스를 열어도 강조색의 무게감이 같다.

| 서비스 | hue | chroma | 별칭 |
|---|---|---|---|
| `agent-gate` | 185 | 0.130 | teal (기본값) |
| `aitg` | 215 | 0.125 | azure |
| `logflare` | 240 | 0.135 | blue |
| `profile` | 285 | 0.115 | violet |
| `gallery` | 75 | 0.090 | gold (원래 330 magenta — §5.3) |
| `novel` | 20 | 0.140 | rose |
| `itad` | 55 | 0.150 | orange |
| `iot` | 130 | 0.150 | lime |
| `chzzk-auth` | 160 | 0.150 | spring |

### 5.3 `gallery`의 accent를 330에서 75로 옮긴 이유

원래 배정은 330(magenta)이었으나 실제 사이트는 채도를 낮춘 골드 `oklch(0.738 0.075 79)`를 쓰고 있었다. 사진 갤러리라 강조색이 사진과 색으로 경쟁하면 안 되기 때문에 의도적으로 고른 값이다. 마이그레이션에서 그 판단을 뒤집을 근거가 없었다.

그래서 정체성을 유지하되 kit 규율(L 0.780 고정, chroma 0.09~0.13) 안으로 들여왔다 — `oklch(0.780 0.090 75)`. chroma는 허용 범위의 하한을 쓴다.

hue 75는 `itad`(55)에서 정확히 20도, `iot`(130)에서 55도 떨어져 "서로 20도 이상"이라는 규칙을 그대로 통과한다(`tests/tokens.test.mjs`가 검사한다).

### 5.3.1 `stock`이 표에서 빠진 이유 (2026-08-29)

표는 11개에서 **10개**가 됐다. `stock`이 kit에서 accent를 받지 않기로 했기 때문이다 — 비는 hue는 95(amber), 305(purple), 330(magenta) 셋이다.

배정값은 amber(95)였지만 실제 서비스는 Toss 파생 핀테크 블루 `#3182f6`(oklch 0.620 0.191 258)를 쓰는 라이브 대시보드였다. 근거가 두 겹이다.

1. **이 앱에서 파랑은 의미를 짊어진다.** `--color-negative`(하락)가 accent와 똑같은 `#3182f6`이다. 한국 증시 관례로 빨강이 상승, 파랑이 하락이다.
2. **배정된 amber를 채택하면 자기 warning과 부딪힌다.** `stock`의 `--color-warning`은 hue 73이라 accent 95와 22도밖에 안 떨어진다 — 밀집한 거래 화면에서 강조와 경고가 같은 색 계열이 된다.

그런데 블루를 유지하면 kit의 hue 배정 규칙을 지킬 수 없다. 258은 `COLLARS`(265)와 **6.8도**, `logflare`(240)와 **18.2도**라 둘 다 20도 미만이다. `gallery`처럼 "정체성을 유지하되 kit 규율 안으로 들여오는" 타협이 불가능한 이웃 배치다.

**해소 방법은 규칙의 적용 범위를 정확히 적는 것이었다.** 이 규칙이 존재하는 이유는 *kit이 색을 배정할 때 서비스끼리 구별되게* 하는 것이다. `stock`은 `--kit-accent`를 주입하지 않고 자기 `:root`에서 `--color-accent`를 직접 정의하므로 애초에 배정 대상이 아니다. 표에서 빼는 것이 예외를 만드는 것이 아니라 **원래의 범위를 명시하는 것**이다.

이것은 §7.3의 토큰 전용 진입점과 짝을 이루는 판단이다 — `stock`은 kit에서 중립 표면과 타이포만 가져가고 accent·의미색·폰트·radius는 자기 것을 유지한다.

이 변경은 **마이그레이션 대상 서비스가 kit의 배정보다 더 나은 근거를 갖고 있을 때 kit 쪽을 고친다**는 선례다. 반대로 `profile`은 자기 팔레트를 kit에 맞춰 전면 교체했다 — 그쪽은 서비스에 색을 고른 근거가 없었기 때문이다.

### 5.3.2 `COLLARS`도 표에서 빠졌다 (2026-08-29)

표는 10개에서 **9개**가 됐다. 비는 hue는 95(amber), 265(indigo), 305(purple), 330(magenta) 넷이다.

`stock`은 accent만 자기 것을 썼지만 `COLLARS`는 **팔레트 체계 전체가 kit 밖에 있다.** 실측은 §7.2에 있다 — kit 클래스 정확 일치 0건, `var()` 466개 중 kit 이름 0개.

배정값 indigo(265)는 실제와 어긋나 있었다. 진짜 primary는 teal `oklch(0.557 0.095 206)`로 배정에서 **58.9도** 떨어져 있고, 그 자체로 `aitg`(215)와 **8.9도**라 20도 규칙을 통과하지도 못한다. 표에 남겨둘 근거가 없다.

**두 사례에서 같은 것이 드러났다.** §5.2의 accent 표는 마이그레이션을 시작하기 전에 만들어졌고, 실제 서비스를 열어보지 않은 항목이 섞여 있었다. `gallery`(330→75), `stock`(95→제외), `COLLARS`(265→제외) 셋 다 같은 이유로 고쳐졌다 — **배정이 관찰보다 먼저 있었다.** 남은 9개 중 실제로 kit이 색을 배정해 적용한 것은 마이그레이션을 마친 서비스들이고, 아직 적용되지 않은 `aitg`(215)·`iot`(130)는 그 서비스를 실제로 열어볼 때 같은 검토를 거쳐야 한다.

### 5.4 라이트 테마 (2026-08-29 추가, §1 비목표 철회)

`gallery`와 `novel`이 라이트/다크를 완전히 구현하고 있어, 다크 전용을 유지하면 두 서비스는 마이그레이션할 수 없었다. `bundle/src/themes.css`에 라이트 팔레트를 넣었다.

**기본은 다크이고 `prefers-color-scheme`을 따르지 않는다.** 이미 마이그레이션한 서비스들이 다크를 전제한 값을 레이어 밖에 갖고 있어(`chzzk-auth`의 배경 그라데이션, `profile`의 배너) 시스템 설정만 보고 뒤집으면 예고 없이 깨진다. `<html data-theme>` 네 상태로 서비스가 고른다 — 없음/`dark`(다크), `light`, `auto`(시스템).

**accent 주입점이 `--kit-accent`로 바뀌었다.** 라이트에서는 같은 hue·chroma를 유지한 채 L을 0.780에서 0.520으로 낮춰야 하는데(다크용 L을 흰 바탕에 쓰면 링크 글자가 2:1도 안 나온다), 자기 참조 순환을 피하려면 서비스가 고르는 씨앗과 kit이 계산해 내보내는 값을 분리해야 한다. 상세는 `AGENTS.md` §6.

`light-dark()`는 쓰지 않았다 — 미지원 브라우저에서 선언이 통째로 무효가 되어 토큰이 사라진다. 공개 서비스(`profile`, `gallery`)가 있으므로 중복을 감수하고 팔레트를 두 벌 적었다.

라이트 팔레트는 다크와 **같은 대비 게이트**를 통과한다(`tests/light-theme.test.mjs`).

서비스는 `<html style="--color-accent: oklch(0.780 0.150 55)">` 한 줄로 재정의한다. Jinja 쪽은 `kit.head(accent=...)` 매크로가 처리한다.

확인용 팔레트 페이지: https://claude.ai/code/artifact/eaee59c8-66b4-49f2-b501-2db4c81d3120 — 이 페이지는 구현 시 `kit.code0987.me/` 쇼케이스로 옮긴다.

## 6. 번들

### 6.1 safelist 정책

| 축 | 허용 |
|---|---|
| 색 | **kit 토큰만.** Tailwind 기본 팔레트 전체 제외 |
| 간격 (p/m/gap, 방향별) | `0 0.5 1 1.5 2 2.5 3 3.5 4 5 6 8 10 12 16` |
| `space-x/y` | `0 1 2 3 4 6 8` — p/m/gap과 별개 스케일이다(전 방향과 동일하지 않다) |
| 타이포 | `text-xs`~`text-7xl`, weight 4종, leading 3종, tracking 3종 |
| 레이아웃 | flex/grid/position/z/overflow 전반, `grid-cols-{1..6,12}`(12를 건너뛰지 않는다), `col-span-{1..4,full}`, `w-full`, `max-w-*` |
| 크기 | `w/h/min-w/min-h`의 숫자 스케일(`4~64`, `11` 포함, 축마다 `full/auto/fit/screen` 지원 범위가 다르다), `size-*`는 `4~12`**만**(16 이상 없음), `w-{1/2,1/3,2/3,1/4,3/4}` — 축별 정확한 값은 `AGENTS.md` §2(safelist.css에서 직접 검증된 표)를 따른다 |
| 형태 | `rounded{,-xs,-sm,-md,-lg,-xl,-full,-none}`, `border{,-0,-2,-t,-r,-b,-l}`, `shadow-{sm,md,lg,none}` |
| 기타 | `opacity-*`, `transition-*`, `cursor-*` |
| variant | `hover: focus-visible: active: disabled: group-hover: md: lg:` — **`sm:`/`xl:`는 의도적으로 없다**(아래 참조) |

이 표는 `AGENTS.md` §2의 요약이다. `AGENTS.md`가 `safelist.css`와 대조해 검증된 1차 문서이므로, 둘이 어긋나면 이 표를 고친다.

**최종 리뷰 문서 정정.** 이전 판은 이 표가 실제 `safelist.css`와 네 군데 어긋나 있었다 — `grid-cols`가 실제로는 `1~12` 전체가 아니라 `1..6,12`(7·8·9·10·11이 없다), `space-x/y`가 `p/m/gap`과 같은 스케일인 것처럼 "전 방향"으로 뭉뚱그려져 있었지만 실제로는 `0 1 2 3 4 6 8`로 다른 스케일, `size-*`가 `4~64`가 아니라 `4~12`만, `border` 목록에 `-2`(두께 2px)가 빠져 있었다. `AGENTS.md`는 이 네 항목 모두 처음부터 정확했다 — 이번에 스펙 쪽을 `AGENTS.md`에 맞춰 고쳤다.

**최종 리뷰 C2 — breakpoint 커버리지를 넓히고 `sm:`/`xl:`는 뺐다.** 이전 판은 `md:`/`lg:`가 `block flex grid hidden grid-cols-1..4` 8개 클래스에서 그쳐, 반응형 대시보드를 표현할 수 없었다. `md:`/`lg:`에 간격(`p/px/py/m/mx/my/gap`), `flex-{row,col}`, `w-{full,auto}`, `col-span-*`, `text-{sm,base,lg,xl,2xl}`, `items-*`, `justify-*`를 추가했다(`bundle/src/safelist.css` 참조). `sm:`/`xl:`는 이 표의 이전 판이 나열하고 있었지만 실제로 생성된 적이 없었다 — 지금까지 어떤 마이그레이션에서도 필요했던 사례가 없어(`agent-gate` 파일럿도 `md:`/`lg:`까지만 요구했다), §9.1의 "필요한데 없는 클래스는 스케일 단위로만 반영한다, 개별 선제 추가 금지" 원칙을 breakpoint 축에도 그대로 적용해 뺐다. 다음 마이그레이션에서 실제로 필요해지면 그때 이번에 넓힌 범위와 동일하게 스케일 단위로 추가한다.

`agent-gate` 파일럿(`docs/2026-08-28-pilot-report.md`)에서 하프스텝 간격(`gap-2.5` 등), `min-w`/`min-h`의 숫자 스케일 전체, 4px 라디우스 단계(`rounded-xs`)가 비어 있음이 드러나 채웠다. **체크박스/토글 컴포넌트는 여전히 없다** — kit에 대응하는 유틸리티·컴포넌트 클래스가 전혀 없어, 폼에 체크박스가 있는 서비스는 소규모 커스텀 CSS를 남길 수밖에 없다. §12의 후속 작업 최우선 항목이다.

brotli 압축 후 **7.0KB**(파일럿 gap-fill 기준), 최종 리뷰의 C1 폰트 `@import`와 C2 breakpoint 확장 이후 **7.7KB**(raw 62.8KB)로 실측됐다 — 스펙 초안의 80~120KB 예상은 여전히 실측 대비 자릿수 하나가 틀렸다. 렌더 블로킹 부담이 사실상 없는 수준이라, "실사용 데이터가 쌓이면 걷어낸다"는 축소 계획은 근거를 잃었다(§11.3, §12 참조). 초반에 유틸리티 범위를 넉넉히 유지하는 정책 그대로 간다.

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
.alert  .alert-{ok,warn,danger}
.badge  .badge-{accent,ok,warn,danger}
.table
.empty
.pagination
```

**최종 리뷰 I2 — 베이스 클래스 + 모디파이어 조합이 필수인 것과 아닌 것을 구분한다.** 이전 판은 `.alert`(베이스: padding, flex, `border-left-width`)를 표에서 아예 빼먹고 `.alert-{ok,warn,danger}`만 적었다 — `<div class="alert-ok">`만 붙이면 padding 없이 눌린 채로 렌더되고 `border-left`도 투명해 보이지 않는다. `.badge`도 같은 함정이다: 베이스(`.badge`)는 padding·모양만 정의하고 배경·글자색은 모디파이어(`.badge-{accent,ok,warn,danger}`)가 낸다 — `.badge`만 쓰면 색 없는 투명한 알약이 남는다. `.btn`도 마찬가지로 색은 `.btn-{primary,ghost,danger}`가 낸다.

- **베이스+모디파이어 둘 다 필요**: `.alert`+`.alert-*`, `.badge`+`.badge-*`, `.btn`+`.btn-*`.
- **베이스만으로 완결**: `.card`(배경·테두리·radius가 이미 있다 — `.card-header`/`.card-body`는 모디파이어가 아니라 선택적 자식 구조), `.input`/`.select`/`.textarea`, `.table`, `.empty`, `.pagination`.

## 7. 소비 경로

```
tokens/tokens.css ──┬─→ bundle/dist/app.css    → <link> → Jinja 서비스 8개
                    └─→ bundle/dist/tokens.css → <link> → stock/web (§7.3)
```

### 7.1 빌드 없는 서비스 (Jinja 8개)

`code0987-kit` pip 패키지를 설치하고 템플릿에서 매크로를 쓴다. (`mpw` 폐기로 9개에서 8개가 됐다 — §2.1.)

```jinja
{{ kit.head(accent="oklch(0.780 0.150 55)") }}
```

이 한 줄이 번들 `<link>`, Google Fonts 링크와 `preconnect`, accent 주입을 처리한다. **CDN URL이 서비스 코드에 하드코딩되지 않는다.** v2로 옮기거나 도메인이 바뀌어도 pip 패키지만 올리면 9개가 따라온다.

매크로: `head()` `header()` `nav()` `button()` `badge()` `alert()` `empty_state()` `pagination()`

### 7.2 React preset은 만들지 않는다 (2026-08-29 폐기)

이전 판의 이 절은 "빌드 있는 앱(COLLARS, stock/web)에 `@code0987/kit` preset을 쓴다"였다. **두 후보가 모두 사라져 소비자가 0이 됐다.** `react/`는 미구현 상태로 남고, 그대로 둔다.

- **`stock/web`은 React가 아니었다.** `.tsx` 0개, Tailwind 설정 없음, 순수 TypeScript + Vite다. preset은 Tailwind 빌드를 전제하므로 줄 것이 없다. 실제 경로는 §7.3이 됐다.
- **`COLLARS`는 React지만 kit의 소비자가 아니다.** 아래 표가 근거다.

| 재는 것 | `COLLARS` |
|---|---|
| kit 클래스 정확 일치 | **0건** |
| `var()` 참조 466개 중 kit 이름 | **0개** (`--mantine-*` 383, `--collars-*` 82) |
| 인라인 `style={{}}` | 666곳 |
| 리터럴 `className` | 33곳 (28종, 전부 `collars-*`/`bn-*`/`editor-*`) |
| 스타일 기반 | Mantine 7 + BlockNote(Mantine variant) |

`stock`은 자기 `:root` 팔레트가 있어 kit으로 갈아끼울 대상이 있었지만, `COLLARS`는 팔레트를 Mantine이 TS 테마(`createAppMantineTheme`)에서 **생성**하는 `--mantine-color-*`로 갖는다 — 갈아끼울 `:root` 블록 자체가 없다. 게다가 **Mantine은 색당 10단계 튜플을 요구하는데 kit은 단일 accent와 중립 8단계만 준다.** 구조가 맞지 않는다.

kit이 줄 수 있다고 생각했던 것들이 이미 그 앱에 더 완성된 형태로 있다.

| kit이 주는 것 | `COLLARS`가 이미 가진 것 |
|---|---|
| 중립 표면 8단계 | Mantine `gray`/`dark` 10단계 |
| 라이트 테마(`data-theme` 4상태) | `defaultColorScheme="auto"` + `cssVariablesResolver` + 사용자 설정 UI |
| 컴포넌트 클래스 | Mantine 컴포넌트 |
| 단일 accent | 손으로 맞춘 10단계 브랜드 튜플 |
| `--font-sans` | 이미 Noto Sans KR |

브랜드 색(forest `#004d40` → teal `#00838f` → gold `#b28704`)은 랜딩 히어로 아트워크에 묶여 있어 기계적으로 대체할 수도 없다 — `collarsTealPalette`의 주석이 "aligned with landing"이라고 명시한다.

**여기서 배운 것**: "빌드가 있는가"는 통합 방식을 정하는 기준이 아니었다. 실제 기준은 **소비자가 자기 디자인 시스템을 갖고 있는가**다. §7.3의 판단 규칙(kit 클래스를 정확 일치로 세기)이 그것을 재는 방법이고, 두 앱 모두 0이 나왔다.

### 7.3 자기 컴포넌트 체계가 있는 앱 — 토큰 전용 진입점 (2026-08-29 신설)

```
kit.code0987.me/v1/tokens.css      2.2KB, :root 선택자만
```

`app.css`(70KB)와 같은 `tokens/tokens.css`·`themes.css`를 읽지만 **Preflight·컴포넌트·유틸리티가 없다.** 담긴 것은 `@layer theme` 안의 `:root` 계열 선택자뿐이고, 요소 규칙이 0개라는 것을 `tests/tokens-entry.test.mjs`가 고정한다. 라이트 테마(`data-theme` 네 상태)는 그대로 들어 있다.

**어느 쪽을 쓸지 정하는 규칙**: 소비자 마크업에서 kit 클래스를 **정확 일치로** 세어 0이면 `tokens.css`, 하나라도 있으면 `app.css`.

`stock/web`이 첫 소비자이자 이 진입점이 생긴 이유다.

| 재는 것 | 값 |
|---|---|
| kit 클래스 정확 일치 | **0건** (자체 `ui-btn`/`ui-card`/`ui-input`/`ui-badge`) |
| CSS 규모 | 5,192줄 / 14파일 |
| `<p>` 사용 / `p` 선택자 | 129곳 / **2개** |
| `h2`·`h3`·`h4` 사용 / 선택자 | 25곳 / 4개 |
| `ul`·`li` 사용 / 선택자 | 28곳 / 2개 |

즉 `app.css`를 물리면 **얻는 것은 토큰뿐인데 비용은 Preflight**이고, 브라우저 기본값에 기대는 자리가 많아 §11.1이 말하는 조용한 실패가 렌더해 보지 않은 라우트에서 터진다. 실제로 `<link>`를 브라우저에서 주입해 계산된 스타일을 전후 대조했을 때 회귀 1건(`p.calendar-shell__status`의 아래 마진 소실)이 확인됐고, 그건 렌더된 한 화면에서만 나온 수치다.

**토큰 전용을 쓸 때 걸린 함정 두 가지** (둘 다 `stock/web`에서 실제로 겪었다).

1. **kit 값을 받으려면 그 이름을 서비스에서 지워야 한다.** kit 토큰은 `@layer theme` 안이고 서비스의 `:root`는 레이어 밖이라, 같은 이름을 서비스가 적어두면 로드 순서와 무관하게 서비스가 이긴다. `stock`은 `--color-bg`/`surface`/`border`/`border-strong`/`text`를 **삭제**해서 kit이 채우게 했다.

2. **canvas 계열 라이브러리에 토큰 값을 그대로 넘기면 안 된다.** 토큰은 `oklch(72% .012 285)` 형태인데 `lightweight-charts`는 브라우저가 아니라 자체 색 파서를 쓰고 거기엔 oklch가 없다 — `Failed to parse color: oklch(...)`로 차트가 통째로 죽었다. **canvas의 `fillStyle`은 oklch를 받아들이므로 그것으로 확인하면 이 실패가 보이지 않는다**(실제로 그렇게 확인했다가 놓쳤다). 1x1 캔버스에 칠하고 `getImageData`로 픽셀을 읽어 `#rrggbb`로 바꿔 넘긴다 — 브라우저를 파서가 아니라 **변환기**로 쓰는 것이다. 구현은 `services/stock/web/src/lib/chartTheme.ts`.

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

신선도는 5분이지만 **전파가 5분이라는 뜻은 아니다** — `stale-while-revalidate=86400` 때문에 실제 최대 지연은 24시간이다(§11.6). `stale-if-error`가 있어 origin이 죽어도 Cloudflare가 일주일치 사본을 계속 내준다. 급하면 Cloudflare purge로 즉시 반영한다.

**Cloudflare 캐시 룰이 필수다.** Caddy가 위 `Cache-Control` 헤더를 정확히 보내도, Cloudflare 존에 캐시 룰이 없으면 Cloudflare가 존 전역 기본값(Browser Cache TTL)으로 그 값을 조용히 재작성한다 — 실제로 `max-age=300`이 `max-age=14400`(4시간)으로 바뀌는 것을 확인했다(Task 4, `docs/2026-08-28-pilot-report.md` §4.4). 응답은 200이고 헤더 이름도 그대로라 `curl`로 헤더 존재만 확인하면 놓친다. `kit.code0987.me` 호스트명 한정으로 `http_request_cache_settings` 페이즈에 캐시 룰을 만들어 `browser_ttl`/`edge_ttl`을 `respect_origin`으로 설정해야 origin이 보낸 값이 그대로 나간다 — 존 전역이 아니라 이 호스트명에만 적용되고 룰 삭제로 즉시 되돌릴 수 있다.

### 8.3 파괴적 변경의 정의

- **파괴적이 아님**: 토큰 *값* 변경. 색이 바뀌는 것은 의도한 동작이다.
- **파괴적임**: 토큰·컴포넌트 클래스의 **삭제 또는 개명**. 이때만 major를 올린다.

이 규칙이 없으면 매번 "이건 v2인가?"로 시간을 쓴다.

**최종 리뷰 I1 — `--kit-radius` 도입은 이 규칙상 파괴적이 아니다.** `tokens.css`에 프라이빗 토큰 `--kit-radius`(값은 `--radius`와 동일한 `0.625rem`)를 추가하고, `components.css`의 `.btn`/`.card`/`.input`,`.select`,`.textarea`/`.alert`가 `var(--radius)` 대신 `var(--kit-radius)`를 참조하도록 바꿨다. 기존 토큰(`--radius`)은 이름도 값도 그대로 남아 있고 계속 공개 내보내진다 — 삭제도 개명도 아니므로 추가일 뿐이다. 동기는 §9.1의 2번 항목이 지적하던 그림자 문제(소비 서비스가 자기 `:root`에서 `--radius`를 재정의하면 kit 컴포넌트의 모양이 조용히 따라 바뀌고 빠져나갈 방법이 없었다)를 kit 컴포넌트 클래스에 한해 근본적으로 없앤 것이다. Tailwind가 직접 생성하는 유틸리티 클래스(`rounded`, `rounded-lg` 등)는 여전히 공개 `--radius`/`--radius-*`를 참조한다 — 소비자가 그 토큰을 재정의해 자기 페이지의 `rounded` 계열 유틸리티를 바꿀 수 있어야 하므로, 이건 의도한 동작이다.

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
5. `profile` — 가장 오래된 CSS. 서비스 안의 죽은 사본 `html/`을 함께 제거한다
6. `gallery` → `logflare` → `chzzk-auth` → `novel`
7. `stock/web` → `COLLARS` — React. COLLARS는 BlockNote 등 외부 UI와 얽혀 가장 복잡하므로 마지막

각 단계는 독립 커밋으로 되돌릴 수 있어야 한다.

**첫 구현 계획의 범위는 1~3단계까지였고, 완료됐다.** 4단계 이후는 파일럿에서 나온 safelist 수정과 매크로 API 변경을 반영한 뒤 별도 계획으로 쪼갠다. 전 서비스 마이그레이션을 하나의 계획에 담으면 앞단의 학습이 뒷단에 반영되지 않는다.

**완료 (2026-08-29).** 위 순서는 그대로 지켰지만 7단계가 계획과 다르게 끝났다 — 두 앱 모두 `<link>`를 걸지 않았다.

| | 결과 |
|---|---|
| 완료 9 | `agent-gate` `itad` `profile` `chzzk-auth` `gallery` `novel` `logflare` `stock/web` + kit 자체 |
| 제외 4 | `mpw`(폐기) `aitg`(웹 표면 없음) `iot`(배포 안 됨) `COLLARS`(자체 시스템 — §7.2) |

7단계의 전제였던 "React니까 preset"은 두 앱 모두에서 틀렸다. `stock/web`은 React가 아니었고(§7.3), `COLLARS`는 React지만 kit이 줄 것이 없었다(§7.2). **통합 방식을 가르는 기준은 빌드 파이프라인의 유무가 아니라 소비자가 자기 디자인 시스템을 갖고 있는지였다.**

**최종 리뷰 문서 정정 — `novel`이 6단계에 빠져 있었다.** §5.2 accent 표와 `SERVICE_ACCENTS`(테스트로 12개 고정)는 처음부터 `novel`(hue 20, rose)을 포함했는데, 이 마이그레이션 순서와 §2 현황 표에서만 누락돼 "12개 accent인데 11개 서비스"라는 어긋남이 있었다. `novel`을 6단계 끝에 추가해 12개로 맞췄다 — 순서상 `chzzk-auth` 다음, `stock/web`·`COLLARS`(React, 7단계) 이전에 둔 것은 `novel`도 나머지 6단계 서비스처럼 빌드 파이프라인이 없는 서비스이기 때문이다. 이로써 §7의 "Jinja 서비스" 목록도 실제 개수와 맞아떨어진다 — 이전 판은 8개만 나열해놓고 9개라고 적어 여기서도 어긋나 있었다. (`mpw`가 빠지면서 지금은 8개다 — §2.1.)

### 9.1 표준 마이그레이션 절차

파일럿(§9-2·3, `docs/2026-08-28-pilot-report.md`)에서 드러난 것을 다음 서비스부터 절차로 못박는다. 순서가 중요하다 — 1번을 건너뛰면 이후 모든 단계에서 "클래스를 붙였는데 스타일이 안 먹는다"는 진단하기 어려운 실패를 만난다.

**최종 리뷰 C3 — 0단계(암묵적이지만 결코 무해하지 않다): kit의 `<link>`를 건다.** 아래 3번을 "`:root` 토큰만 교체하므로 HTML·JS 무변경, 즉 안전하고 눈에 띄지 않는 단계"라고 읽으면 안 된다 — 그보다 먼저, `<link>`를 붙이는 순간 kit이 번들에 포함한 **Tailwind Preflight 전체**가 페이지에 들어온다(§11.4 참조). Preflight는 `*{margin:0;padding:0;border:0 solid}`, `h1`~`h6`의 크기·굵기를 `inherit`로 리셋, `ol,ul,menu{list-style:none}`, `img,svg,video{display:block}`, `a{text-decoration:inherit}` 등 브라우저 기본 스타일을 광범위하게 지운다. `agent-gate` 파일럿은 원래 자체 전역 리셋을 갖고 있어 이 낙차가 드러나지 않았지만, 다음 마이그레이션 대상인 `itad`는 `src/dashboard/static/style.css`에 `*{box-sizing:border-box}` 하나뿐이고 템플릿의 헤딩·리스트가 전부 브라우저 기본값에 의존한다 — `<link>`만 붙여도 헤딩이 본문 크기로 줄고, 리스트 마커가 사라지고, 이미지 여백이 바뀌고, 링크 밑줄이 없어진다. Preflight는 제거하지 않는다 — kit이 Tailwind v4 기반인 이상 전제조건이고, 서비스가 자기 헤딩·리스트 스타일을 이미 갖고 있다면 그 규칙이 (1번을 따랐을 때) 어차피 나중에 로드돼 이긴다. `<link>`를 붙이기 전후로 반드시 강제 새로고침 스크린샷을 남겨 이 낙차를 미리 예상한다.

1. **서비스 CSS의 전역 리셋·범용 규칙을 `@layer base`로 감싼다 — 감싸는 대상은 리셋뿐, 서비스 스타일시트 전체가 아니다.** kit 번들은 Tailwind v4라 모든 규칙이 `@layer` 안에 있는 반면, 마이그레이션한 서비스 8개(`stock/web`은 토큰만 쓰므로 §7.3, `COLLARS`는 대상이 아니므로 §7.2 제외)는 전부 레이어 없는(unlayered) 평범한 CSS다. CSS Cascading Layers 명세상 레이어 없는 일반 선언은 명시도·소스 순서와 무관하게 레이어 안의 어떤 선언보다 항상 이긴다 — 즉 `*,*::before,*::after{margin:0;padding:0}` 같은 흔한 리셋 하나가 kit의 모든 `@layer components`/`@layer utilities` 클래스를 그 속성에 한해 통째로 무력화한다(§11.1 참조). 리셋을 kit과 같은 이름의 `@layer base`로 감싸면, kit의 `<link>`가 먼저 로드되는 한 같은 레이어 안에서 소스 순서가 다시 유효해져 서비스 쪽 리셋이 계속 이기면서도 kit의 컴포넌트·유틸리티가 정상 동작한다. **경계를 지킨다(최종 리뷰 I4)**: `.btn`/`.card`/`.input` 같은 서비스 고유 오버라이드 규칙은 `@layer`로 감싸지 않고 레이어 없이 그대로 둔다. 서비스 스타일시트 전체를 통째로 `@layer base`로 감싸버리면 그 오버라이드들도 함께 레이어 안에 들어가 버려, kit의 `@layer components`가 명시도와 무관하게 오히려 서비스를 이기기 시작한다 — 정확히 §11.1이 경고하는 우선순위 역전이 이번엔 서비스 쪽에서 일어난다. `@layer base { ... }`는 전역 리셋·범용 UA 재정의 블록만 좁게 감싸고, 서비스가 kit을 의도적으로 오버라이드하는 규칙은 밖에 남긴다.
2. **서비스 `:root`의 변수명이 kit `@theme`가 내보내는 이름(`--radius`, `--radius-sm` 등 Tailwind 기본 테마 이름 포함)과 겹치는지 확인한다.** 겹치면 서비스 쪽 정의가 나중에 로드되어 kit이 의도한 값을 가린다. agent-gate의 `--radius`·`--radius-sm` 재정의가 실례다 — 안전한 값이 필요하면 서비스가 재정의하지 않은 이름(예: kit의 `--radius-xs`)을 쓴다. **최종 리뷰 I1 — kit 컴포넌트 클래스(`.btn`/`.card`/`.input`,`.select`,`.textarea`/`.alert`)는 이 문제에서 이미 벗어났다**(§8.3 참조) — 내부적으로 공개 `--radius`가 아니라 소비자가 재정의할 이유가 없는 프라이빗 `--kit-radius`를 쓰기 때문이다. 이 항목이 여전히 유효한 이유는 Tailwind가 직접 생성하는 유틸리티 클래스(`rounded`, `rounded-lg` 등)가 계속 공개 `--radius`/`--radius-*`를 참조하도록 의도돼 있어서다 — 그 유틸리티들에는 이 확인이 그대로 필요하다.
3. `:root` 토큰만 kit 매핑으로 교체한다. 기존 서비스가 `var(--bg)` 같은 짧은 이름을 쓰고 있었다면 그대로 두고 kit `--color-*`로 리다이렉트만 한다. **"HTML·JS 무변경"은 마크업·스크립트를 건드리지 않는다는 뜻일 뿐, 화면이 이전과 똑같아 보인다는 뜻이 아니다** — 렌더링에 실제로 영향을 주는 사건은 이미 0단계에서 일어났다(Preflight). 이 단계 자체(색상 변수 리다이렉트)는 안전하지만, 그 안전함을 "`<link>` 하나 걸었을 뿐인데 왜 헤딩 크기가 바뀌었지?"라는 관찰과 혼동해 원인을 색 토큰 쪽에서 찾는 일이 없어야 한다.
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

**초안의 80~120KB(brotli) 예상은 틀렸다.** 실측은 raw 47.8KB / brotli **6.8KB**(Task 3 기준)이고, 파일럿에서 safelist를 확장한 뒤 raw 50.8KB / brotli **7.0KB**, 최종 리뷰의 C1(폰트 `@import`)·C2(breakpoint 확장) 이후 raw **62.8KB** / brotli **7.7KB**다 — 예상의 약 1/10~1/15 수준으로, 여전히 자릿수 하나가 틀렸다. Task 3 리뷰가 safelist의 카테시안 전개 완전성(색 39/39, 상태 variant 21/21, breakpoint 8/8, 간격 13/13)을 전수 검증했으므로 이는 safelist가 부실해서가 아니라 애초의 추정 자체가 근거 없이 컸던 것이다.

brotli 7~8KB는 렌더 블로킹 부담이 사실상 없는 수준이다. 이 항목은 더 이상 리스크가 아니다 — §12의 "safelist 축소" 후속 작업도 이 실측 앞에서 근거를 잃어 제거한다.

### 11.4 kit이 Tailwind Preflight 전체를 들여온다 (최종 리뷰 C3)

빌드된 `dist/app.css`의 `@layer base`에는 Tailwind의 표준 Preflight가 그대로 들어 있다. 최소한:

```
*, ::before, ::after { box-sizing: border-box; }
* { margin: 0; padding: 0; border: 0 solid; }
h1, h2, h3, h4, h5, h6 { font-size: inherit; font-weight: inherit; }
ol, ul, menu { list-style: none; }
img, svg, video { display: block; }
a { text-decoration: inherit; }
```

이전 판의 스펙 §9.1은 "`:root` 토큰만 교체(HTML·JS 무변경)"를 안전하고 눈에 띄지 않는 단계로 서술했는데, 이는 Preflight를 빠뜨린 서술이다 — **kit의 `<link>`를 붙이는 행위 자체가 이미 헤딩·리스트·이미지·링크의 렌더링을 바꾼다**, 토큰 스왑을 하기도 전에. `agent-gate` 파일럿은 자체 전역 리셋을 이미 갖고 있어 이 낙차가 가려졌지만, 다음 대상 `itad`는 `src/dashboard/static/style.css`에 `*{box-sizing:border-box}` 하나뿐이라 템플릿의 헤딩·리스트가 전부 브라우저 기본값에 의존한다 — `itad`에서는 이 낙차가 처음으로 실전에서 드러날 것이다.

Preflight는 제거하지 않는다 — kit이 Tailwind v4를 베이스로 쓰는 이상 존재가 전제조건이고(§3 결정 사항), 서비스가 자기 헤딩·리스트 스타일을 갖고 있다면 §9.1 1번을 따랐을 때 그 규칙이 나중에 로드돼 이긴다. 대신 **§9.1에 0단계로 이 사실을 명문화**하고, `AGENTS.md`에도 Preflight가 재설정하는 항목을 표로 남겨 마이그레이션 전 기대치를 맞춘다.

### 11.5 `@layer` 순서가 로드 순서에 암묵적으로 의존했다 (최종 리뷰 I4)

`bundle/src/app.css`는 `@import "tailwindcss"`가 내부적으로 만드는 `@layer properties, theme, base, components, utilities` 블록들의 **첫 등장 순서**에만 의존했고, 그 순서를 명시적으로 선언하는 문이 없었다. kit 번들 혼자 로드될 때는 문제가 없지만(파일 안에서 순서가 이미 고정돼 있으므로), Vite 소비자(`stock/web`)처럼 자기만의 named layer를 쓰는 CSS를 kit보다 먼저 로드하는 페이지에서는, 전체 문서에서 레이어 이름이 처음 언급된 순서가 최종 우선순위를 정한다 — kit이 나중에 로드되면 kit 5개 레이어끼리의 상대 순서가 다른 문서의 개입으로 흔들릴 수 있었다.

CSS Cascading and Layers 명세는 "`@import` 규칙은 `@charset`과 **블록 없는(empty) `@layer` 순서 선언**을 제외한 모든 규칙보다 앞서야 한다"고 정의해, 이 순서 선언 패턴을 위한 예외를 명시적으로 두고 있다. `bundle/src/app.css` 맨 위에 다음 한 줄을 추가했다:

```css
@layer properties, theme, base, components, utilities;
```

`pnpm build`로 빌드한 `bundle/dist/app.css`에서 이 문이 파일 맨 앞(폰트 `@import`보다도 앞)에 그대로 살아남는 것을 확인했다 — Tailwind 빌드가 재배치하거나 지우지 않는다(`tests/bundle.test.mjs`의 "I4" 테스트가 이를 자동 검사한다). 이제 kit의 5개 레이어는 로드 순서와 무관하게 항상 이 상대 순서를 유지한다.

### 11.6 배포한 번들이 최대 24시간 동안 도착하지 않는다 (재리뷰 발견)

`stale-while-revalidate=86400`은 **신선도가 지난 사본을 최대 24시간 동안 그대로 내주면서 갱신은 백그라운드로 미루라**는 지시다. Cloudflare 엣지와 브라우저 HTTP 캐시가 각각 독립적으로 이 지시를 따르므로, 배포 후 실제로 관찰되는 동작은 이렇다.

1. **엣지**: 수정 웨이브 배포 약 11시간 뒤에도 엣지는 이전 번들을 내주고 있었다(`Age: 39064`, `cf-cache-status: UPDATING`). `max-age=300`을 한참 넘겼지만 그 사이 아무도 요청하지 않아 재검증이 트리거되지 않았기 때문이다. 첫 요청이 stale 사본을 받고 revalidate를 시작했고, 그다음 요청부터 새 번들이 나왔다. **배포 후 첫 방문자는 항상 옛 번들을 받는다.**
2. **브라우저**: 같은 규칙이 방문자 로컬 캐시에도 적용된다. 재리뷰 중 실제로, 엣지가 이미 새 번들을 내주는 상태에서 브라우저는 여전히 수정 웨이브 이전 번들을 들고 있었다 — `var(--kit-radius)`가 해석되지 않아(`0px`) 드러났다. 강제 새로고침(Ctrl+Shift+R) 후에야 새 번들이 적용됐다.

**마이그레이션에서 이것이 왜 위험한가.** 서비스 HTML은 컨테이너 재빌드로 즉시 바뀌지만 kit 번들은 그렇지 않다. 마이그레이션이 kit에 새 클래스를 추가하면서 동시에 서비스 HTML에서 그 클래스를 쓰기 시작하면, **재방문자는 새 HTML + 옛 번들 조합을 받아 그 클래스만 조용히 무효**가 된다 — §11.1의 주 리스크가 캐시를 통해 재현되는 경로다. 새 클래스에 의존하는 마이그레이션은 다음 중 하나를 지켜야 한다.

- kit 번들을 **먼저** 배포하고 Cloudflare purge로 즉시 반영한 뒤, 확인하고 나서 서비스 HTML을 배포한다(권장 — 순서만 지키면 비용이 없다).
- 또는 서비스 HTML을 배포하기 전에 새 클래스가 라이브 번들에 실재하는지 캐시 우회로 확인한다: `curl "https://kit.code0987.me/v1/app.css?cb=$(date +%s)"`.

**검증할 때 `curl`과 브라우저가 서로 다른 답을 준다는 점을 기억한다.** `curl`은 브라우저 캐시를 공유하지 않으므로 "라이브 == dist"를 확인해도 브라우저에서 같다는 보장이 없다. 브라우저에서 검증할 때는 반드시 강제 새로고침한 뒤 측정한다.

## 12. 후속 작업

- **checkbox/toggle 컴포넌트** — kit에 전혀 없다. 유틸리티(`accent-*`)도, 컴포넌트 클래스도 없어 설정 화면이 있는 서비스마다 소규모 커스텀 CSS가 반복된다. 파일럿에서 확인된 **가장 확실한 반복 구멍**이므로 다음 마이그레이션(itad)에서 우선 검토한다
- `kit lint <service>` — safelist 구멍과 레이어 우선순위 충돌 둘 다 탐지 (§11.1). 아직 만들지 않았다 — 조용한 실패가 계속 반복되는지 확인한 뒤 착수 여부를 정한다
- `kit.code0987.me/` 쇼케이스 페이지 — 팔레트 확인 페이지를 옮긴다
- Jinja 매크로 패키지(`jinja/code0987_kit`) — `itad` 마이그레이션(§9-4)에서 최초 구현
- edge 설계 문서에 §4.1 예외와 §11.2 상호 참조 추가 — 완료 (`infra/edge/docs/2026-08-27-edge-proxy-design.md`)
