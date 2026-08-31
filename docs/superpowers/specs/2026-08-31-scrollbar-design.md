# kit 전역 스크롤바 설계

- 작성일: 2026-08-31
- 상태: 설계 확정, 구현 대기
- 관련: `docs/2026-08-28-kit-design.md`, `bundle/src/base.css`, `AGENTS.md`

## 1. 목표

`app.css`를 물린 모든 소비 서비스에서 스크롤바 룩을 통일한다. 얇고 거의 안 보이며, 레일(track)은 투명하다.

## 2. 비목표

- opt-in 클래스 / safelist 유틸리티
- `scrollbar-gutter` 강제 (서비스가 이미 쓰는 값 유지)
- `tokens.css` 진입점에 스크롤바 규칙 추가 (요소 규칙 0 계약)
- accent 색 thumb, 스크롤바 숨김 유틸
- stock 등 `tokens.css`만 물린 소비자의 네이티브 스크롤바 변경

## 3. 배치

`bundle/src/base.css`의 `@layer base`에 둔다. 체크박스 `accent-color`·number 스피너와 같은 층이다.

- 셀렉터: `:where(*)` (명시도 0 — 서비스가 쉽게 덮음)
- WebKit 가상요소도 `:where(*)::-webkit-scrollbar…` 형태로 명시도 0을 유지
- 배포 경로 변경 없음: `pnpm build` → `bundle/dist/app.css` → Caddy `/srv/kit/v1`

## 4. 시각·CSS 계약

| 축 | 값 |
|---|---|
| 표준 | `scrollbar-width: thin` |
| 표준 색 | `scrollbar-color: var(--color-border) transparent` (thumb, track) |
| WebKit 폭 | `::-webkit-scrollbar { width: 8px; height: 8px; }` |
| WebKit track / corner | `background: transparent` |
| WebKit thumb | `background: var(--color-border); border-radius: var(--radius-xs)` |
| WebKit thumb:hover / :active | `background: var(--color-border-strong)` |

라이트/다크는 `--color-border*`가 테마를 따르므로 별도 `data-theme` 분기 없음. accent는 쓰지 않는다.

## 5. 테스트

`tests/bundle.test.mjs`에 base 레이어 테스트 추가 (accent-color 테스트와 동일 패턴):

1. `app.css`에 `scrollbar-width:thin`과 `scrollbar-color`에 `--color-border` + `transparent` 존재
2. `::-webkit-scrollbar`, `-thumb`, `-track` 존재, track이 `transparent`
3. 규칙이 Preflight 뒤·`@layer components` 앞
4. `tokens.css`(dist)에는 스크롤바 관련 규칙 없음

## 6. 문서

`AGENTS.md` §4.2의 base 1층 표에 스크롤바 행을 추가하고, 덮는 방법을 한 문장으로 적는다.
