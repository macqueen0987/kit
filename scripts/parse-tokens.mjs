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
  // hue 305(purple)는 비어 있다 — mpw 가 폐기되면서 반납됐다(스펙 §2.1).
  { name: 'novel',      hue:  20, chroma: 0.140, nick: 'rose' },
  { name: 'itad',       hue:  55, chroma: 0.150, nick: 'orange' },
  // gallery 는 원래 330(magenta)이었다. 사진 갤러리라 강조색이 사진과 경쟁하면
  // 안 되고, 실제로 채도를 낮춘 골드(oklch 0.738 0.075 79)를 쓰고 있었다.
  // 마이그레이션에서 그 정체성을 유지하되 kit 규율(L 0.780, chroma 0.09~0.13)
  // 안으로 들여왔다. hue 75 는 itad(55)·stock(95)에서 각각 정확히 20도 떨어져
  // "20도 이상" 규칙을 그대로 통과한다. 330 은 비었다.
  { name: 'gallery',    hue:  75, chroma: 0.090, nick: 'gold' },
  { name: 'stock',      hue:  95, chroma: 0.125, nick: 'amber' },
  { name: 'iot',        hue: 130, chroma: 0.150, nick: 'lime' },
  { name: 'chzzk-auth', hue: 160, chroma: 0.150, nick: 'spring' },
];
