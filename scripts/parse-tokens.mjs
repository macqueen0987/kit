// tokens.css에서 oklch 색 토큰만 뽑는다. 폰트·radius는 무시한다.
//
// `--kit-accent`도 받는다. 라이트 테마가 생기면서 `--color-accent`는 더 이상
// 리터럴 oklch가 아니라 `var(--kit-accent)`가 됐다 — 실제 색값은 서비스가
// 고르는 씨앗 `--kit-accent`에 있다(근거는 bundle/src/themes.css 머리말).
// 둘 다 `accent`라는 같은 키로 들어오므로 이 파서를 쓰는 대비 테스트는 그대로
// 동작한다. `--kit-radius`처럼 oklch가 아닌 kit 토큰은 매치되지 않는다.
const OKLCH = /--(?:color|kit)-([a-z0-9-]+)\s*:\s*oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/g;

export function parseTokens(cssText) {
  const out = new Map();
  for (const m of cssText.matchAll(OKLCH)) {
    out.set(m[1], [Number(m[2]), Number(m[3]), Number(m[4])]);
  }
  return out;
}

// 스펙 §5.2. L은 0.780으로 고정하고 hue만 돌린다.
export const SERVICE_ACCENTS = [
  { name: 'agent-gate', hue: 185, chroma: 0.130, nick: 'teal' },
  { name: 'aitg',       hue: 215, chroma: 0.125, nick: 'azure' },
  { name: 'logflare',   hue: 240, chroma: 0.135, nick: 'blue' },
  { name: 'COLLARS',    hue: 265, chroma: 0.130, nick: 'indigo' },
  { name: 'profile',    hue: 285, chroma: 0.115, nick: 'violet' },
  { name: 'mpw',        hue: 305, chroma: 0.130, nick: 'purple' },
  { name: 'gallery',    hue: 330, chroma: 0.140, nick: 'magenta' },
  { name: 'novel',      hue:  20, chroma: 0.140, nick: 'rose' },
  { name: 'itad',       hue:  55, chroma: 0.150, nick: 'orange' },
  { name: 'stock',      hue:  95, chroma: 0.125, nick: 'gold' },
  { name: 'iot',        hue: 130, chroma: 0.150, nick: 'lime' },
  { name: 'chzzk-auth', hue: 160, chroma: 0.150, nick: 'spring' },
];
