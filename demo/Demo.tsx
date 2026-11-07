import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Audio, Easing, Img, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { FPS, buildCaptions, totalSeconds, wordAt, type Capture, type DemoProps, type Scene } from './timeline';

const C = { dark: '#14352b', deep: '#0d241d', paper: '#f6f5ef', lime: '#ddf78c', ink: '#183c30', muted: '#9fb3a6' };
const sans = '"DM Sans", Arial, sans-serif';
const serif = 'Georgia, "Times New Roman", serif';
const ease = Easing.bezier(0.22, 1, 0.36, 1);

const fontHandle = delayRender('DM Sans');
new FontFace('DM Sans', `url(${staticFile('demo/fonts/DMSans.ttf')})`, { weight: '100 1000' }).load()
  .then(font => { document.fonts.add(font); continueRender(fontHandle); });

const useSeconds = () => useCurrentFrame() / FPS;
const appear = (t: number, at: number, length = 0.6) => interpolate(t, [at, at + length], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });

/** Piecewise-linear map from scene time to capture time. Repeated x values create hard cuts. */
function mapTime(points: [number, number][], t: number): number {
  for (let i = points.length - 1; i >= 0; i--) {
    if (t >= points[i][0]) {
      const next = points[i + 1];
      if (!next) return points[i][1];
      const p = (t - points[i][0]) / (next[0] - points[i][0] || 1);
      return points[i][1] + (next[1] - points[i][1]) * p;
    }
  }
  return points[0][1];
}

type Key = { at: number; s: number; x: number; y: number };
function camera(keys: Key[], t: number) {
  const ats = keys.map(k => k.at);
  const pick = (f: (k: Key) => number) => keys.length === 1 ? f(keys[0]) : interpolate(t, ats, keys.map(f), { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  const s = pick(k => k.s);
  const tx = Math.min(0, Math.max(1920 - 1920 * s, 960 - pick(k => k.x) * s));
  const ty = Math.min(0, Math.max(1080 - 1080 * s, 540 - pick(k => k.y) * s));
  return `translate(${tx}px, ${ty}px) scale(${s})`;
}

function CaptureView({ capture, time, keys }: { capture: Capture; time: [number, number][]; keys: Key[] }) {
  const t = useSeconds();
  const source = mapTime(time, t);
  const frames = capture.frames;
  let low = 0, high = frames.length - 1;
  while (low < high) { const mid = Math.ceil((low + high) / 2); if (frames[mid].t <= source) low = mid; else high = mid - 1; }
  return <AbsoluteFill style={{ background: C.paper, overflow: 'hidden' }}>
    <Img src={staticFile(`journey/${capture.dir}/${frames[low].file}`)} style={{ width: 1920, height: 1080, transformOrigin: '0 0', transform: camera(keys, t) }} />
  </AbsoluteFill>;
}

function Step({ number, label }: { number: string; label: string }) {
  const t = useSeconds();
  const a = appear(t, 0.15, 0.5);
  return <div style={{ position: 'absolute', left: 56, top: 48, display: 'flex', alignItems: 'center', gap: 16, padding: '14px 26px 14px 16px', borderRadius: 999, background: 'rgba(13,36,29,.92)', color: '#fff', fontFamily: sans, fontSize: 30, fontWeight: 600, opacity: a, transform: `translateY(${(1 - a) * -16}px)`, boxShadow: '0 12px 40px rgba(0,0,0,.25)' }}>
    <span style={{ width: 46, height: 46, borderRadius: 999, background: C.lime, color: C.deep, display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 800 }}>{number}</span>{label}
  </div>;
}

const EXPENSES: [string, string, string][] = [
  ['Airbnb, 3 nights', 'Léa', '€420.00'], ['Dinner at the port', 'Sam', '€96.50'], ['Ferry tickets', 'You', '€72.00'],
  ['Groceries', 'Léa', '€41.20'], ['Taxi to airport', 'Sam', '€38.00'], ['Gelato', 'You', '€12.40'],
  ['Beach chairs', 'Léa', '€30.00'], ['Fuel', 'Sam', '€64.10'], ['Museum', 'You', '€45.00'],
];

/** Illustrative mock of the example app: a perfectly useful, perfectly unfilmable expense list. */
function SplitlyPhone({ swipe }: { swipe: number }) {
  const t = useSeconds();
  const a = appear(t, 0.5, 0.9);
  return <div style={{ position: 'absolute', left: 1150, top: 130, width: 400, height: 800, borderRadius: 52, overflow: 'hidden', border: '10px solid #0a0f0d', background: '#fbfaf6', boxShadow: '0 40px 90px rgba(0,0,0,.45)', fontFamily: sans, color: '#1c1c1c', opacity: a * (1 - swipe), transform: `translateY(${(1 - a) * 80 - swipe * 900}px) rotate(${3 - swipe * 8}deg)` }}>
    <div style={{ padding: '54px 30px 18px', borderBottom: '1px solid #e6e4dc' }}>
      <div style={{ fontSize: 17, color: '#8a8a80', fontWeight: 600, letterSpacing: 1 }}>SPLITLY · GREECE TRIP</div>
      <div style={{ fontSize: 34, fontWeight: 700, marginTop: 8 }}>You owe Léa <span style={{ color: '#c0563b' }}>€23.40</span></div>
    </div>
    {EXPENSES.map(([label, who, amount]) => <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '19px 30px', borderBottom: '1px solid #efede6', fontSize: 22 }}>
      <span>{label}<br /><span style={{ fontSize: 16, color: '#9a9a90' }}>paid by {who}</span></span><span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{amount}</span>
    </div>)}
  </div>;
}

