// 라이트 테마가 다크와 **같은 대비 게이트**를 통과하는지 고정한다.
//
// 라이트 팔레트는 다크 값을 그냥 뒤집은 것이 아니다. 의미색은 L 을 0.80 대에서
// 0.52 근처로 크게 낮춰야 하고(다크 값을 그대로 쓰면 흰 바탕에서 3:1 도 못
// 넘는다), accent 도 마찬가지다. 값이 손으로 고른 것이므로 게이트를 테스트로
// 잡아두지 않으면 나중에 한 값만 조정하다 조용히 무너진다.
//
// 다크 쪽 게이트는 tokens.test.mjs 에 있다. 두 파일이 같은 기준을 쓴다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contrastRatio } from '../scripts/color.mjs';
import { SERVICE_ACCENTS } from '../scripts/parse-tokens.mjs';

const themes = readFileSync(new URL('../bundle/src/themes.css', import.meta.url), 'utf8');

/** `[data-theme="light"]` 블록 안의 --color-* oklch 값을 뽑는다. */
function lightTokens(css) {
  const start = css.indexOf(':root[data-theme="light"]');
  assert.ok(start > 0, 'themes.css 에 라이트 블록이 없다');
  const block = css.slice(start, css.indexOf('}', start));
  const out = new Map();
  const re = /--color-([\w-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g;
  for (const m of block.matchAll(re)) out.set(m[1], [Number(m[2]), Number(m[3]), Number(m[4])]);
  return out;
}

const t = lightTokens(themes);
const SURFACES = ['bg', 'surface', 'surface-2'];

// 라이트에서 accent 가 낮춰지는 L. themes.css 의 oklch(from ... L c h) 에서 읽어
// 테스트와 구현이 따로 놀지 않게 한다.
const accentL = (() => {
  const m = themes.match(/--color-accent:\s*oklch\(from var\(--kit-accent\)\s+([\d.]+)\s+c\s+h\)/);
  assert.ok(m, 'themes.css 에서 라이트 accent 의 L 을 읽지 못했다');
  return Number(m[1]);
})();

test('라이트 팔레트에 필요한 토큰이 모두 있다', () => {
  for (const n of ['bg', 'surface', 'surface-2', 'border', 'border-strong',
                   'text', 'muted', 'dim', 'success', 'warning', 'danger', 'info', 'on-accent']) {
    assert.ok(t.has(n), `라이트 토큰 누락: --color-${n}`);
  }
});

test('라이트 표면 계단의 L값이 단조 감소한다', () => {
  // 다크는 bg 가 가장 어둡고 올라가지만, 라이트는 bg 가 가장 밝고 내려간다.
  const order = ['bg', 'surface', 'surface-2', 'border', 'border-strong'];
  for (let i = 1; i < order.length; i++) {
    const prev = t.get(order[i - 1])[0];
    const cur = t.get(order[i])[0];
    assert.ok(cur < prev, `${order[i]}(L=${cur})가 ${order[i - 1]}(L=${prev})보다 어둡지 않다`);
  }
});

test('라이트: text 와 muted 는 모든 표면 위에서 본문 AA', () => {
  const fails = [];
  for (const fg of ['text', 'muted']) {
    for (const bg of SURFACES) {
      const r = contrastRatio(t.get(fg), t.get(bg));
      if (r < 4.5) fails.push(`${fg} on ${bg}: ${r.toFixed(2)}:1`);
    }
  }
  assert.deepEqual(fails, [], '본문 AA 미달:\n' + fails.join('\n'));
});

test('라이트: dim 은 큰 텍스트 기준 3:1은 넘는다', () => {
  const fails = [];
  for (const bg of SURFACES) {
    const r = contrastRatio(t.get('dim'), t.get(bg));
    if (r < 3) fails.push(`dim on ${bg}: ${r.toFixed(2)}:1`);
  }
  assert.deepEqual(fails, [], fails.join('\n'));
});

test('라이트: 의미색이 bg 위에서 본문 AA', () => {
  // 다크 쪽 게이트는 3:1(아이콘·테두리 기준)이지만, 라이트에서는 본문 색으로
  // 쓰는 경우가 더 흔해 AA 로 더 엄하게 잡는다. 실측 여유는 최소 0.4 정도다.
  const fails = [];
  for (const c of ['success', 'warning', 'danger', 'info']) {
    const r = contrastRatio(t.get(c), t.get('bg'));
    if (r < 4.5) fails.push(`${c}: ${r.toFixed(2)}:1`);
  }
  assert.deepEqual(fails, [], '의미색 AA 미달:\n' + fails.join('\n'));
});

test('라이트: on-accent 가 12개 서비스 accent 전부에서 AA', () => {
  const fails = [];
  for (const { name, hue, chroma } of SERVICE_ACCENTS) {
    const accent = [accentL, chroma, hue];
    const r = contrastRatio(t.get('on-accent'), accent);
    if (r < 4.5) fails.push(`${name}: ${r.toFixed(2)}:1`);
  }
  assert.deepEqual(fails, [], 'accent 배경 위 글자 AA 미달:\n' + fails.join('\n'));
});

test('라이트: accent 를 글자로 써도 bg 위에서 AA', () => {
  // 링크 색이 대표적인 경우다. 라이트에서 accent 의 L 을 낮춘 이유가 이것이다 —
  // 다크 값(L 0.78)을 그대로 쓰면 흰 바탕에서 2:1 도 안 나온다.
  const fails = [];
  for (const { name, hue, chroma } of SERVICE_ACCENTS) {
    const r = contrastRatio([accentL, chroma, hue], t.get('bg'));
    if (r < 4.5) fails.push(`${name}: ${r.toFixed(2)}:1`);
  }
  assert.deepEqual(fails, [], 'accent 글자 AA 미달:\n' + fails.join('\n'));
});

test('다크 accent 를 라이트에 그대로 쓰면 실패한다 (L 을 낮추는 이유의 근거)', () => {
  // 이 테스트가 깨지면 라이트 accent 의 L 조정이 불필요해졌다는 뜻이므로
  // themes.css 의 설명과 함께 다시 판단할 것.
  const DARK_ACCENT_L = 0.78;
  const worst = Math.max(
    ...SERVICE_ACCENTS.map(({ hue, chroma }) => contrastRatio([DARK_ACCENT_L, chroma, hue], t.get('bg'))),
  );
  assert.ok(worst < 4.5, `다크 accent 가 라이트 bg 위에서 이미 AA 다(최대 ${worst.toFixed(2)}:1) — L 조정이 불필요할 수 있다`);
});

test('themes.css 가 prefers-color-scheme 을 기본으로 따르지 않는다', () => {
  // 기본이 시스템 설정을 따르면, 다크를 전제로 하드코딩된 값을 가진 기존
  // 서비스들이 예고 없이 깨진다. 라이트는 data-theme 로 명시적으로 켠다.
  // media 블록은 존재하되 반드시 [data-theme="auto"] 로 한정돼 있어야 한다.
  const mediaBlocks = [...themes.matchAll(/@media \(prefers-color-scheme: light\)\s*\{([\s\S]*?)\n  \}/g)];
  assert.ok(mediaBlocks.length >= 1, 'auto 모드용 media 블록이 없다');
  for (const [, body] of mediaBlocks) {
    assert.match(body, /\[data-theme="auto"\]/, 'prefers-color-scheme 블록이 auto 로 한정돼 있지 않다');
    // auto 로 한정된 셀렉터를 통째로 지운 뒤에도 셀렉터가 남아 있으면,
    // 그건 조건 없이 적용되는 규칙이라는 뜻이다.
    const withoutAuto = body.replace(/:root\[data-theme="auto"\]\s*\{[\s\S]*?\n {4}\}/g, '');
    assert.doesNotMatch(
      withoutAuto,
      /:root|html|\bbody\b/,
      'prefers-color-scheme 블록에 auto 한정이 아닌 규칙이 있다 — 기존 서비스가 예고 없이 라이트로 뒤집힌다',
    );
  }
});
