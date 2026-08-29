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
  // 안으로 들여왔다. 이웃은 itad(55)로 정확히 20도, iot(130)으로 55도다.
  { name: 'gallery',    hue:  75, chroma: 0.090, nick: 'gold' },
  // hue 95(amber)는 비어 있다 — `stock` 이 이 표에서 빠지면서 반납됐다.
  //
  // stock/web 은 **accent 를 kit 에서 받지 않는다.** 자기 팔레트(Toss 파생
  // 핀테크 블루 #3182f6 = oklch 0.620 0.191 258)를 유지하고 kit 에서는
  // 중립 표면과 타이포만 가져간다(토큰 전용 진입점 — bundle/src/tokens-entry.css).
  // 근거는 스펙 §5.3 이 gallery 에서 세운 것과 같다: 서비스가 kit 의 배정보다
  // 나은 근거를 가지면 kit 쪽을 고친다. 여기서 그 근거는 두 겹이다.
  //   1. Toss 파생 디자인 언어를 따르는 라이브 대시보드의 정체성이다.
  //   2. **이 앱에서 파랑은 의미를 짊어진다** — `--color-negative`(하락)가
  //      accent 와 똑같은 #3182f6 이다. 한국 증시 관례로 빨강이 상승,
  //      파랑이 하락이다.
  // 배정된 amber(95)를 채택했다면 stock 자신의 warning(hue 73)과 22도밖에
  // 떨어지지 않아 밀집한 거래 화면에서 혼동됐을 것이다.
  //
  // 이 표의 "hue 20도 이상" 규칙은 **kit 이 색을 배정하는 서비스**에만 적용된다.
  // stock 은 --kit-accent 를 주입하지 않으므로 그 규칙의 대상이 아니다.
  // (그러지 않았다면 stock 의 258 은 COLLARS 265 와 6.8도, logflare 240 과
  //  18.2도라 규칙을 위반했을 것이다.)
  { name: 'iot',        hue: 130, chroma: 0.150, nick: 'lime' },
  { name: 'chzzk-auth', hue: 160, chroma: 0.150, nick: 'spring' },
];