function Open({ scene }: { scene: Scene }) {
  const t = useSeconds();
  const useful = wordAt(scene, /useful/i, 3.5);
  const sheet = wordAt(scene, /^TikTok/i, 5);
  const nobody = wordAt(scene, /Nobody/i, 7.5);
  const swipe = interpolate(t, [nobody + 0.4, nobody + 1.1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic) });
  const line = (at: number): CSSProperties => ({ opacity: appear(t, at - 0.1, 0.5), transform: `translateY(${(1 - appear(t, at - 0.1, 0.5)) * 20}px)` });
  return <AbsoluteFill style={{ background: `radial-gradient(circle at 75% 40%, #1d4a3b, ${C.deep} 65%)`, fontFamily: sans, color: '#fff' }}>
    <div style={{ position: 'absolute', left: 130, top: 220, width: 960 }}>
      <div style={{ fontSize: 24, letterSpacing: 4, color: C.lime, fontWeight: 700, opacity: appear(t, 0.2) }}>EXAMPLE APP · TRAVEL</div>
      <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1.02, letterSpacing: -3, marginTop: 24, opacity: appear(t, 0.4) }}>Say you built<br />Splitly.</div>
      <div style={{ ...line(useful), fontSize: 44, color: C.muted, marginTop: 36 }}>It splits trip expenses. <b style={{ color: '#fff' }}>Genuinely useful.</b></div>
      <div style={{ ...line(sheet), fontSize: 76, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05, color: C.lime, marginTop: 40 }}>On TikTok,<br />it's a spreadsheet.</div>
    </div>
    <SplitlyPhone swipe={swipe} />
    <div style={{ position: 'absolute', left: 1150, top: 470, width: 420, textAlign: 'center', fontSize: 34, fontWeight: 700, opacity: appear(t, nobody + 1.0, 0.4) }}>↑ Swiped away.</div>
  </AbsoluteFill>;
}

