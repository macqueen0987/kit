// I3 — bundle/dist/app.css는 edge가 바인드 마운트로 그대로 서빙하는 배포 산출물이다.
// safelist.css나 components.css를 고치고 pnpm build를 잊은 채 커밋하면 다른 모든
// 테스트가 통과하고(그 테스트들은 이미 커밋된 dist만 읽는다) 실서비스 URL만
// 조용히 낡은 채로 남는다. 이 테스트는 src를 실제로 다시 빌드해 커밋된 dist와
// 바이트 단위로 비교한다 — 재빌드 비용이 100ms 남짓이라 매 pnpm test마다 돌려도
// 부담이 없다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
// 배포 산출물은 두 개다. app.css 는 전체 번들, tokens.css 는 토큰 전용
// 진입점(자기 컴포넌트 체계를 가진 소비자용 — bundle/src/tokens-entry.css 주석 참조).
// 둘 다 edge 가 그대로 서빙하므로 둘 다 드리프트를 막아야 한다.
const ARTIFACTS = [
  { entry: join('bundle', 'src', 'app.css'),          out: 'app.css' },
  { entry: join('bundle', 'src', 'tokens-entry.css'), out: 'tokens.css' },
];

for (const { entry, out } of ARTIFACTS) test(`dist/${out}가 src의 최신 빌드 결과와 바이트 동일하다 (I3)`, () => {
  const distPath = join(rootDir, 'bundle', 'dist', out);
  assert.ok(existsSync(distPath), `bundle/dist/${out}가 없다 — pnpm build를 먼저 실행해야 한다`);

  // pnpm의 node_modules는 심링크 구조라, .pnpm 스토어의 실제 경로(realpath)로
  // @tailwindcss/cli의 진입 파일을 직접 실행하면 CLI 내부의 "tailwindcss" 패키지
  // 해석이 그 realpath 기준으로 일어나 실패한다(node_modules/tailwindcss가 루트에는
  // 없고 node_modules/@tailwindcss/cli/node_modules/tailwindcss에만 있기 때문).
  // package.json의 "build" 스크립트가 실제로 쓰는 것과 똑같이 node_modules/.bin의
  // 심링크 경로를 그대로 실행해야 pnpm build와 동일하게 동작한다 — 이것이 "실제
  // pnpm build와 동일한 재빌드"를 보장하는 가장 신뢰할 수 있는 방법이다.
  const binName = process.platform === 'win32' ? 'tailwindcss.CMD' : 'tailwindcss';
  const cliBin = join(rootDir, 'node_modules', '.bin', binName);
  assert.ok(existsSync(cliBin), `tailwindcss CLI를 찾을 수 없다: ${cliBin} — pnpm install을 먼저 실행해야 한다`);

  const tmpDir = mkdtempSync(join(tmpdir(), 'kit-dist-drift-'));
  const tmpOut = join(tmpDir, out);
  try {
    // shell:true + 배열 인자 조합은 Node 22부터 이스케이프 미흡을 이유로
    // deprecation 경고를 낸다 — 인자는 전부 이 파일이 만든 경로뿐이라 인젝션
    // 위험은 없지만, 경고 없이 넘어가도록 하나의 커맨드 문자열로 직접 조립한다.
    const cmd = `"${cliBin}" -i "${entry}" -o "${tmpOut}" --minify`;
    execFileSync(cmd, {
      cwd: rootDir,
      stdio: 'pipe',
      shell: true,
    });
    const fresh = readFileSync(tmpOut, 'utf8');
    const committed = readFileSync(distPath, 'utf8');
    // 두 문자열을 그대로 assert.equal에 넘기면 실패 시 64KB짜리 CSS 두 벌이
    // actual/expected로 통째로 덤프돼(100KB+) 정작 읽어야 할 안내 문구가 묻힌다.
    // 비교는 해시로 하고, 사람이 볼 정보는 메시지에 요약해서 담는다.
    const digest = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);
    assert.equal(
      digest(fresh),
      digest(committed),
      `bundle/dist/${out}가 bundle/src를 방금 다시 빌드한 결과와 다르다 — ` +
      'safelist.css/components.css/tokens.css를 고친 뒤 pnpm build를 실행하지 않고 커밋했다. ' +
      `pnpm build로 dist/${out}를 갱신하고 다시 커밋할 것. ` +
      `(커밋된 dist ${committed.length}바이트 / 재빌드 ${fresh.length}바이트)`
    );
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});
