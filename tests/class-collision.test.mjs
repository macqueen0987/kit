// kit 컴포넌트 클래스와 소비 서비스 클래스의 이름 겹침을 고정한다.
//
// 겹치면 서비스가 자기가 정의한 속성만 이기고 나머지는 kit 이 채운다 — 어느
// 쪽도 의도하지 않은 혼종이 조용히 만들어진다. 실제로 세 번 겪었다:
//   .btn        itad 가 display 를 안 정해 kit 의 inline-flex 를 물려받았다
//   .badge      itad 가 font-weight 를 안 정해 kit 의 500 을 물려받았다
//   .check-row  kit 에 추가한 순간 agent-gate 의 체크 행 높이가 44px 로 바뀌었다
//
// 겹침 자체를 금지하지는 않는다 — kit 이 .btn/.card 같은 일반적인 이름을 쓰기로
// 한 이상 계속 생긴다. 대신 known-class-collisions.json 에 **검토를 마친 목록**을
// 두고, 목록에 없는 새 겹침이 생기면 여기서 실패시킨다. 새 컴포넌트를 추가할
// 때마다 12개 서비스를 손으로 뒤지지 않아도 되게 하는 것이 목적이다.
//
// 새 겹침이 나왔을 때 할 일:
//   1) 그 서비스에서 어떤 속성이 kit 으로 넘어가는지 확인한다(브라우저 계산값 대조).
//   2) 받아들일 만하면 node scripts/check-class-collisions.mjs --json 으로
//      목록을 갱신하고, 왜 받아들이는지 커밋 메시지에 남긴다.
//   3) 받아들일 수 없으면 kit 쪽 이름을 바꾼다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { scanCollisions, kitComponentClasses, stripNoise } from '../scripts/check-class-collisions.mjs';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const knownPath = join(rootDir, 'known-class-collisions.json');

test('kit 컴포넌트 클래스의 이름 겹침이 검토된 목록과 같다', () => {
  const known = JSON.parse(readFileSync(knownPath, 'utf8'));
  const { collisions } = scanCollisions();

  const fresh = [];
  for (const [cls, services] of Object.entries(collisions)) {
    const before = new Set(known[cls] ?? []);
    const added = services.filter((s) => !before.has(s));
    if (added.length) fresh.push(`.${cls} ← ${added.join(', ')}`);
  }

  assert.deepEqual(
    fresh,
    [],
    '검토되지 않은 새 이름 겹침이 생겼다. 그 서비스에서 어떤 속성이 kit 으로 ' +
    '넘어가는지 확인한 뒤, 받아들일 만하면 ' +
    '`node scripts/check-class-collisions.mjs --json > known-class-collisions.json` 으로 ' +
    '목록을 갱신하고 이유를 커밋에 남길 것. 받아들일 수 없으면 kit 쪽 이름을 바꿀 것.\n' +
    fresh.join('\n'),
  );

  // 사라진 겹침(서비스가 마이그레이션으로 자기 규칙을 지운 경우)은 실패시키지
  // 않는다 — 좋은 방향이다. 다만 목록이 낡았다는 신호이므로 알려는 준다.
  const gone = Object.keys(known).filter((c) => !collisions[c]);
  if (gone.length) console.log(`  (해소된 겹침: ${gone.map((c) => '.' + c).join(' ')} — 목록을 줄여도 된다)`);
});

test('겹침 조사기가 주석과 URL 을 정의로 오인하지 않는다', () => {
  // 이 두 가지가 실제로 오탐을 만들었다 — agent-gate 주석의 ".card-body 가
  // 이긴다"가 정의로 잡혔고, 화살표 SVG 의 data URI 에서 .w3/.org/.css 가
  // 클래스 이름으로 잡혔다. 조사기가 이걸 계속 걸러내는지 고정한다.
  const sample = `
    /* .ghost-class 는 주석이라 정의가 아니다 */
    .real { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E"); }
    .other { content: ".quoted"; }
  `;
  const stripped = stripNoise(sample);
  assert.ok(!stripped.includes('ghost-class'), '주석이 지워지지 않았다');
  assert.ok(!stripped.includes('w3.org'), 'url() 이 지워지지 않았다');
  assert.ok(!stripped.includes('.quoted'), '문자열이 지워지지 않았다');
  assert.ok(stripped.includes('.real') && stripped.includes('.other'), '실제 셀렉터까지 지웠다');
});

test('조사 대상 클래스 목록이 실제 컴포넌트를 담고 있다', () => {
  // 조사기가 클래스를 하나도 못 뽑으면 위 테스트가 조용히 통과한다.
  const componentsCss = readFileSync(join(rootDir, 'bundle', 'src', 'components.css'), 'utf8');
  const classes = kitComponentClasses(componentsCss);
  for (const must of ['btn', 'card', 'input', 'select', 'badge', 'checkbox', 'radio', 'switch', 'check-row']) {
    assert.ok(classes.includes(must), `조사 대상에서 .${must} 가 빠졌다`);
  }
  assert.ok(existsSync(knownPath), 'known-class-collisions.json 이 없다');
});