function Question({ scene }: { scene: Scene }) {
  const t = useSeconds();
  const second = wordAt(scene, /video/i, 1.2);
  const third = wordAt(scene, /^So$/i, 2.2);
  const line = (at: number): CSSProperties => ({ opacity: appear(t, at - 0.1, 0.5), transform: `translateY(${(1 - appear(t, at - 0.1, 0.5)) * 24}px)` });
  return <AbsoluteFill style={{ background: C.paper, color: C.ink, fontFamily: sans, justifyContent: 'center', paddingLeft: 180 }}>
    <div style={{ fontSize: 110, fontWeight: 700, letterSpacing: -4, lineHeight: 1.05 }}>
      <div style={line(0.2)}>The app works.</div>
      <div style={line(second)}>The video doesn't.</div>
    </div>
    <div style={{ ...line(third), fontFamily: serif, fontStyle: 'italic', fontSize: 76, marginTop: 40, color: '#4f6b5e' }}>So what should you actually show?</div>
  </AbsoluteFill>;
}

function Research({ scene, capture }: { scene: Scene; capture: Capture }) {
  const t = useSeconds();
  const end = scene.duration;
  const time: [number, number][] = [[0, 12.1], [1.5, 13.6], [end - 1.3, 93.0], [end, 94.0]];
  const elapsed = Math.max(0, Math.min(82, mapTime(time, t) - 12.4));
  const fast = t > 1.5 && t < end - 1.3;
  const chips = [[/show/i, 'What they show'], [/say/i, 'What they say'], [/write/i, 'What they write on screen']] as const;
  return <AbsoluteFill>
    <CaptureView capture={capture} time={time} keys={[{ at: 0, s: 1, x: 960, y: 540 }, { at: 1.3, s: 1, x: 960, y: 540 }, { at: 2.3, s: 1.5, x: 1600, y: 940 }, { at: end - 1.5, s: 1.5, x: 1600, y: 940 }, { at: end - 0.4, s: 1, x: 960, y: 540 }]} />
    <Step number="02" label="Angle researches with Oriane + Codex" />
    <div style={{ position: 'absolute', right: 56, top: 48, padding: '14px 26px', borderRadius: 999, background: fast ? C.lime : 'rgba(13,36,29,.92)', color: fast ? C.deep : '#fff', fontFamily: sans, fontSize: 30, fontWeight: 700, fontVariantNumeric: 'tabular-nums', opacity: appear(t, 1.2) }}>
      {fast ? '▶▶ ' : ''}Real run · {Math.floor(elapsed / 60)}:{String(Math.floor(elapsed % 60)).padStart(2, '0')}
    </div>
    <div style={{ position: 'absolute', left: 56, top: 300, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {chips.map(([pattern, label], index) => {
        const at = wordAt(scene, pattern, 3 + index) - 0.1;
        const a = appear(t, at, 0.45);
        return <div key={label} style={{ alignSelf: 'flex-start', padding: '16px 28px', borderRadius: 18, background: 'rgba(13,36,29,.92)', color: '#fff', fontFamily: sans, fontSize: 38, fontWeight: 600, opacity: a * appear(end - t, 1.2, 0.4), transform: `translateX(${(1 - a) * -30}px)` }}><span style={{ color: C.lime }}>●</span> {label}</div>;
      })}
    </div>
  </AbsoluteFill>;
}

function End() {
  const t = useSeconds();
  return <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, #1d4a3b, ${C.deep} 70%)`, color: '#fff', fontFamily: sans, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 22, opacity: appear(t, 0.1), transform: `scale(${0.9 + 0.1 * appear(t, 0.1, 0.9)})` }}>
      <svg width="90" height="90" viewBox="0 0 40 40"><path d="M10 33 22 7h9L19 33z" fill={C.lime} /></svg>
      <span style={{ fontSize: 150, fontWeight: 700, letterSpacing: -6 }}>angle<span style={{ color: C.lime }}>.</span></span>
    </div>
    <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 58, marginTop: 26, opacity: appear(t, 0.8) }}>Find your next video in the ones that already work.</div>
    <div style={{ position: 'absolute', bottom: 80, fontSize: 26, letterSpacing: 3, color: C.muted, opacity: appear(t, 1.4) }}>BUILT WITH ORIANE + CODEX · TEAM ZOUPI · HACK THE FEED PARIS</div>
  </AbsoluteFill>;
}

