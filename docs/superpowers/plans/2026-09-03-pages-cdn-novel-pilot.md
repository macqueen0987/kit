# Kit Pages CDN + novel pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish kit CSS to GitHub Pages as the default CDN, then prove one consumer (`novel`) can use `KIT_BASE_URL` and keep `novel.lan.code0987.me` working via a gitignored compose override.

**Architecture:** kit remains a static bundle. Actions copies `bundle/dist/{app,tokens}.css` to Pages at `/v1/`. Jinja `head()` reads global `kit_base_url` (default Pages origin, no `/v1`, no trailing slash) and appends `/v1/app.css`. novel injects that global from `KIT_BASE_URL`. Base compose is standalone (ports, no `edge`); MacServer overlay reattaches `edge` and can point CDN at `https://kit.code0987.me`.

**Tech Stack:** GitHub Pages (Actions), pnpm + Node test runner, Jinja2 macros, Docker Compose, FastAPI

## Global Constraints

- Default CDN: `https://macqueen0987.github.io/kit` (`KIT_BASE_URL` has no `/v1`, no trailing slash)
- Asset URLs: `${KIT_BASE_URL}/v1/app.css` and `${KIT_BASE_URL}/v1/tokens.css`
- `macqueen0987/kit` must be **public** (currently private) so anonymous GET returns 200
- Jinja macro is the only place that appends `/v1/app.css`; do not hardcode `kit.code0987.me` in the `<link>`
- Vendored copies stay byte-identical via `node scripts/sync-jinja.mjs`
- This slice does **not** convert itad/profile/gallery/stock/chzzk-auth/gitea/logflare compose
- This slice does **not** CNAME `kit.code0987.me` to Pages
- Commits: kit on branch `feat/pages-cdn`; novel on branch `feat/kit-base-url-compose` (do not commit directly on `master` without asking)
- Spec: `docs/superpowers/specs/2026-09-03-standalone-compose-kit-pages-design.md`

## File Structure

| File | Role |
|---|---|
| `services/kit/.github/workflows/pages.yml` | test → build → publish `v1/*.css` |
| `services/kit/jinja/kit.html` | `kit_base_url` + `/v1/app.css` |
| `services/kit/tests/jinja-drift.test.mjs` | macro contract; skip sibling copies in kit-only CI |
| `services/kit/AGENTS.md` | public CDN URLs |
| `services/kit/docs/2026-08-28-kit-design.md` | §4.1 Pages default + origin optional |
| `services/novel/src/novel_translator/app.py` | `resolve_kit_base_url()`, Jinja global |
| `services/novel/tests/test_kit_base_url.py` | env default / strip / override |
| `services/novel/docker-compose.yml` | standalone: ports, no edge, Pages `KIT_BASE_URL` |
| `services/novel/docker-compose.override.example.yml` | MacServer: edge, no host ports, origin CDN |
| `services/novel/.gitignore` | `docker-compose.override.yml` |
| itad/profile `_kit.html` | sync only (no compose work) |

---

### Task 1: Public repo + Pages workflow

**Files:**
- Create: `E:/Workspace/services/kit/.github/workflows/pages.yml`
- Modify: GitHub repo settings via `gh` (visibility + Pages `build_type=workflow`)

