// kit 의 Jinja 매크로는 pip 패키지가 아니라 소비 서비스로 복사되는 vendored
// 사본으로 배포된다. 사본 방식의 유일한 실패 양상은 "원본만 고치고 사본을 잊는
// 것"이고, 그러면 CDN URL 이나 accent 주입 방식을 바꿔도 서비스는 옛 동작을
// 유지한 채 아무 에러 없이 계속 돈다 — 이 저장소가 막으려는 조용한 실패다.
//
// dist/app.css 를 지키는 dist-drift.test.mjs 와 같은 역할을 매크로에 대해 한다.
// 아직 마이그레이션하지 않은 서비스는 사본이 없는 것이 정상이므로 건너뛴다.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const sourcePath = join(rootDir, 'jinja', 'kit.html');
const manifestPath = join(rootDir, 'jinja', 'consumers.json');

const digest = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);

test('vendored 매크로 사본이 jinja/kit.html 과 바이트 동일하다', () => {
  assert.ok(existsSync(sourcePath), `매크로 원본이 없다: ${sourcePath}`);
  const source = readFileSync(sourcePath, 'utf8');
  const { consumers } = JSON.parse(readFileSync(manifestPath, 'utf8'));

  const stale = [];
  let checked = 0;

  for (const { service, path } of consumers) {
    const target = resolve(rootDir, path);
    // 사본이 아직 없는 서비스는 마이그레이션 전이다. consumers 에 등록하는 것과
    // 실제로 마이그레이션하는 것 사이에 시차가 있어도 테스트가 막지 않는다.
    if (!existsSync(target)) continue;
    checked++;
    const copy = readFileSync(target, 'utf8');
    if (digest(copy) !== digest(source)) {
      stale.push(
        `${service} (${path}): ` +
        `사본 ${Buffer.byteLength(copy)}바이트 / 원본 ${Buffer.byteLength(source)}바이트`,
      );
    }
  }

  assert.deepEqual(
    stale,
    [],
    'vendored 매크로 사본이 jinja/kit.html 보다 뒤처졌다 — ' +
    'node scripts/sync-jinja.mjs 로 갱신하고 각 서비스 저장소에서 커밋할 것.\n' +
    stale.join('\n'),
  );

  // kit 단독 클론 (GitHub Actions)에는 소비자 사본이 없다. 그 경우 바이트
  // 비교는 스킵하고, 아래 매크로 계약 테스트가 URL 규칙을 지킨다.
  const workspaceConsumer = existsSync(resolve(rootDir, '../itad'));
  if (!workspaceConsumer) return;
  assert.ok(checked >= 1, 'vendored 사본을 하나도 찾지 못했다 — consumers.json 경로를 확인할 것');
});

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
  // 폰트 <link> 는 넣지 않는다 — 번들의 @import 가 처리한다(스펙 §5.1).
  assert.doesNotMatch(
    source,
    /<link[^>]+fonts\.googleapis\.com\/css2/,
    '폰트 스타일시트 <link> 가 들어 있다 — 폰트는 번들 @import 가 처리한다(preconnect 는 무방)',
  );
});
