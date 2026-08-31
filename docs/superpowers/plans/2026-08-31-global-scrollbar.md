# Global Scrollbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global thin scrollbar with a transparent track to kit's `app.css` base layer so every `app.css` consumer shares one subtle scrollbar look.

**Architecture:** Standard `scrollbar-width`/`scrollbar-color` plus WebKit pseudo-elements live in `bundle/src/base.css` inside `@layer base`, wrapped in `:where(*)` for specificity 0. Rebuild `bundle/dist/app.css`. Document in `AGENTS.md`. Do not touch `tokens.css` entry.

**Tech Stack:** Tailwind v4 kit bundle, Node test runner (`node --test`), pnpm

## Global Constraints

- Track/rail MUST be `transparent` (both `scrollbar-color` second value and WebKit `-track`/`-corner`)
- Thumb uses `var(--color-border)`; hover/active uses `var(--color-border-strong)`
- Width: `scrollbar-width: thin` and WebKit `8px` (width and height)
- Thumb `border-radius: var(--radius-xs)`
- Place rules in `@layer base` via `bundle/src/base.css`, after Preflight, before `@layer components`
- Selectors use `:where(*)` (and `:where(*)::-webkit-…`) so specificity stays 0
- Do NOT add scrollbar rules to `tokens.css` / `tokens-entry.css` / `bundle/dist/tokens.css`
- No new safelist utilities, no opt-in classes, no `scrollbar-gutter`, no accent thumb
- Work from repo root: `E:\Workspace\services\kit`
- Commits on branch `feat/global-scrollbar`

## File Structure

| File | Role |
|---|---|
| `bundle/src/base.css` | Source of truth for global scrollbar CSS |
| `bundle/dist/app.css` | Built artifact (via `pnpm build`) |
| `tests/bundle.test.mjs` | Contract tests against built `app.css` (+ tokens absence) |
| `AGENTS.md` | AI consumer contract — document base-layer scrollbar |

---

### Task 1: Failing tests + base scrollbar + rebuild

**Files:**
- Modify: `tests/bundle.test.mjs`
- Modify: `bundle/src/base.css`
- Modify: `bundle/dist/app.css` (via `pnpm build`)
- Test: `tests/bundle.test.mjs`

**Interfaces:**
- Consumes: existing `css` string loaded from `bundle/dist/app.css` in `tests/bundle.test.mjs`; existing pattern of accent-color base-layer tests
- Produces: base-layer scrollbar rules matching Global Constraints; tests that lock those contracts

- [ ] **Step 1: Write the failing test**

Append to `tests/bundle.test.mjs` (after the existing accent-color base-layer test block):

```js
test('전역 스크롤바가 base 레이어에 있고 레일이 투명하다', () => {
  assert.match(
    css,
    /:where\(\*\)\{[^}]*scrollbar-width:thin/,
    'scrollbar-width:thin 이 :where(*) base 규칙에 없다',
  );
  assert.match(
    css,
    /scrollbar-color:var\(--color-border\)\s*transparent/,
    'scrollbar-color 가 border thumb + transparent track 가 아니다',
  );

  assert.match(css, /:where\(\*\)::-webkit-scrollbar\{/, '::-webkit-scrollbar 규칙이 없다');
  assert.match(css, /:where\(\*\)::-webkit-scrollbar-track\{[^}]*transparent/, 'track 이 transparent 가 아니다');
  assert.match(css, /:where\(\*\)::-webkit-scrollbar-corner\{[^}]*transparent/, 'corner 가 transparent 가 아니다');
  assert.match(
    css,
    /:where\(\*\)::-webkit-scrollbar-thumb\{[^}]*var\(--color-border\)/,
    'thumb 이 --color-border 를 안 쓴다',
  );
  assert.match(
    css,
    /::-webkit-scrollbar-thumb:hover\{[^}]*var\(--color-border-strong\)/,
    'thumb:hover 가 border-strong 이 아니다',
  );
  assert.match(
    css,
    /::-webkit-scrollbar-thumb:active\{[^}]*var\(--color-border-strong\)/,
    'thumb:active 가 border-strong 이 아니다',
  );

  const iPreflight = css.indexOf('h1,h2,h3,h4,h5,h6');
  const iScroll = css.indexOf('scrollbar-width:thin');
  const iComponents = css.indexOf('@layer components');
  assert.ok(iPreflight > 0 && iScroll > iPreflight, 'scrollbar 가 Preflight 보다 앞에 있다');
  assert.ok(iScroll < iComponents, 'scrollbar 가 base 레이어 밖으로 나갔다');
});

test('tokens.css 에는 스크롤바 규칙이 없다', async () => {
  const tokensPath = new URL('../bundle/dist/tokens.css', import.meta.url);
  const tokens = await readFile(tokensPath, 'utf8');
  assert.ok(!tokens.includes('scrollbar'), 'tokens.css 에 scrollbar 문자열이 있다');
  assert.ok(!tokens.includes('::-webkit-scrollbar'), 'tokens.css 에 webkit scrollbar 가 있다');
});
```

