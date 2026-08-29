// 서비스 마크업이 쓰는 클래스 중 **어디에도 정의되지 않은 것**을 찾는다.
//
// 이것이 스펙 §0 이 말하는 조용한 실패의 정체다 — safelist 에 없는 kit 클래스를
// 쓰면 에러가 안 나고 그냥 스타일이 안 먹는다. 마이그레이션 중에 오타를 내거나,
// kit 에 있을 거라 짐작하고 쓴 클래스가 없거나(파일럿의 gap-2.5, min-h-11,
// rounded-xs 가 그랬다), 서비스 CSS 에서 규칙을 지우면서 마크업에 클래스만
// 남는 경우를 전부 잡는다. 렌더링이 필요 없다 — 정의 여부는 정적으로 결정된다.
//
//   node scripts/check-classes.mjs ../itad/src/dashboard
//   node scripts/check-classes.mjs ../itad/src/dashboard --json
//
// 잡지 못하는 것(알고 쓸 것):
//   - JS 가 런타임에 붙이는 클래스. 마크업에 없으므로 "쓰였다"고 보지 않는다.
//   - Jinja 가 문자열을 이어붙여 만든 클래스 이름. 리터럴 조각만 본다.
//   - 정의는 됐지만 다른 규칙에 **가려져서** 안 먹는 경우. 그건 레이어 문제이고
//     check-class-collisions.mjs 가 다루는 영역이다.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const SKIP_DIRS = new Set(['node_modules', '.git', '.venv', '__pycache__', 'dist', 'build', 'vendor']);

/** 주석·문자열·url() 을 지운다(오탐 방지 — check-class-collisions.mjs 와 같은 이유). */
function stripCssNoise(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/url\((['"]?)[\s\S]*?\1\)/g, 'url()')
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''");
}

/** CSS 에서 정의된 클래스 이름을 뽑는다. Tailwind 의 이스케이프(`.md\:p-4`)를 푼다.
 *
 * 앞에 구분자가 오는지는 보지 않는다 — `.badge.on` 처럼 연결된 클래스에서
 * 뒤쪽(`on`)을 놓치기 때문이다. 대신 **클래스 이름이 글자·밑줄·하이픈으로
 * 시작한다**는 규칙으로 값 안의 소수점(`.625rem`, `calc(... * .5)`)을 걸러낸다.
 * 주석·문자열·url() 은 stripCssNoise 가 이미 지웠다. */
export function definedClasses(css) {
  const out = new Set();
  for (const m of stripCssNoise(css).matchAll(/\.((?:[a-zA-Z_-]|\\.)(?:[\w-]|\\.)*)/g)) {
    out.add(m[1].replace(/\\/g, ''));
  }
  return out;
}

/** HTML/Jinja 마크업에서 실제로 쓰인 클래스 이름을 뽑는다. */
export function usedClasses(html) {
  const out = new Map(); // name -> 등장 횟수
  for (const m of html.matchAll(/\bclass\s*=\s*("([^"]*)"|'([^']*)')/g)) {
    const raw = m[2] ?? m[3] ?? '';
    // Jinja 표현식을 지우고 리터럴 조각만 남긴다.
    // `class="flash {% if x %}err{% else %}ok{% endif %}"` -> flash err ok
    const literal = raw.replace(/\{\{[\s\S]*?\}\}/g, ' ').replace(/\{%[\s\S]*?%\}/g, ' ');
    for (const token of literal.split(/\s+/)) {
      if (!token) continue;
      if (/[{}%<>()$]/.test(token)) continue; // 동적으로 만들어진 조각
      out.set(token, (out.get(token) ?? 0) + 1);
    }
  }
  return out;
}

function collectFiles(dir, exts, out = [], depth = 0) {
  if (depth > 8 || !existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry) || entry.startsWith('.')) continue;
    const p = join(dir, entry);
    let st;
    try { st = statSync(p); } catch { return out; }
    if (st.isDirectory()) collectFiles(p, exts, out, depth + 1);
    else if (exts.some((e) => entry.endsWith(e)) && !entry.includes('.min.')) out.push(p);
  }
  return out;
}

export function checkService(serviceDir) {
  const dir = resolve(serviceDir);
  const kitCss = readFileSync(join(rootDir, 'bundle', 'dist', 'app.css'), 'utf8');

  const defined = definedClasses(kitCss);
  const serviceCssFiles = collectFiles(dir, ['.css']);
  for (const f of serviceCssFiles) for (const c of definedClasses(readFileSync(f, 'utf8'))) defined.add(c);

  const markupFiles = collectFiles(dir, ['.html', '.j2', '.jinja']);
  const used = new Map();
  const where = new Map();
  for (const f of markupFiles) {
    for (const [cls, n] of usedClasses(readFileSync(f, 'utf8'))) {
      used.set(cls, (used.get(cls) ?? 0) + n);
      (where.get(cls) ?? where.set(cls, new Set()).get(cls)).add(relative(dir, f));
    }
  }

  const undefined_ = [];
  for (const [cls, n] of [...used].sort()) {
    if (defined.has(cls)) continue;
    undefined_.push({ cls, count: n, files: [...where.get(cls)].sort() });
  }
  return { markupFiles: markupFiles.length, cssFiles: serviceCssFiles.length, used: used.size, undefined: undefined_ };
}

if (process.argv[1] && process.argv[1].endsWith('check-classes.mjs')) {
  const target = process.argv[2];
  if (!target) {
    console.error('사용법: node scripts/check-classes.mjs <서비스 디렉터리> [--json]');
    process.exit(2);
  }
  const r = checkService(target);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    console.log(`마크업 ${r.markupFiles}개 · 서비스 CSS ${r.cssFiles}개 · 쓰인 클래스 ${r.used}종\n`);
    if (!r.undefined.length) {
      console.log('정의되지 않은 클래스 없음 ✓');
    } else {
      console.log(`정의되지 않은 클래스 ${r.undefined.length}종 — 이 클래스들은 조용히 아무 일도 하지 않는다:`);
      for (const { cls, count, files } of r.undefined) {
        console.log(`  ${cls.padEnd(24)} ${String(count).padStart(2)}회  ${files.join(', ')}`);
      }
    }
  }
  process.exit(r.undefined.length ? 1 : 0);
}
