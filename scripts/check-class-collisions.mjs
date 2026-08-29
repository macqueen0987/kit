// kit 컴포넌트 클래스 이름이 소비 서비스의 자체 클래스와 겹치는지 조사한다.
//
// 왜 필요한가: kit 컴포넌트는 @layer components 안에 있고 서비스 CSS 는 레이어
// 밖이라, 이름이 겹치면 서비스가 "자기가 정의한 속성"만 이기고 정의하지 않은
// 속성은 kit 이 채운다. 어느 쪽도 의도하지 않은 혼종이 조용히 만들어진다.
// itad 마이그레이션에서 .btn(display)·.badge(font-weight)가 실제로 이렇게 섞였고,
// kit 에 .check-row 를 추가했을 때 agent-gate 의 체크 행 높이가 함께 바뀌었다.
//
// 겹침 자체를 금지하지는 않는다 — kit 이 .btn/.card 같은 일반적인 이름을 쓰기로
// 한 이상 겹침은 계속 생긴다. 대신 **알려진 겹침 목록을 문서로 고정**하고,
// 목록에 없는 새 겹침이 생기면 테스트가 실패하게 한다. 새 컴포넌트를 추가할 때
// 마다 12개 서비스를 손으로 뒤지지 않아도 되게 하는 것이 목적이다.
//
//   node scripts/check-class-collisions.mjs           현황 출력
//   node scripts/check-class-collisions.mjs --json    기계용 출력

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const workspaceDir = join(rootDir, '..', '..');

// 벤더에서 가져온 CSS 는 우리 코드가 아니다. 여기서 나온 겹침은 그 서비스가
// 그 라이브러리를 kit 과 같은 페이지에 올릴 때만 문제가 되고, 그건 해당
// 마이그레이션에서 판단할 일이라 조사 대상에서 뺀다.
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.venv', 'venv', '__pycache__', 'dist', 'build',
  'vendor', 'archive', 'backups', '.superpowers', 'htmlcov', 'site-packages',
]);

/** 주석과 문자열·url() 을 지운다.
 *
 * 이걸 하지 않으면 오탐이 쏟아진다 — 주석에 적어둔 ".card-body 가 이긴다" 같은
 * 설명이 정의로 잡히고(agent-gate 가 실제로 그랬다), 화살표 SVG 의 data URI 안
 * "www.w3.org/2000/svg" 에서 .w3 / .org / .css 가 클래스 이름으로 잡힌다. */
export function stripNoise(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/url\((['"]?)[\s\S]*?\1\)/g, 'url()')
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''");
}

/** kit 이 @layer components 에 정의하는 클래스 이름을 뽑는다. */
export function kitComponentClasses(css) {
  const clean = stripNoise(css);
  const inLayer = clean.slice(clean.indexOf('@layer components'));
  const names = new Set();
  // 셀렉터 위치의 `.foo` 만 — 값 안이나 속성 안의 점은 앞 문자로 걸러진다.
  for (const m of inLayer.matchAll(/(^|[\s,{}>+~()])\.([a-z][a-z0-9-]*)/g)) names.add(m[2]);
  return [...names].sort();
}

/** 서비스 CSS 가 그 이름을 규칙으로 **정의**하는지 본다(사용이 아니라 정의). */
function definesClass(css, name) {
  // `.name` 뒤에 이름의 일부가 아닌 문자가 와야 한다(.btn 이 .btn-primary 로
  // 만족되면 안 된다). 앞에도 셀렉터가 시작될 수 있는 문자만 허용해
  // `.kpi-card` 안의 `card` 같은 부분 일치를 막는다.
  return new RegExp(`(^|[\\s,{}>+~()])\\.${name}(?![\\w-])`, 'm').test(css);
}

function collectCssFiles(dir, out = [], depth = 0) {
  if (depth > 6 || !existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry) || entry.startsWith('.')) continue;
    const p = join(dir, entry);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) collectCssFiles(p, out, depth + 1);
    else if (entry.endsWith('.css') && !entry.includes('.min.')) out.push(p);
  }
  return out;
}

export function scanCollisions() {
  const componentsCss = readFileSync(join(rootDir, 'bundle', 'src', 'components.css'), 'utf8');
  const kitClasses = kitComponentClasses(componentsCss);

  const serviceRoots = [];
  const servicesDir = join(workspaceDir, 'services');
  if (existsSync(servicesDir)) {
    for (const name of readdirSync(servicesDir)) {
      if (name === 'kit') continue;
      serviceRoots.push([name, join(servicesDir, name)]);
    }
  }
  const collars = join(workspaceDir, 'projects', 'COLLARS');
  if (existsSync(collars)) serviceRoots.push(['COLLARS', collars]);

  const collisions = {};
  for (const [service, dir] of serviceRoots) {
    for (const file of collectCssFiles(dir)) {
      const css = stripNoise(readFileSync(file, 'utf8'));
      for (const cls of kitClasses) {
        if (!definesClass(css, cls)) continue;
        (collisions[cls] ??= new Set()).add(service);
      }
    }
  }
  return {
    kitClasses,
    collisions: Object.fromEntries(
      Object.entries(collisions).map(([k, v]) => [k, [...v].sort()]).sort(([a], [b]) => a.localeCompare(b)),
    ),
  };
}

if (process.argv[1] && process.argv[1].endsWith('check-class-collisions.mjs')) {
  const { kitClasses, collisions } = scanCollisions();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(collisions, null, 2));
  } else {
    console.log(`kit 컴포넌트 클래스 ${kitClasses.length}개\n`);
    console.log('겹치는 이름 (서비스가 같은 이름을 자기 CSS 에 정의한다):');
    for (const [cls, services] of Object.entries(collisions)) {
      console.log(`  .${cls.padEnd(14)} ${services.join(', ')}`);
    }
    const clean = kitClasses.filter((c) => !collisions[c]);
    console.log(`\n겹침 없음 ${clean.length}개: ${clean.join(' ')}`);
  }
}