function Captions({ scenes }: { scenes: Scene[] }) {
  const t = useSeconds();
  const caption = buildCaptions(scenes).find(c => t >= c.start && t < c.end);
  const endCard = scenes[scenes.length - 1];
  if (!caption || t >= endCard.start) return null;
  return <div style={{ position: 'absolute', bottom: 54, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
    <div style={{ maxWidth: 1400, padding: '12px 28px', borderRadius: 14, background: 'rgba(8,20,16,.82)', color: '#fff', fontFamily: sans, fontSize: 42, fontWeight: 600, lineHeight: 1.25, textAlign: 'center' }}>{caption.text}</div>
  </div>;
}

function Fade({ children, last }: { children: ReactNode; last: boolean }) {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: last ? 1 : interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' }) }}>{children}</AbsoluteFill>;
}

export function Demo({ scenes, live, brief, explore }: DemoProps) {
  const total = totalSeconds(scenes);
  const scene = (id: string) => scenes.find(s => s.id === id) as Scene;
  const visuals: Record<string, ReactNode> = {
    open: <Open scene={scene('open')} />,
    question: <Question scene={scene('question')} />,
    brief: <><CaptureView capture={brief} time={[[0, 2.5], [scene('brief').duration, 8.2]]} keys={[{ at: 0, s: 1.1, x: 960, y: 540 }, { at: 0.9, s: 2, x: 470, y: 560 }, { at: scene('brief').duration - 0.9, s: 2, x: 520, y: 580 }, { at: scene('brief').duration, s: 1, x: 960, y: 540 }]} /><Step number="01" label="Describe your app" /></>,
    research: <Research scene={scene('research')} capture={live} />,
    results: <><CaptureView capture={explore} time={[[0, 0.8], [scene('results').duration, 7.4]]} keys={[{ at: 0, s: 1, x: 960, y: 540 }, { at: 3.2, s: 1.3, x: 1000, y: 560 }, { at: scene('results').duration, s: 1.4, x: 1000, y: 600 }]} /><Step number="03" label="Creative directions, from real videos" /></>,
    evidence: <><CaptureView capture={explore} time={[[0, 7.4], [scene('evidence').duration, 17.0]]} keys={[{ at: 0, s: 1.4, x: 1000, y: 600 }, { at: 0.7, s: 1, x: 960, y: 540 }, { at: 1.6, s: 1.7, x: 1530, y: 440 }, { at: 4.6, s: 1.7, x: 1530, y: 440 }, { at: 5.5, s: 1.55, x: 1470, y: 620 }]} /><Step number="04" label="Every idea, traced to the source" /></>,
    storyboard: <><CaptureView capture={explore} time={[[0, 22.2], [3.6, 26.3], [3.6001, 29.4], [6.8, 30.6], [scene('storyboard').duration, 30.6 + scene('storyboard').duration - 6.8]]} keys={[{ at: 0, s: 1, x: 960, y: 540 }, { at: 3.6, s: 1, x: 960, y: 540 }, { at: 4.1, s: 1.6, x: 760, y: 580 }, { at: 6.7, s: 1.6, x: 760, y: 580 }, { at: 7.5, s: 1.1, x: 1100, y: 600 }]} /><Step number="05" label="A storyboard you can shoot tonight" /></>,
    end: <End />,
  };
  return <AbsoluteFill style={{ background: C.deep }}>
    {scenes.map((s, index) => {
      const last = index === scenes.length - 1;
      return <Sequence key={s.id} from={Math.round(s.start * FPS)} durationInFrames={Math.round((s.duration + (last ? 0 : 0.27)) * FPS)}>
        <Fade last={index === 0}>{visuals[s.id]}</Fade>
        <Sequence from={Math.round(0.3 * FPS)}><Audio src={staticFile(s.audio)} /></Sequence>
      </Sequence>;
    })}
    <Audio src={staticFile('demo/bed.wav')} volume={f => interpolate(f, [0, total * FPS - 60, total * FPS], [0.55, 0.55, 0], { extrapolateRight: 'clamp' })} />
    <Captions scenes={scenes} />
  </AbsoluteFill>;
}
