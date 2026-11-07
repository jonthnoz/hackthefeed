import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, Clapperboard, Copy, Download, RotateCcw } from 'lucide-react';
import { storyboardSchema, type Reference, type Study } from '../shared/schema';

function readDraft(study: Study): Study['storyboard'] {
  try {
    const stored = localStorage.getItem(`angle-storyboard-${study.id}`);
    if (stored) {
      const data: unknown = JSON.parse(stored);
      const result = storyboardSchema.safeParse(data);
      if (result.success) return result.data;
    }
  } catch { /* Local storage can be unavailable in private browsing. */ }
  return study.storyboard;
}

export function Storyboard({ study, onBack, onSource }: { study: Study; onBack: () => void; onSource: (source: Reference) => void }) {
  const [draft, setDraft] = useState(() => readDraft(study));
  const [feedback, setFeedback] = useState('');
  const [saved, setSaved] = useState(false);
  const sources = study.references.filter(reference => draft.sourceIds.includes(reference.id));

  function update(next: Study['storyboard']) {
    setDraft(next);
    setFeedback('');
    try { localStorage.setItem(`angle-storyboard-${study.id}`, JSON.stringify(next)); setSaved(true); }
    catch { setSaved(false); }
  }

  function output() {
    return `# ${draft.title}\n\n${draft.premise}\n\n## Opening hook\n\n${draft.hook}\n\n${draft.scenes.map((scene, index) => `## Scene ${index + 1} | ${scene.time}\n\nVisual: ${scene.visual}\n\nVoiceover / on-screen copy: ${scene.voiceover}`).join('\n\n')}\n\n## Call to action\n\n${draft.callToAction}\n\n## References\n\n${sources.map(source => `- ${source.title} by ${source.creator}\n  ${source.url}`).join('\n')}\n\nCreative direction for ${study.product}. References inform the creative approach; they do not establish conversion or install performance.\n`;
  }

  async function copy() {
    try { await navigator.clipboard.writeText(output()); setFeedback('Storyboard copied. Ready for your editor.'); }
    catch { setFeedback('Clipboard is unavailable. Use Export to save your storyboard.'); }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([output()], { type: 'text/markdown;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `angle-${study.id}-storyboard.md`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback('Your storyboard has been exported.');
  }

  return <main className="storyboard-workspace"><button className="back-link" onClick={onBack}><ArrowLeft size={14} /> Back to creative research</button><div className="storyboard-heading"><div><span className="eyebrow">A DIRECTION YOU CAN ACT ON</span><h1>From insight<br />to <span className="serif">first frame.</span></h1><p>Your next creative, ready to make your own.</p></div><div className="storyboard-actions"><span className="draft-label"><span className="status-dot" /> {saved ? 'Edits saved in this browser' : 'EDITABLE CREATIVE DRAFT'}</span><div><button className="button button-outline" onClick={() => void copy()}><Copy size={15} /> Copy script</button><button className="button button-dark" onClick={download}><Download size={15} /> Export <ArrowUpRight size={16} /></button></div></div></div>
    <div className="storyboard-layout"><section className="script-paper"><div className="paper-topline"><span><Clapperboard size={15} /> THE STORYBOARD</span><span>{study.product.toUpperCase()} / 01</span></div><label className="sr-only" htmlFor="story-title">Storyboard title</label><textarea id="story-title" className="editable story-title" rows={2} value={draft.title} onChange={event => update({ ...draft, title: event.target.value })} /><label className="sr-only" htmlFor="story-premise">Storyboard premise</label><textarea id="story-premise" className="editable story-premise" rows={2} value={draft.premise} onChange={event => update({ ...draft, premise: event.target.value })} /><div className="opening-hook"><label className="eyebrow" htmlFor="story-hook">THE OPENING HOOK</label><textarea id="story-hook" className="editable" rows={2} value={draft.hook} onChange={event => update({ ...draft, hook: event.target.value })} /></div>
      <div className="scene-header"><span>THE SEQUENCE</span><span>VISUAL DIRECTION + COPY</span></div><div className="scenes">{draft.scenes.map((scene, index) => <article className="scene" key={index}><div className="scene-time"><span>{String(index + 1).padStart(2, '0')}</span><label className="sr-only" htmlFor={`scene-time-${index}`}>Scene {index + 1} timestamp</label><input id={`scene-time-${index}`} value={scene.time} onChange={event => update({ ...draft, scenes: draft.scenes.map((item, itemIndex) => itemIndex === index ? { ...item, time: event.target.value } : item) })} /></div><div className="scene-fields"><label htmlFor={`scene-visual-${index}`}>WHAT WE SEE</label><textarea id={`scene-visual-${index}`} className="editable" rows={2} value={scene.visual} onChange={event => update({ ...draft, scenes: draft.scenes.map((item, itemIndex) => itemIndex === index ? { ...item, visual: event.target.value } : item) })} /><label htmlFor={`scene-copy-${index}`}>WHAT WE HEAR / READ</label><textarea id={`scene-copy-${index}`} className="editable scene-voiceover" rows={2} value={scene.voiceover} onChange={event => update({ ...draft, scenes: draft.scenes.map((item, itemIndex) => itemIndex === index ? { ...item, voiceover: event.target.value } : item) })} /></div></article>)}</div><div className="story-cta"><label className="eyebrow" htmlFor="story-cta">LEAVE THEM WITH A NEXT STEP</label><textarea id="story-cta" className="editable" rows={2} value={draft.callToAction} onChange={event => update({ ...draft, callToAction: event.target.value })} /></div><div className="paper-footer"><span>Every line is editable. Make it sound like you.</span><button onClick={() => { update(study.storyboard); setFeedback('Original storyboard restored.'); }}><RotateCcw size={12} /> Restore original</button></div></section>
      <aside className="story-context"><div className="story-context-note"><span className="context-star">✳</span><span className="eyebrow">THE CREATIVE PRINCIPLE</span><h2>Borrow the pattern.<br /><span className="serif">Bring your perspective.</span></h2><p>{study.promise}</p></div><div className="story-sources"><span className="eyebrow">GROUNDED IN THESE REFERENCES</span>{sources.map(source => <button className="story-source" key={source.id} onClick={() => onSource(source)}><img src={source.thumbnail} alt={source.title} /><div><span>{source.creator}</span><p>{source.title}</p></div><ArrowUpRight size={15} /></button>)}{!sources.length && <p className="muted">No specific sources were linked to this storyboard.</p>}</div><p className="story-context-footnote">A creative hypothesis to test. Source engagement does not predict your app's results.</p></aside></div>
    {feedback && <div className="story-feedback" role="status"><Check size={15} />{feedback}<button aria-label="Dismiss message" onClick={() => setFeedback('')}>×</button></div>}
  </main>;
}