If `readFile` is not already imported at the top of `tests/bundle.test.mjs`, add it — or reuse whatever file-read helper the file already uses. Prefer existing pattern.

If a regex fails only because of minifier selector spelling after build, adjust the regex to the actual `app.css` text without changing the visual contract.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`

Expected: FAIL — new scrollbar test(s) fail because `bundle/dist/app.css` has no `scrollbar-width:thin`.

- [ ] **Step 3: Write minimal implementation in `bundle/src/base.css`**

Append inside the existing `@layer base { … }` block (after the textarea `resize: none` rule, still inside the layer):

```css
  /* 전역 스크롤바 — 얇고 거의 안 보이며 레일(track)은 투명.
   *
   * 표준 속성(Firefox 등)과 WebKit 가상요소를 함께 둔다. track/corner 는
   * 반드시 transparent. thumb 는 --color-border, hover/active 는
   * --color-border-strong. :where(*) 로 명시도 0 — 서비스가 쉽게 덮는다.
   * tokens.css 진입점에는 넣지 않는다(요소 규칙 0 계약). */
  :where(*) {
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) transparent;
  }
  :where(*)::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  :where(*)::-webkit-scrollbar-track,
  :where(*)::-webkit-scrollbar-corner {
    background: transparent;
  }
  :where(*)::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: var(--radius-xs);
  }
  :where(*)::-webkit-scrollbar-thumb:hover,
  :where(*)::-webkit-scrollbar-thumb:active {
    background: var(--color-border-strong);
  }
```

- [ ] **Step 4: Rebuild bundle**

Run: `pnpm build`

Expected: `bundle/dist/app.css` and `bundle/dist/tokens.css` refresh; app.css contains the new scrollbar rules.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test`

Expected: all tests PASS (previous count was 61; expect previous+2).

- [ ] **Step 6: Commit**

```powershell
git add tests/bundle.test.mjs bundle/src/base.css bundle/dist/app.css bundle/dist/tokens.css
git commit -m "feat: base 레이어에 전역 thin 스크롤바를 추가한다`n`n레일(track)은 transparent, thumb는 border 토큰을 쓴다."
```

---

### Task 2: Document in AGENTS.md

**Files:**
- Modify: `AGENTS.md` (section 4.2 base 1-layer table)
- Test: none (docs-only; run `pnpm test` once to ensure no accidental breakage)

**Interfaces:**
- Consumes: Task 1 scrollbar behavior (transparent track, thin, border thumb)
- Produces: AGENTS.md contract row so AI consumers know the global scrollbar exists and how to override

- [ ] **Step 1: Update the §4.2 layer-1 table**

In `AGENTS.md`, find the table under **1층: 클래스를 붙이지 않아도 적용된다** and add a row:

```markdown
| 스크롤바 (`*`) | `scrollbar-width:thin`. thumb=`--color-border`, **track/레일은 transparent**. hover/active thumb=`--color-border-strong`. WebKit 폭 8px |
```

Immediately after the paragraph that starts with `서비스가 되돌리고 싶으면`, append one sentence if scrollbar override is not already covered:

```markdown
스크롤바도 같다 — `scrollbar-color` 또는 `::-webkit-scrollbar-thumb` 를 서비스 CSS에서 덮으면 된다(`:where(*)` 라 명시도 0).
```

Do not invent new sections beyond this.

- [ ] **Step 2: Sanity-check tests still pass**

Run: `pnpm test`

Expected: PASS (same as Task 1).

- [ ] **Step 3: Commit**

```powershell
git add AGENTS.md
git commit -m "docs: AGENTS.md 에 전역 스크롤바 base 계약을 적는다"
```

---

## Spec Coverage (self-review)

| Spec requirement | Task |
|---|---|
| Global base placement + `:where(*)` | Task 1 |
| Transparent track (standard + WebKit) | Task 1 |
| thin / 8px, border / border-strong thumb | Task 1 |
| No tokens.css rules | Task 1 |
| AGENTS.md documentation | Task 2 |
| Non-goals (no safelist, no gutter, no accent) | Both tasks omit them |
