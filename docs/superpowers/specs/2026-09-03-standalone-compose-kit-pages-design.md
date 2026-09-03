# standalone compose + kit GitHub Pages

- 작성일: 2026-09-03
- 상태: 설계 확정, 구현 대기
- 관련: `docs/2026-08-28-kit-design.md` §4.1·§8, `jinja/kit.html`, 워크스페이스 서비스 compose
- 레포: `https://github.com/macqueen0987/kit.git` (`services/kit`, `master`)

## 1. 목표

우선순위 A, 범위 C.

1. 서비스 레포만 클론한 사람이 `docker compose up`으로 로컬에서 웹 UI에 닿는다.
2. kit CSS는 MacServer / `kit.code0987.me` 없이도 로드된다.
3. MacServer 전용 설정(edge 네트워크, 절대 경로, origin CDN)은 gitignored override에만 둔다.

공개 미러(GitHub Pages)가 **기본 CDN**이다. MacServer origin은 override에서만 고른다.

## 2. 비목표

- `kit.code0987.me`를 Pages로 CNAME 이전
- 공유 DB, 서비스 간 데이터 통합
- 전 서비스 README 전면 재작성
- kit npm/PyPI 배포
- 이중 `<link>` / JS 폴백 (origin 실패 시 미러)
- agent-gate / aitg / COLLARS(dev) compose 이원화 (후순위, 이 스펙 밖)
- collars-next Vite 앱의 로컬 토큰 복사 (정적 `<link>`만 Pages URL로 바꾼다)

## 3. 역할 분리

| 조각 | 커밋 | 역할 |
|---|---|---|
| `docker-compose.yml` | 예 | standalone 기본: 자체 network, `ports`, `KIT_BASE_URL` = Pages |
| `docker-compose.override.example.yml` | 예 | MacServer 템플릿 |
| `docker-compose.override.yml` | 아니오 (gitignore) | 이 머신 실제 override |
| kit GitHub Pages | kit 레포 | 공개 `/v1/app.css`, `/v1/tokens.css` |
| edge kit 마운트 | 유지 | 선택적 빠른 origin. override가 `KIT_BASE_URL=https://kit.code0987.me`일 때만 소비 |

Compose는 같은 디렉터리의 `docker-compose.yml` + `docker-compose.override.yml`을 자동 병합한다. example을 복사하지 않으면 standalone 경로만 탄다.

## 4. kit Pages

kit는 이미 독립 레포다 (`https://github.com/macqueen0987/kit.git`, `master`). `.github/`는 없다 — Actions를 신설한다.

**전제:** 이 레포는 지금 private다. Pages URL이 로그인 없이 200이어야 A가 성립하므로 **레포를 public으로 바꾼다.** kit는 CSS·Jinja 매크로만 있고 시크릿이 없다. private 유지 + 별도 public 미러 레포는 쓰지 않는다.

### 4.1 URL

기본 CDN (소비자가 하드코딩·env 기본값으로 쓰는 값):

```
https://macqueen0987.github.io/kit/v1/app.css
https://macqueen0987.github.io/kit/v1/tokens.css
```

`KIT_BASE_URL`은 **origin + 레포 경로까지, `/v1` 없음, 끝 슬래시 없음**.

```
KIT_BASE_URL=https://macqueen0987.github.io/kit
```

매크로/템플릿은 `${KIT_BASE_URL}/v1/app.css`를 붙인다. origin을 쓸 때는 `KIT_BASE_URL=https://kit.code0987.me` — 결과 URL은 지금과 같다 (`https://kit.code0987.me/v1/app.css`).

major 경로 계약은 기존 스펙과 같다: `v1`은 mutable, 파괴적 변경만 `v2`.

### 4.2 배포

`master` 푸시마다:

1. `pnpm test` (실패하면 publish 하지 않음)
2. `pnpm build`
3. `bundle/dist/app.css`와 `tokens.css`를 Pages 산출물의 `v1/` 아래로 복사
4. GitHub Pages (GitHub Actions 배포)로 publish

Pages 소스 브랜치 직접 서빙은 쓰지 않는다. dist가 소스 트리에 있어도, 공개 URL의 진실은 Actions 산출물이다.

`Cache-Control`은 Pages 기본값을 따른다. Cloudflare `stale-if-error`는 origin(`kit.code0987.me`)에만 해당한다. Pages가 기본 CDN이므로 이 갭은 허용한다.

### 4.3 로컬 origin

`infra/edge`의 `bundle/dist` → `/srv/kit/v1` 마운트는 그대로 둔다. MacServer가 origin CDN을 고를 때만 쓰인다. Pages 배포와 무관하게 로컬 파일은 즉시 반영된다.

## 5. `KIT_BASE_URL` 주입

### 5.1 Jinja (진실: `jinja/kit.html`)

`head()`가 아는 URL은 `KIT_BASE_URL` 하나다. 기본값은 §4.1 Pages URL.

```
<link rel="stylesheet" href="{{ kit_base_url }}/v1/app.css">
```

`kit_base_url`은 매크로 인자가 아니다. 각 소비 앱이 Jinja globals에 넣는다:

```
KIT_BASE_URL 환경변수, 없으면 https://macqueen0987.github.io/kit
```

끝 슬래시는 주입 시 strip 한다. 매크로는 슬래시 없는 base를 가정한다.

`scripts/sync-jinja.mjs`가 사본을 갱신한다. `tests/jinja-drift.test.mjs`는 하드코딩 `kit.code0987.me`가 아니라 `kit_base_url` + `/v1/app.css` 패턴을 검사한다.

1차 Jinja 소비자: `novel`, `itad`, `profile`.

### 5.2 서버 렌더 + compose

Jinja를 쓰는 서비스의 `docker-compose.yml` `environment`:

