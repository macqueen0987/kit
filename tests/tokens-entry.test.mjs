// `bundle/dist/tokens.css` 의 계약을 고정한다.
//
// 이 산출물의 존재 이유는 단 하나다: **토큰만 주고 렌더링 규칙은 하나도 주지
// 않는 것.** 자기 컴포넌트 체계를 이미 갖춘 소비자(첫 사례 `stock/web`)가
// 팔레트만 kit 에 맞추려 할 때, `app.css` 를 물리면 Tailwind Preflight 가
// 딸려 들어와 그 앱이 브라우저 기본값에 기대던 자리를 전부 지운다.
// `stock/web` 은 `<p>` 를 129곳에서 쓰는데 `p` 선택자는 2개뿐이었다.
//
// 그래서 여기서 검사하는 것은 "무엇이 있는가"가 아니라 **"무엇이 없는가"**다.
// 누군가 tokens-entry.css 에 `@import "tailwindcss"` 를 넣거나 components.css
// 를 끌어오면 이 계약이 깨지고, 그 사고는 소비자 쪽에서 조용히 나타난다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const tokensCss = readFileSync(join(rootDir, 'bundle', 'dist', 'tokens.css'), 'utf8');
const appCss = readFileSync(join(rootDir, 'bundle', 'dist', 'app.css'), 'utf8');

/** 최상위 셀렉터를 뽑는다. @규칙(`@layer theme{`, `@media ...{`)은 셀렉터가 아니다. */
function selectors(css) {
  const out = new Set();
  for (const m of css.matchAll(/(^|[{}])\s*([^{}@]+?)\s*\{/g)) {
    for (const sel of m[2].split(',')) {
      const s = sel.trim();
      if (s) out.add(s);
    }
  }
  return out;
}

test('tokens.css 는 :root 계열 셀렉터만 갖는다 — 요소에 손대지 않는다', () => {
  const bad = [...selectors(tokensCss)].filter((s) => !/^:root\b|^:host$/.test(s));
  assert.deepEqual(
    bad,
    [],
    'tokens.css 에 :root 가 아닌 셀렉터가 들어왔다. 이 파일은 토큰만 내보내야 한다 — ' +
      '요소 규칙이 하나라도 있으면 자기 CSS 를 가진 소비자에게 예고 없는 회귀가 된다: ' +
      bad.join(', '),
  );
});

test('tokens.css 에 Preflight 가 섞이지 않는다', () => {
  // Preflight 가 실제로 회귀를 일으킨 속성들. 마이그레이션 9건에서 이 목록의
  // 항목이 하나씩 서비스를 깨뜨렸다(itad font-weight, profile hr, chzzk-auth
  // list marker, logflare img display, stock p margin).
  const fingerprints = [
    'box-sizing:border-box',
    'border-style:solid',
    '-webkit-tap-highlight-color',
    'tab-size',
    'list-style',
    'appearance:button',
    'font-feature-settings',
  ];
  const found = fingerprints.filter((f) => tokensCss.includes(f));
  assert.deepEqual(found, [], `tokens.css 에서 Preflight 흔적이 발견됐다: ${found.join(', ')}`);
});

test('tokens.css 와 app.css 의 토큰 값이 갈라지지 않는다', () => {
  // 둘은 같은 tokens/tokens.css 와 themes.css 를 읽지만, 진입점이 둘로 나뉜 뒤로는
  // 한쪽만 고치는 실수가 가능해졌다. 다크 기본값(:root 첫 블록)을 직접 비교한다.
  const rootBlock = (css) => {
    const m = css.match(/@layer theme\{:root,:host\{(.*?)\}/s) ?? css.match(/:root,:host\{(.*?)\}/s);
    assert.ok(m, ':root 토큰 블록을 찾지 못했다');
    return Object.fromEntries(
      m[1]
        .split(';')
        .map((d) => d.trim())
        .filter((d) => d.startsWith('--'))
        .map((d) => {
          const i = d.indexOf(':');
          return [d.slice(0, i).trim(), d.slice(i + 1).trim()];
        }),
    );
  };
  const a = rootBlock(appCss);
  const t = rootBlock(tokensCss);

  // app.css 는 Tailwind 유틸리티가 쓰는 변수(--spacing 등)를 더 갖고 있을 수 있다.
  // 검사는 "tokens.css 에 있는 것은 app.css 와 같은 값이어야 한다"로 한다.
  const mismatched = Object.keys(t).filter((k) => k in a && a[k] !== t[k]);
  assert.deepEqual(
    mismatched.map((k) => `${k}: app=${a[k]} tokens=${t[k]}`),
    [],
    '두 산출물의 토큰 값이 다르다 — 진입점 하나만 고쳤다',
  );

  // 색 토큰은 전부 양쪽에 있어야 한다. 하나라도 빠지면 소비자가 조용히
  // 정의되지 않은 var() 를 참조하게 된다.
  const colorsInApp = Object.keys(a).filter((k) => k.startsWith('--color-'));
  const missing = colorsInApp.filter((k) => !(k in t));
  assert.deepEqual(missing, [], `tokens.css 에서 빠진 색 토큰: ${missing.join(', ')}`);
});

test('tokens.css 는 라이트 테마를 포함한다', () => {
  for (const state of ['light', 'dark', 'auto']) {
    assert.ok(
      tokensCss.includes(`[data-theme=${state}]`) || tokensCss.includes(`[data-theme="${state}"]`),
      `data-theme=${state} 규칙이 없다 — 소비자가 테마를 고를 수 없다`,
    );
  }
});
