import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { parseTokens } from '../scripts/parse-tokens.mjs';

const distUrl = new URL('../bundle/dist/app.css', import.meta.url);

test('빌드 산출물이 존재한다', () => {
  assert.ok(existsSync(distUrl), 'pnpm build를 먼저 실행해야 한다');
});

const css = existsSync(distUrl) ? readFileSync(distUrl, 'utf8') : '';

// I2 — 단순 css.includes(cls)는 부분 문자열로도 통과한다. 예를 들어
// css.includes('.alert')는 '.alert-ok'만 있어도 참이라, ".alert" 베이스 클래스
// 자체가 번들에서 빠져도 테스트가 못 잡는다(.btn/.btn-primary, .card/.card-header,
// .badge/.badge-accent, .bg-surface/.bg-surface-2도 동일한 함정). 클래스 이름 뒤에
// 셀렉터 구분자(콤마·공백·중괄호·콜론) 또는 파일 끝이 오는지 확인하는 경계 인식
// 매칭으로 모든 양성 단언을 통일한다 — 아래 forbidden-class 테스트가 이미 쓰던
// 방식과 같은 원리다.
function classSelectorRegExp(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped + '(?![\\w-])');
}

function assertClass(cssText, name, msg) {
  assert.ok(classSelectorRegExp(name).test(cssText), msg ?? `유틸리티 누락: ${name}`);
}

function assertClasses(cssText, names) {
  for (const name of names) assertClass(cssText, name);
}

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

test('I1 — 컴포넌트 클래스가 프라이빗 --kit-radius를 쓰고 공개 --radius를 참조하지 않는다', () => {
  assert.ok(css.includes('--kit-radius:'), '--kit-radius 토큰 누락');
  for (const cls of ['.btn{', '.card{', '.alert{']) {
    const start = css.indexOf(cls);
    assert.ok(start !== -1, `${cls} 규칙을 찾을 수 없다`);
    const end = css.indexOf('}', start);
    const body = css.slice(start, end);
    assert.ok(body.includes('var(--kit-radius)'), `${cls} 규칙이 --kit-radius를 쓰지 않는다`);
    assert.ok(!body.includes('var(--radius)'), `${cls} 규칙이 여전히 공개 --radius를 참조한다 — 소비자 재정의에 노출된다`);
  }
});

test('토큰 색 유틸리티가 생성된다', () => {
  assertClasses(css, [
    '.bg-surface', '.bg-surface-2', '.bg-accent', '.bg-danger',
    '.text-muted', '.text-dim', '.text-accent',
    '.border-border', '.border-border-strong',
  ]);
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
  assertClasses(css, ['.flex', '.grid', '.grid-cols-3', '.items-center',
                     '.justify-between', '.w-full', '.hidden',
                     '.text-sm', '.text-2xl', '.font-medium', '.rounded-lg']);
});

test('C2 — md:/lg: 반응형 커버리지가 레이아웃 스위치 너머로 확장됐다', () => {
  assertClasses(css, [
    '.md\\:p-4', '.md\\:gap-4', '.lg\\:p-6', '.lg\\:gap-6',
    '.md\\:flex-col', '.lg\\:flex-row',
    '.md\\:w-full', '.lg\\:w-auto',
    '.md\\:col-span-2', '.lg\\:col-span-4',
    '.md\\:text-lg', '.lg\\:text-xl',
    '.md\\:items-center', '.lg\\:justify-between',
  ]);
});

test('C2 — sm:/xl:는 의도적으로 없다 (스펙·safelist 합의)', () => {
  const re = /\.(sm|xl)\\:/;
  assert.ok(!re.test(css), 'sm:/xl: variant가 생성됐다 — safelist.css 주석과 스펙 §6.1을 함께 갱신했는지 확인');
});

test('variant가 생성된다', () => {
  assert.ok(css.includes('.hover\\:bg-surface-2'), 'hover: variant 누락');
  assert.ok(css.includes('.focus-visible\\:border-accent'), 'focus-visible: variant 누락');
  assert.ok(css.includes('.md\\:grid-cols-2'), 'md: breakpoint 누락');
});

test('컴포넌트 클래스가 생성된다', () => {
  assertClasses(css, ['.btn', '.btn-primary', '.btn-ghost', '.btn-danger',
                     '.card', '.card-header', '.card-body',
                     '.input', '.select', '.textarea',
                     '.badge', '.badge-accent', '.badge-ok', '.badge-warn', '.badge-danger',
                     '.alert', '.alert-ok', '.alert-warn', '.alert-danger',
                     '.empty', '.pagination', '.table']);
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

test('C1 — 폰트 @import가 다른 규칙보다 앞서 살아남는다', () => {
  const importIdx = css.indexOf('@import "https://fonts.googleapis.com/css2');
  assert.ok(importIdx !== -1, '폰트 @import가 번들에 없다 — bundle/src/app.css 확인');
  assert.ok(css.includes('Noto+Sans+KR'), 'Noto Sans KR 서브셋 요청 누락');
  assert.ok(css.includes('Noto+Sans+Mono'), 'Noto Sans Mono 서브셋 요청 누락');
  // @layer 순서 선언과 @charset 정도만 앞에 올 수 있고, 실질 규칙(@layer 블록 등)은
  // 이 @import 뒤에 와야 한다 — 앞쪽에 여는 중괄호 '{'가 없어야 한다는 뜻이다.
  const before = css.slice(0, importIdx);
  assert.ok(!before.includes('{'), '@import보다 앞에 블록 규칙이 와 있다 — CSS 명세 위반으로 빌드가 이를 무시하거나 재배치했을 수 있다');
});

test('I4 — 레이어 순서 선언이 파일 맨 앞에 살아남는다', () => {
  const layerIdx = css.indexOf('@layer properties,theme,base,components,utilities;');
  const importIdx = css.indexOf('@import "https://fonts.googleapis.com/css2');
  assert.ok(layerIdx !== -1, '@layer 순서 선언이 번들에 없다');
  assert.ok(layerIdx < importIdx, '@layer 순서 선언이 폰트 @import보다 뒤에 있다');
  const before = css.slice(0, layerIdx);
  assert.ok(!before.includes('{'), '@layer 순서 선언보다 앞에 블록 규칙이 와 있다');
});
