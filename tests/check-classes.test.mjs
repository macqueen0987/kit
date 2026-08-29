// kit lint(scripts/check-classes.mjs)의 추출 규칙을 고정한다.
//
// 이 도구의 값은 "정의되지 않은 클래스"를 정확히 짚는 데 있고, 오탐이 한 번
// 섞이면 목록 전체를 믿지 못하게 된다. 실제로 두 종류의 오탐을 겪었다:
//   - CSS 쪽: 주석의 `.card-body` 언급과 data URI 의 `www.w3.org` 가 정의로 잡혔다
//   - 마크업 쪽: `class="st-{{ c.status }}"` 가 `st-` 라는 없는 클래스로 쪼개졌다
// 둘 다 여기서 고정한다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { definedClasses, usedClasses, checkService } from '../scripts/check-classes.mjs';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('마크업: 이름 일부가 Jinja 로 만들어지면 클래스로 세지 않는다', () => {
  // `st-{{ c.status }}` 는 런타임에 st-done / st-waiting 같은 이름이 된다.
  // 리터럴 조각 `st-` 는 존재하지 않는 클래스이므로 보고하면 안 된다.
  const used = usedClasses('<li class="st-{{ c.status }}{% if x %} st-translating{% endif %}">');
  assert.ok(!used.has('st-'), '이름 일부가 동적인 토큰을 클래스로 셌다');
  assert.ok(used.has('st-translating'), '{% if %} 안의 온전한 클래스는 세야 한다');
});

test('마크업: {% if %} 로 클래스 전체가 갈리면 각 조각을 센다', () => {
  const used = usedClasses('<p class="flash {% if e %}err{% else %}ok{% endif %}">');
  for (const c of ['flash', 'err', 'ok']) assert.ok(used.has(c), `${c} 를 놓쳤다`);
});

test('마크업: {{ }} 하나로만 이뤄진 클래스 속성은 아무것도 세지 않는다', () => {
  const used = usedClasses('<body class="{{ body_class }}">');
  assert.equal(used.size, 0, `동적 전체 치환에서 ${[...used.keys()]} 를 셌다`);
});

test('CSS: 연결된 클래스(.badge.on)의 뒤쪽도 정의로 센다', () => {
  const d = definedClasses('.badge.on { color: red }');
  assert.ok(d.has('badge') && d.has('on'), `놓친 것: ${['badge', 'on'].filter((c) => !d.has(c))}`);
});

test('CSS: 주석·url()·문자열 안의 점은 정의가 아니다', () => {
  const d = definedClasses(`
    /* .ghost 는 주석이다 */
    .real { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E"); }
    .other { content: ".quoted"; --radius: .625rem; padding: calc(var(--spacing) * .5); }
  `);
  for (const bad of ['ghost', 'w3', 'org', 'css', 'quoted', '625rem', '5']) {
    assert.ok(!d.has(bad), `오탐: .${bad}`);
  }
  assert.ok(d.has('real') && d.has('other'), '실제 셀렉터를 놓쳤다');
});

test('CSS: Tailwind 이스케이프를 풀어 마크업 이름과 맞춘다', () => {
  // 번들에는 `.md\:gap-2\.5` 로 들어 있지만 마크업에는 `md:gap-2.5` 로 쓴다.
  const d = definedClasses('.md\\:gap-2\\.5{gap:10px}.w-1\\/2{width:50%}');
  assert.ok(d.has('md:gap-2.5'), `이스케이프를 못 풀었다: ${[...d]}`);
  assert.ok(d.has('w-1/2'), `분수 클래스를 못 풀었다: ${[...d]}`);
});

test('마크업 안의 <style> 블록도 정의로 센다', () => {
  // 별도 CSS 파일 없이 인라인 <style> 하나가 전부인 서비스가 있다(logflare).
  // 이걸 빼면 그 페이지의 모든 클래스가 "정의되지 않음"으로 잡혀 보고가
  // 통째로 쓸모없어진다 — 실제로 그렇게 오탐이 났다.
  const dir = mkdtempSync(join(tmpdir(), 'kit-lint-'));
  try {
    writeFileSync(
      join(dir, 'index.html'),
      '<style>.inline-only{color:red}</style><div class="inline-only nowhere"></div>',
      'utf8',
    );
    const r = checkService(dir);
    const names = r.undefined.map((u) => u.cls);
    assert.ok(!names.includes('inline-only'), '인라인 <style> 의 정의를 놓쳤다');
    assert.ok(names.includes('nowhere'), '진짜 미정의 클래스를 놓쳤다');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
