import { test } from 'node:test';
import assert from 'node:assert/strict';
import { oklchToLinearRgb, contrastRatio, wcagLevel } from '../scripts/color.mjs';

test('oklch 흰색은 선형 sRGB에서 1에 가깝다', () => {
  const [r, g, b] = oklchToLinearRgb(1, 0, 0);
  assert.ok(Math.abs(r - 1) < 0.01, `r=${r}`);
  assert.ok(Math.abs(g - 1) < 0.01, `g=${g}`);
  assert.ok(Math.abs(b - 1) < 0.01, `b=${b}`);
});

test('oklch 검정은 선형 sRGB에서 0이다', () => {
  const rgb = oklchToLinearRgb(0, 0, 0);
  for (const c of rgb) assert.ok(c < 0.001, `채널이 0이 아니다: ${c}`);
});

test('색역 밖 값은 0~1로 클램프된다', () => {
  const rgb = oklchToLinearRgb(0.8, 0.4, 145);
  for (const c of rgb) {
    assert.ok(c >= 0 && c <= 1, `클램프 안 됨: ${c}`);
  }
});

test('흰색 대 검정의 대비비는 21:1이다', () => {
  const r = contrastRatio([1, 0, 0], [0, 0, 0]);
  assert.ok(Math.abs(r - 21) < 0.1, `21이 아니라 ${r}`);
});

test('대비비는 순서에 무관하다', () => {
  const a = contrastRatio([0.97, 0, 285], [0.145, 0.005, 285]);
  const b = contrastRatio([0.145, 0.005, 285], [0.97, 0, 285]);
  assert.equal(a.toFixed(4), b.toFixed(4));
});

test('같은 색끼리의 대비비는 1:1이다', () => {
  const r = contrastRatio([0.5, 0.1, 200], [0.5, 0.1, 200]);
  assert.ok(Math.abs(r - 1) < 0.0001, `1이 아니라 ${r}`);
});

test('wcagLevel 경계값', () => {
  assert.equal(wcagLevel(21), 'AAA');
  assert.equal(wcagLevel(7), 'AAA');
  assert.equal(wcagLevel(6.9), 'AA');
  assert.equal(wcagLevel(4.5), 'AA');
  assert.equal(wcagLevel(4.4), 'AA Large');
  assert.equal(wcagLevel(3), 'AA Large');
  assert.equal(wcagLevel(2.9), 'fail');
});
