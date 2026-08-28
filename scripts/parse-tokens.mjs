// tokens.css에서 oklch 색 토큰만 뽑는다. 폰트·radius는 무시한다.
const OKLCH = /--color-([a-z0-9-]+)\s*:\s*oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/g;

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
