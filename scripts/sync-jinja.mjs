// jinja/kit.html 을 jinja/consumers.json 에 등록된 모든 소비 서비스로 복사한다.
//
// kit 의 Jinja 매크로는 pip 패키지가 아니라 vendored 사본으로 배포된다
// (이유는 jinja/kit.html 머리말 참고). 이 스크립트가 배포 경로 전체이고,
// tests/jinja-drift.test.mjs 가 사본이 뒤처지지 않았는지 검사한다.
//
//   node scripts/sync-jinja.mjs          복사한다
//   node scripts/sync-jinja.mjs --check  복사하지 않고 어긋난 곳만 보고한다(종료코드 1)
//
// 소비 서비스는 각자 다른 git 저장소이므로, 이 스크립트는 파일만 쓰고
// 커밋하지 않는다 — 각 서비스에서 따로 커밋한다.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const sourcePath = join(rootDir, 'jinja', 'kit.html');
const manifestPath = join(rootDir, 'jinja', 'consumers.json');

const checkOnly = process.argv.includes('--check');

const source = readFileSync(sourcePath, 'utf8');
const { consumers } = JSON.parse(readFileSync(manifestPath, 'utf8'));

let stale = 0;
let synced = 0;
let missing = 0;

for (const { service, path } of consumers) {
  const target = resolve(rootDir, path);

  if (!existsSync(target)) {
    // 아직 사본이 없는 서비스. --check 에서는 어긋남으로 세지 않는다 —
    // consumers 에 올라와 있으나 파일이 없는 상태는 마이그레이션 진행 중일 수 있다.
    if (checkOnly) {
      console.log(`  없음   ${service}  ${path}`);
      missing++;
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
  }

  const current = existsSync(target) ? readFileSync(target, 'utf8') : null;
  if (current === source) {
    console.log(`  최신   ${service}`);
    continue;
  }

  if (checkOnly) {
    console.log(`  어긋남 ${service}  ${path}`);
    stale++;
    continue;
  }

  writeFileSync(target, source, 'utf8');
  console.log(`  갱신   ${service}  ${path}`);
  synced++;
}

if (checkOnly) {
  console.log(`\n어긋남 ${stale}건, 없음 ${missing}건, 소비자 ${consumers.length}개`);
  if (stale > 0) {
    console.error('\njinja/kit.html 이 사본보다 앞서 있다. node scripts/sync-jinja.mjs 로 갱신할 것.');
    process.exit(1);
  }
} else {
  console.log(`\n갱신 ${synced}건, 소비자 ${consumers.length}개`);
}