**Interfaces:**
- Consumes: existing `pnpm test`, `pnpm build`, `bundle/dist/app.css`, `bundle/dist/tokens.css`
- Produces: anonymous `https://macqueen0987.github.io/kit/v1/app.css` and `.../tokens.css` after the first successful `master` (or this branch's) deploy. Pages project site base path is `/kit/`

- [ ] **Step 1: Create the workflow file**

Create `E:/Workspace/services/kit/.github/workflows/pages.yml`:

```yaml
name: pages

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm build
      - name: Stage Pages tree
        run: |
          mkdir -p _site/v1
          cp bundle/dist/app.css bundle/dist/tokens.css _site/v1/
      - uses: actions/upload-pages-artifact@v3
        with:
          path: _site

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Make kit public and enable Pages from Actions**

From any directory (needs `gh` auth):

```bash
gh repo edit macqueen0987/kit --visibility public --accept-visibility-change-consequences
gh api --method POST -H "Accept: application/vnd.github+json" /repos/macqueen0987/kit/pages -f build_type=workflow
```

Expected: first command prints the repo; second returns a Pages JSON with `"build_type": "workflow"`. If the second returns `409` (already enabled), that is success — continue.

- [ ] **Step 3: Commit the workflow on `feat/pages-cdn`**

```bash
cd E:/Workspace/services/kit
git checkout -b feat/pages-cdn
git add .github/workflows/pages.yml
git commit -m "ci: GitHub Pages 로 v1 CSS 를 배포한다"
```

Do **not** push yet if Task 2 tests are not in the same branch — Task 2 lands on this same branch, then one push. If Task 1 is committed alone, wait for Task 2 before push so CI `pnpm test` already understands kit-only clones (Task 2 changes jinja-drift).

---

### Task 2: Jinja `kit_base_url` + kit-only CI tests + docs

**Files:**
- Modify: `jinja/kit.html`
- Modify: `tests/jinja-drift.test.mjs`
- Modify: `AGENTS.md` (opening sentence + §1.2 URL table, lines ~1–3 and ~67–70)
- Modify: `docs/2026-08-28-kit-design.md` §4.1 (lines 130–137)
- Run: `node scripts/sync-jinja.mjs` (writes sibling `_kit.html` copies)

**Interfaces:**
- Consumes: Jinja global name `kit_base_url` (string). Missing global → default Pages origin via `| default(...)`
- Produces: `<link rel="stylesheet" href="{{ kit_base_url | default('https://macqueen0987.github.io/kit') }}/v1/app.css">`
- Produces: jinja-drift does not require sibling consumer repos when they are absent (GitHub Actions kit-only checkout)

- [ ] **Step 1: Write the failing macro-contract assertions**

In `tests/jinja-drift.test.mjs`, replace the test `'매크로가 CDN URL 과 accent 주입을 모두 담고 있다'` with:

```js
test('매크로가 kit_base_url 과 accent 주입을 모두 담고 있다', () => {
  const source = readFileSync(sourcePath, 'utf8');
  assert.match(source, /kit_base_url/, 'kit_base_url 글로벌이 없다');
  assert.match(
    source,
    /macqueen0987\.github\.io\/kit/,
    'Pages 기본 origin 이 없다',
  );
  assert.match(source, /\/v1\/app\.css/, 'v1/app.css 경로가 없다');
  assert.doesNotMatch(
    source,
    /href="https:\/\/kit\.code0987\.me\/v1\/app\.css"/,
    'origin CDN 이 <link> 에 하드코딩돼 있다',
  );
  assert.match(source, /--kit-accent/, 'accent 주입이 없다');
  assert.match(source, /macro head\(/, 'head() 매크로가 없다');
  assert.doesNotMatch(
    source,
    /<link[^>]+fonts\.googleapis\.com\/css2/,
    '폰트 스타일시트 <link> 가 들어 있다 — 폰트는 번들 @import 가 처리한다(preconnect 는 무방)',
  );
});
```

In the same file, change the first test so kit-only CI does not fail when `../itad` is missing. After the `for` loop and before `assert.deepEqual(stale, ...)`, replace the `assert.ok(checked >= 1, ...)` block with:

```js
  const workspaceConsumer = existsSync(resolve(rootDir, '../itad'));
  if (!workspaceConsumer) {
    // kit 단독 클론 (GitHub Actions). 사본 경로는 워크스페이스 전용이다.
    return;
  }

  assert.ok(checked >= 1, 'vendored 사본을 하나도 찾지 못했다 — consumers.json 경로를 확인할 것');
```

Keep the `assert.deepEqual(stale, [], ...)` **before** this early return when `workspaceConsumer` is true. Structure:

```js
  assert.deepEqual(
    stale,
    [],
    'vendored 매크로 사본이 jinja/kit.html 보다 뒤처졌다 — ' +
      'node scripts/sync-jinja.mjs 로 갱신하고 각 서비스 저장소에서 커밋할 것.\n' +
      stale.join('\n'),
  );

  const workspaceConsumer = existsSync(resolve(rootDir, '../itad'));
  if (!workspaceConsumer) return;
  assert.ok(checked >= 1, 'vendored 사본을 하나도 찾지 못했다 — consumers.json 경로를 확인할 것');
```

- [ ] **Step 2: Run the new contract test and confirm it fails**

```bash
cd E:/Workspace/services/kit
node --test tests/jinja-drift.test.mjs
```

Expected: FAIL — `kit_base_url 글로벌이 없다` (or Pages origin missing). Drift copy test may still pass until `kit.html` changes.

- [ ] **Step 3: Update `jinja/kit.html`**

Replace the last paragraph of the `head()` comment (the sentence that says the macro is the only place that knows the CDN URL) and the macro body. Comment should say: the macro knows the path `/v1/app.css` and the global `kit_base_url`; the default origin is Pages; origin CDN is `KIT_BASE_URL=https://kit.code0987.me`.

Macro body:

```jinja
{%- macro head(accent=none) -%}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{{ kit_base_url | default('https://macqueen0987.github.io/kit') }}/v1/app.css">
{%- if accent %}
<style>:root{--kit-accent:{{ accent }}}</style>
{%- endif %}
{%- endmacro -%}
```

- [ ] **Step 4: Sync vendored copies and run tests**

```bash
cd E:/Workspace/services/kit
node scripts/sync-jinja.mjs
pnpm test
```

Expected: `synced  itad`, `synced  profile`, `synced  novel` (or `ok` if already matching). `pnpm test` PASS.

- [ ] **Step 5: Docs**

In `AGENTS.md` line 3, change the opening to say consumers load `${KIT_BASE_URL}/v1/app.css` with default `https://macqueen0987.github.io/kit`. In the §1.2 table, replace the two URL cells:

| URL | (keep size/contents/when) |
| `https://macqueen0987.github.io/kit/v1/app.css` | … |
| `https://macqueen0987.github.io/kit/v1/tokens.css` | … |

Add one sentence under the table: MacServer may set `KIT_BASE_URL=https://kit.code0987.me` to use the edge origin.

In `docs/2026-08-28-kit-design.md` §4.1, replace the two bullets that say edge death takes CSS with it. New text (keep “no dedicated container” and the Caddy mount):

- 기본 CDN은 GitHub Pages (`https://macqueen0987.github.io/kit/v1/…`)다. edge 마운트는 optional origin이다.
- 소비자는 `KIT_BASE_URL`로 origin을 고른다. 기본값은 Pages라 MacServer가 내려도 기본값 소비자는 스타일이 남는다.

- [ ] **Step 6: Commit kit (still on `feat/pages-cdn`)**

```bash
cd E:/Workspace/services/kit
git add jinja/kit.html tests/jinja-drift.test.mjs AGENTS.md docs/2026-08-28-kit-design.md .github/workflows/pages.yml
git commit -m "feat: kit CSS 기본 CDN 을 GitHub Pages 로 둔다"
```

`jinja/kit.html` only in this repo — sibling `_kit.html` files belong to other git repos; do not `git add` them here.

- [ ] **Step 7: Push kit branch, merge to master, confirm Pages 200**

```bash
cd E:/Workspace/services/kit
git push -u origin feat/pages-cdn
gh pr create --title "feat: GitHub Pages 를 kit 기본 CDN 으로 둔다" --body "$(cat <<'EOF'
## Summary
- kit 레포를 public 으로 두고 Actions 가 `v1/app.css` / `v1/tokens.css` 를 Pages 에 배포한다.
- Jinja `head()` 는 `kit_base_url`(기본 Pages) + `/v1/app.css` 를 쓴다.

## Test plan
- [ ] Actions `pages` workflow green
- [ ] anonymous `curl -sI https://macqueen0987.github.io/kit/v1/app.css` is 200 and CSS
EOF
)"
```

Merge when CI is green (`gh pr merge --squash` only if the user asked to merge; otherwise wait). After `master` has the workflow:

```bash
curl -sI https://macqueen0987.github.io/kit/v1/app.css
curl -sI https://macqueen0987.github.io/kit/v1/tokens.css
```

Expected: HTTP 200, `content-type` includes `text/css`. First deploy can take 1–2 minutes after merge. If 404, open the Actions run and the repo Pages settings (`build_type=workflow`).

---

### Task 3: novel injects `KIT_BASE_URL` and standalone compose

**Files:**
- Create: `E:/Workspace/services/novel/tests/test_kit_base_url.py`
- Create: `E:/Workspace/services/novel/docker-compose.override.example.yml`
- Modify: `E:/Workspace/services/novel/src/novel_translator/app.py` (add `os` import; `resolve_kit_base_url`; globals)
- Modify: `E:/Workspace/services/novel/src/novel_translator/templates/_kit.html` (already synced in Task 2 — commit it here)
- Modify: `E:/Workspace/services/novel/docker-compose.yml`
- Modify: `E:/Workspace/services/novel/.gitignore`
- Modify: `E:/Workspace/services/novel/.env.example`
- Modify: `E:/Workspace/services/novel/README.md` (the “포트가 안 열려 있습니다” paragraph ~line 52)

**Interfaces:**
- Consumes: Task 2 macro (`kit_base_url` string global)
- Produces: `resolve_kit_base_url() -> str`
- Produces: `templates.env.globals["kit_base_url"]` set at import from env
- Produces: base compose `ports: ["8001:8000"]`, no `edge` network, `KIT_BASE_URL` default Pages
- Produces: override example reattaches `edge` (alias `novel-app-1`), `ports: !override []`, `KIT_BASE_URL=https://kit.code0987.me`, `OLLAMA_BASE_URL=http://ollama:11434`

- [ ] **Step 1: Write failing tests**

Create `E:/Workspace/services/novel/tests/test_kit_base_url.py`:

```python
import os

from novel_translator.app import resolve_kit_base_url


def test_default_is_github_pages(monkeypatch):
    monkeypatch.delenv("KIT_BASE_URL", raising=False)
    assert resolve_kit_base_url() == "https://macqueen0987.github.io/kit"


def test_env_wins_and_strips_slash(monkeypatch):
    monkeypatch.setenv("KIT_BASE_URL", "https://kit.code0987.me/")
    assert resolve_kit_base_url() == "https://kit.code0987.me"


def test_kit_macro_uses_global_not_origin(monkeypatch):
    root = os.path.dirname(os.path.dirname(__file__))
    text = (
        __import__("pathlib")
        .Path(root)
        / "src"
        / "novel_translator"
        / "templates"
        / "_kit.html"
    ).read_text(encoding="utf-8")
    assert "kit_base_url" in text
    assert 'href="https://kit.code0987.me/v1/app.css"' not in text
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd E:/Workspace/services/novel
py -3.13 -m pytest tests/test_kit_base_url.py -v
```

Expected: FAIL — `resolve_kit_base_url` not defined and/or `_kit.html` still has the origin href (if Task 2 sync was not copied into this tree yet, copy via `node ../kit/scripts/sync-jinja.mjs` from kit).

- [ ] **Step 3: Implement `resolve_kit_base_url` and the Jinja global**

In `app.py`, add `import os` with the other stdlib imports. After `templates = Jinja2Templates(...)` add:

```python
DEFAULT_KIT_BASE_URL = "https://macqueen0987.github.io/kit"


def resolve_kit_base_url() -> str:
    return os.environ.get("KIT_BASE_URL", DEFAULT_KIT_BASE_URL).rstrip("/")


templates.env.globals["kit_base_url"] = resolve_kit_base_url()
```

Note: import-time snapshot. Compose/env is set before uvicorn loads the app, so Docker is fine. Tests call `resolve_kit_base_url()` directly, not the frozen global.

- [ ] **Step 4: Standalone compose**

Replace `docker-compose.yml` `app` networking/ports/env as follows (keep other env vars):

- Remove `expose: ["8000"]`. Add `ports: ["8001:8000"]`.
- Remove `networks:` from `app` (default project network only).
- Add to `app.environment`:
  - `KIT_BASE_URL: ${KIT_BASE_URL:-https://macqueen0987.github.io/kit}`
  - Change `OLLAMA_BASE_URL` default to `http://host.docker.internal:11434`
- Delete the bottom `networks: edge: external: true` block entirely.

`agent-sdk` / `agent-worker` stay as they are (no edge). `CURSOR_API_KEY` required remains — this slice does not introduce compose profiles.

- [ ] **Step 5: Override example + gitignore + env + README**

Create `docker-compose.override.example.yml`:

```yaml
# Copy to docker-compose.override.yml (gitignored) on MacServer.
services:
  app:
    ports: !override []
    environment:
      KIT_BASE_URL: https://kit.code0987.me
      OLLAMA_BASE_URL: ${OLLAMA_BASE_URL:-http://ollama:11434}
    networks:
      default:
      edge:
        aliases:
          - novel-app-1

networks:
  edge:
    external: true
    name: edge
```

Add to `.gitignore`:

```
docker-compose.override.yml
```

Add to `.env.example` after the host-port comment:

```
# kit CSS origin. 기본은 GitHub Pages. MacServer origin 은
# KIT_BASE_URL=https://kit.code0987.me
KIT_BASE_URL=https://macqueen0987.github.io/kit
```

In `README.md`, replace the paragraph that says ports are closed / create `edge` with:

```
> **standalone:** 이 compose 는 `8001:8000` 을 연다. 브라우저에서 `http://localhost:8001`.
> MacServer(edge / `novel.lan.code0987.me`)는 `docker-compose.override.example.yml` 을
> `docker-compose.override.yml` 로 복사한다 — 호스트 포트를 닫고 `edge` 에 붙인다.
```

Also change the Ollama sentence: default is `host.docker.internal:11434`; MacServer override uses `http://ollama:11434` on `edge`.

- [ ] **Step 6: Run tests**

```bash
cd E:/Workspace/services/novel
py -3.13 -m pytest tests/test_kit_base_url.py tests/test_fonts.py -v
```

Expected: PASS.

- [ ] **Step 7: Commit novel**

```bash
cd E:/Workspace/services/novel
git checkout -b feat/kit-base-url-compose
git add src/novel_translator/app.py src/novel_translator/templates/_kit.html tests/test_kit_base_url.py docker-compose.yml docker-compose.override.example.yml .gitignore .env.example README.md
git commit -m "feat: kit CDN 을 KIT_BASE_URL 로 두고 compose 를 standalone 기본으로 둔다"
```

- [ ] **Step 8: Install MacServer override (not committed)**

On this machine:

```bash
cd E:/Workspace/services/novel
copy docker-compose.override.example.yml docker-compose.override.yml
docker compose up -d --build app
```

`copy` is cmd; in PowerShell: `Copy-Item docker-compose.override.example.yml docker-compose.override.yml`.

Confirm `docker-compose.override.yml` is untracked (`git status`).

---

### Task 4: Live verification (Pages + novel.lan)

**Files:** none (commands only)

**Interfaces:**
- Consumes: Task 1–3 deployed/running

- [ ] **Step 1: Pages**

```bash
curl -sI https://macqueen0987.github.io/kit/v1/app.css
```

Expected: 200, `content-type` includes `css`. Body (`curl -s`) starts with a CSS comment or `:root`/`@layer`.

- [ ] **Step 2: novel.lan HTML points at origin CDN (override)**

```bash
curl -s https://novel.lan.code0987.me/ | findstr app.css
```

Expected: `href="https://kit.code0987.me/v1/app.css"` because override sets `KIT_BASE_URL`. If the container was not rebuilt after `app.py` change, rebuild.

- [ ] **Step 3: CSS actually loads**

```bash
curl -sI https://kit.code0987.me/v1/app.css
curl -sI https://macqueen0987.github.io/kit/v1/app.css
```

Expected: both 200. Browser check: open `https://novel.lan.code0987.me/` — layout/tokens look the same as before (origin CSS). Optional: temporarily comment `KIT_BASE_URL` in override, recreate `app`, confirm HTML switches to Pages URL, then restore.

---

## Deferred (spec, not this plan)

- itad / profile: Python `KIT_BASE_URL` inject + compose split (macro already defaults to Pages after sync)
- stock, gallery, chzzk-auth, gitea, logflare compose
- static HTML consumers
- `kit.code0987.me` CNAME → Pages