```
KIT_BASE_URL: ${KIT_BASE_URL:-https://macqueen0987.github.io/kit}
```

MacServer override만 `KIT_BASE_URL: https://kit.code0987.me`로 덮는다.

### 5.3 정적 HTML

서버가 HTML을 렌더하지 않는 소비자(gallery, chzzk-auth, logflare, stock `index.html`, collars-next `index.html`)는 **소스의 `<link>`를 Pages URL로 바꾼다.** 이 경로에는 compose env가 닿지 않는다.

MacServer에서 origin CSS를 쓰려면 해당 파일을 고치거나, 나중에 작은 주입을 추가한다. 이 스펙은 정적 HTML의 origin 전환을 비목표로 둔다 — A(standalone)가 우선이다.

## 6. Compose 규칙

### 6.1 Base (`docker-compose.yml`)

- `networks.edge` (`external: true`) 없음
- 웹 진입 컨테이너에 `ports` (호스트에서 바로 접속)
- 호스트 절대 경로 없음. 미디어는 `${HOST_MEDIA:-./media}` 또는 named volume
- ollama 등 교차 의존은 `host.docker.internal` 또는 문서화된 env. edge DNS 이름(`http://ollama:11434`)은 base 기본값이 아님
- `KIT_BASE_URL` 기본값은 Pages (§5.2)

### 6.2 Override (gitignore)

- `edge` 네트워크 attach, Caddy 계약용 `container_name` / aliases 유지
- `ports: !override []` 또는 `127.0.0.1:` 바인딩 (agent-gate 패턴)
- 절대 경로 마운트
- 선택: `KIT_BASE_URL=https://kit.code0987.me`
- edge DNS: `GALLERY_OLLAMA_HOST=http://ollama:11434` 등

각 서비스 `.gitignore`에 `docker-compose.override.yml`을 넣고, `docker-compose.override.example.yml`을 커밋한다. 이미 있는 곳(agent-gate, chzzk-auth, logflare)은 내용만 이 규칙에 맞춘다.

### 6.3 1차 적용 서비스

순서:

1. kit — Pages Actions, Jinja 매크로, drift 테스트, AGENTS/스펙 URL 갱신
2. novel, itad, profile — Jinja 주입 + compose 이원화
3. stock, gallery, chzzk-auth, gitea, logflare — compose 이원화
4. 정적 HTML kit URL → Pages (gallery, chzzk-auth, logflare, stock, collars-next)

포트 (base에 연다):

| 서비스 | 호스트:컨테이너 | 비고 |
|---|---|---|
| novel | `8001:8000` | README가 이미 이 값을 안내 |
| itad api | `8000:8000` | |
| profile | `8000:8000` | `ALLOWED_HOSTS`에 `localhost` 이미 있음 |
| stock api | `8000:8000` | |
| gallery | `1528:1527` | test compose(1528)와 맞춘다. 1527은 override/edge |
| chzzk-auth | `8080:8080` | 앱 기본 `PORT`는 8080. 머신 `.env`의 38471은 override |
| gitea | `3000:3000` | `ROOT_URL` 기본은 `http://localhost:3000/`. LAN 호스트명은 override |
| logflare | `8080:80` | 컨테이너는 80. 호스트 80은 Caddy 자리라 비움 |

logflare의 두 번째 `external` 네트워크(`logflare`)도 base에서 뺀다. aitg가 붙는 공용 넷은 override 몫이다.

원칙: base는 호스트 브라우저로 연다. 80/443은 edge Caddy만 쓴다.

## 7. 장애

| 상황 | 결과 |
|---|---|
| MacServer / edge 다운 | Pages 기본값을 쓰는 클론·standalone은 CSS 유지. origin CDN만 쓰는 컨테이너는 스타일 실패 |
| Pages 다운 | origin override를 쓰는 MacServer는 유지. 기본값만 쓰는 클론은 스타일 실패 |
| override 파일 없음 | base만으로 standalone. edge 호스트명으로는 안 닿음 |

소비자는 이중 fetch를 하지 않는다. CDN 선택은 env 한 줄이다.

## 8. 검증

kit:

- 레포 public
- Actions 성공
- 익명 `curl -sI https://macqueen0987.github.io/kit/v1/app.css` → 200, CSS
- Jinja drift가 `kit_base_url` + `/v1/app.css`를 검사하고 `https://kit.code0987.me` 하드코딩을 거부

소비 (최소 하나, novel 또는 itad):

- override 없이 `docker compose up` → 안내된 localhost 포트로 UI
- 페이지 소스가 Pages CSS URL을 가리킴

MacServer:

- `override.example` → `override.yml` 복사 후 edge 경로 회귀 (기존 호스트명으로 접속)

## 9. 문서

- kit `AGENTS.md`: 공개 CDN을 Pages URL로 갱신. `kit.code0987.me`는 optional origin
- 이 스펙이 compose/CDN 계약의 진실이다. `docs/2026-08-28-kit-design.md` §4.1·§8은 “edge 전용 origin”에서 “Pages 기본 + origin optional”로 한 단락을 고친다
- 1차 서비스 README에 두 줄: standalone은 base compose, MacServer는 `override.example`을 `override.yml`로 복사

## 10. 기존 설계와의 차이

`docs/2026-08-28-kit-design.md` §4.1은 “전용 컨테이너 없이 edge가 서빙, edge가 죽으면 소비 서비스도 같이 죽는다”고 적었다. 그건 **같은 호스트에서 origin과 앱이 같이 돌 때**만 참이다.

standalone과 MacServer 다운 대비에서는 거짓이다. 공개 Pages가 기본 origin이 되면, 앱 호스트와 CSS origin이 분리된다. edge 마운트는 빠른 로컬 경로로 남고, 계약의 기본값은 Pages다.
