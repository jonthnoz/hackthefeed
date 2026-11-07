export const FPS = 30;
export const COMPOSITION_ID = 'AngleDemo';
export const VOICE_DELAY = 0.3;

export type Word = { text: string; start: number; end: number };
export type Narration = { id: string; text: string; audio: string; seconds: number; words: Word[] };
export type CaptureFrame = { file: string; t: number };
export type Capture = { dir: string; frames: CaptureFrame[] };
export type Scene = Narration & { start: number; duration: number };
export type DemoProps = { scenes: Scene[]; live: Capture; brief: Capture; explore: Capture };

// Minimum on-screen time per scene, so visuals breathe even when the line is short.
const MINIMUM: Record<string, number> = { open: 12, question: 5, brief: 5.4, research: 10.5, results: 7, evidence: 9.8, storyboard: 8.6, end: 6 };

export function buildScenes(narration: Narration[]): Scene[] {
  let start = 0;
  return narration.map(item => {
    const duration = Math.max(MINIMUM[item.id] ?? 0, item.seconds + VOICE_DELAY + 0.7);
    const scene = { ...item, start, duration };
    start += duration;
    return scene;
  });
}

export const totalSeconds = (scenes: Scene[]) => scenes.reduce((sum, scene) => sum + scene.duration, 0);

export type Caption = { start: number; end: number; text: string };
export function buildCaptions(scenes: Scene[]): Caption[] {
  const captions: Caption[] = [];
  for (const scene of scenes) {
    let group: Word[] = [];
    const join = (words: Word[]) => words.map(w => w.text).join(' ').replace(/- /g, '-');
    const flush = () => {
      if (!group.length) return;
      captions.push({ start: scene.start + VOICE_DELAY + group[0].start, end: scene.start + VOICE_DELAY + group[group.length - 1].end + 0.25, text: join(group) });
      group = [];
    };
    for (const word of punctuate(scene)) {
      if (group.length && (group.length >= 7 || join(group).length + word.text.length > 42 || /[.:?]$/.test(group[group.length - 1].text))) flush();
      group.push(word);
    }
    flush();
  }
  for (let i = 0; i < captions.length - 1; i++) captions[i].end = Math.min(captions[i].end, captions[i + 1].start);
  return captions;
}

/** Edge TTS word boundaries drop punctuation; restore it from the narration text. */
function punctuate(scene: Scene): Word[] {
  const lower = scene.text.toLowerCase();
  let cursor = 0;
  return scene.words.map(word => {
    const index = lower.indexOf(word.text.toLowerCase(), cursor);
    if (index < 0) return word;
    let end = index + word.text.length;
    while (/[.,:?!'’…-]/.test(scene.text[end] ?? '')) end++;
    cursor = end;
    return { ...word, text: scene.text.slice(index, end) };
  });
}

/** Seconds from scene start at which the first word matching `pattern` is spoken. */
export function wordAt(scene: Scene, pattern: RegExp, fallback: number): number {
  const word = scene.words.find(w => pattern.test(w.text));
  return word ? VOICE_DELAY + word.start : fallback;
}
