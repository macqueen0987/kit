import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { parseTokens } from '../scripts/parse-tokens.mjs';

const distUrl = new URL('../bundle/dist/app.css', import.meta.url);

test('빌드 산출물이 존재한다', () => {
  assert.ok(existsSync(distUrl), 'pnpm build를 먼저 실행해야 한다');
});

const css = existsSync(distUrl) ? readFileSync(distUrl, 'utf8') : '';

test('토큰이 CSS 변수로 노출된다', () => {
  for (const name of ['bg', 'surface', 'surface-2', 'text', 'muted', 'accent', 'danger']) {
    assert.ok(css.includes(`--color-${name}:`), `변수 누락: --color-${name}`);
  }
});

test('tokens.css의 색 토큰이 하나도 빠짐없이 번들에 실린다', () => {
  // 스펙 §10 드리프트 탐지. 토큰을 추가하고 빌드를 잊는 경우를 잡는다.
  const tokensCss = readFileSync(new URL('../tokens/tokens.css', import.meta.url), 'utf8');
  const missing = [...parseTokens(tokensCss).keys()]
    .filter((name) => !css.includes(`--color-${name}:`));
  assert.deepEqual(missing, [], `번들에 없는 토큰: ${missing.join(', ')}`);
});

test('토큰 색 유틸리티가 생성된다', () => {
  const required = [
    '.bg-surface', '.bg-surface-2', '.bg-accent', '.bg-danger',
    '.text-muted', '.text-dim', '.text-accent',
    '.border-border', '.border-border-strong',
  ];
  for (const cls of required) {
    assert.ok(css.includes(cls), `유틸리티 누락: ${cls}`);
  }
});

test('Tailwind 기본 컬러 팔레트는 포함되지 않는다', () => {
  // 미니파이어가 셀렉터를 콤마로 묶어도 잡히도록 정규식으로 검사한다
  const forbidden = ['bg-red-500', 'text-blue-600', 'bg-zinc-900', 'text-gray-400'];
  for (const name of forbidden) {
    const re = new RegExp('\\.' + name.replace(/-/g, '\\-') + '[{,\\s]');
    assert.ok(!re.test(css), `기본 팔레트가 새어 들어왔다: .${name}`);
  }
});

test('간격 스케일이 생성된다', () => {
  for (const cls of ['.p-4', '.px-6', '.mt-2', '.gap-3', '.mb-16', '.p-0\\.5']) {
    assert.ok(css.includes(cls), `간격 유틸리티 누락: ${cls}`);
  }
});

test('스케일에 없는 간격은 생성되지 않는다', () => {
  // 4px 배수 리듬을 깨는 값 (스펙 §6.1)
  // 미니파이어가 셀렉터를 콤마로 묶어도 잡히도록 정규식으로 검사한다
  for (const name of ['p-7', 'p-9', 'p-11', 'p-14']) {
    const re = new RegExp('\\.' + name.replace('-', '\\-') + '[{,\\s]');
    assert.ok(!re.test(css), `스케일 밖 값이 생성됐다: .${name}`);
  }
});

test('레이아웃·타이포 유틸리티가 생성된다', () => {
  for (const cls of ['.flex', '.grid', '.grid-cols-3', '.items-center',
                     '.justify-between', '.w-full', '.hidden',
                     '.text-sm', '.text-2xl', '.font-medium', '.rounded-lg']) {
    assert.ok(css.includes(cls), `유틸리티 누락: ${cls}`);
  }
});

test('variant가 생성된다', () => {
  assert.ok(css.includes('.hover\\:bg-surface-2'), 'hover: variant 누락');
  assert.ok(css.includes('.focus-visible\\:border-accent'), 'focus-visible: variant 누락');
  assert.ok(css.includes('.md\\:grid-cols-2'), 'md: breakpoint 누락');
});

test('컴포넌트 클래스가 생성된다', () => {
  for (const cls of ['.btn', '.btn-primary', '.btn-ghost', '.btn-danger',
                     '.card', '.input', '.badge', '.alert', '.empty']) {
    assert.ok(css.includes(cls), `컴포넌트 클래스 누락: ${cls}`);
  }
});

test('파일럿 리뷰에서 발견된 공백이 메워졌다', () => {
  const required = [
    '.w-8', '.h-8', '.w-12', '.size-6', '.min-w-0', '.w-1\\/2',
    '.sr-only', '.font-mono', '.break-words', '.divide-y',
    '.-mt-2', '.ring-2', '.ring-accent', '.whitespace-pre-wrap',
  ];
  for (const cls of required) {
    assert.ok(css.includes(cls), `유틸리티 누락: ${cls}`);
  }
});

test('Task 7 파일럿 리포트에서 드러난 safelist 공백이 메워졌다', () => {
  // gap-2.5: check-row의 원래 10px gap을 재현하지 못했던 하프스텝 공백
  // min-w-*/min-h-*: 숫자 스케일 자체가 전무했다 (0/full/screen뿐)
  // rounded-xs: --radius-sm 이름 충돌을 피해 정확한 4px를 내는 escape hatch
  const required = [
    '.gap-2\\.5', '.p-2\\.5', '.mb-3\\.5',
    '.min-w-11', '.min-h-11', '.min-w-24', '.min-h-32',
    '.rounded-xs',
  ];
  for (const cls of required) {
    assert.ok(css.includes(cls), `유틸리티 누락: ${cls}`);
  }
});
