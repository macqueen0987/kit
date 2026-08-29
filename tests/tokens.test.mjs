import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contrastRatio } from '../scripts/color.mjs';
import { parseTokens, SERVICE_ACCENTS } from '../scripts/parse-tokens.mjs';

const css = readFileSync(new URL('../tokens/tokens.css', import.meta.url), 'utf8');
const t = parseTokens(css);

test('스펙 §5의 색 토큰이 모두 존재한다', () => {
  const required = [
    'bg', 'surface', 'surface-2', 'border', 'border-strong',
    'text', 'muted', 'dim',
    'accent', 'success', 'warning', 'danger', 'info', 'on-accent',
  ];
  for (const name of required) {
    assert.ok(t.has(name), `토큰 누락: --color-${name}`);
  }
});

test('표면 계단의 L값이 단조 증가한다', () => {
  const order = ['bg', 'surface', 'surface-2', 'border', 'border-strong'];
  for (let i = 1; i < order.length; i++) {
    const prev = t.get(order[i - 1])[0];
    const cur = t.get(order[i])[0];
    assert.ok(cur > prev, `${order[i]}(${cur})가 ${order[i - 1]}(${prev})보다 밝지 않다`);
  }
});

test('text와 muted는 모든 표면 위에서 본문 AA를 통과한다', () => {
  for (const fg of ['text', 'muted']) {
    for (const bg of ['bg', 'surface', 'surface-2']) {
      const r = contrastRatio(t.get(fg), t.get(bg));
      assert.ok(r >= 4.5, `${fg} on ${bg} = ${r.toFixed(2)}:1 (AA 4.5 미달)`);
    }
  }
});

test('dim은 큰 텍스트 기준 3:1은 넘는다', () => {
  // dim은 라벨·비활성 전용이라 본문 4.5는 요구하지 않는다 (스펙 §5)
  for (const bg of ['bg', 'surface', 'surface-2']) {
    const r = contrastRatio(t.get('dim'), t.get(bg));
    assert.ok(r >= 3, `dim on ${bg} = ${r.toFixed(2)}:1`);
  }
});

test('의미색은 bg 위에서 3:1을 넘는다', () => {
  for (const name of ['accent', 'success', 'warning', 'danger']) {
    const r = contrastRatio(t.get(name), t.get('bg'));
    assert.ok(r >= 3, `${name} on bg = ${r.toFixed(2)}:1`);
  }
});

test('on-accent는 모든 서비스 accent 위에서 AA를 통과한다', () => {
  const onAccent = t.get('on-accent');
  const failures = [];
  for (const { name, hue, chroma } of SERVICE_ACCENTS) {
    const r = contrastRatio(onAccent, [0.78, chroma, hue]);
    if (r < 4.5) failures.push(`${name}: ${r.toFixed(2)}:1`);
  }
  assert.deepEqual(failures, [], `accent 위 텍스트 대비 미달: ${failures.join(', ')}`);
});

test('서비스 accent는 10개이고 hue가 서로 20도 이상 떨어져 있다', () => {
  // 12개 -> 11개: mpw 폐기(스펙 §2.1). 11개 -> 10개: stock 이 자기 accent 를
  // 유지하기로 해 표에서 빠졌다(parse-tokens.mjs 주석 참조). 이 규칙은 kit 이
  // 색을 배정하는 서비스에만 적용되므로, 표에서 빠진 서비스는 검사 대상이 아니다.
  // 비어 있는 hue: 95(amber), 305(purple), 330(magenta).
  assert.equal(SERVICE_ACCENTS.length, 10);
  const hues = SERVICE_ACCENTS.map((s) => s.hue).sort((a, b) => a - b);
  for (let i = 1; i < hues.length; i++) {
    assert.ok(hues[i] - hues[i - 1] >= 20,
      `hue ${hues[i - 1]}와 ${hues[i]}가 너무 가깝다`);
  }
});
