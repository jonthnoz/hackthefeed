import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Clock3, Eye, Heart, MessageCircle, Share2, X } from 'lucide-react';
import type { Reference } from '../shared/schema';
import { metric, timestamp } from './api';

const relevanceLabel = { direct: 'Direct reference', adjacent: 'Adjacent inspiration', mechanism: 'Creative mechanism' } satisfies Record<Reference['relevance'], string>;

export function SourceDrawer({ reference, onClose }: { reference: Reference; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [tab, setTab] = useState<'frames' | 'transcript'>('frames');
  const frame = reference.frames[frameIndex];

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return <dialog className="source-dialog" ref={dialog} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }} aria-labelledby="source-title">
    <div className="drawer-inner"><div className="drawer-top"><span className="eyebrow">A CLOSER LOOK <span>/</span> SOURCE DETAILS</span><button className="icon-button" onClick={onClose} aria-label="Close source details" autoFocus><X size={20} /></button></div>
      <div className="drawer-heading"><span className="reference-caption"><span className={`relevance-dot relevance-${reference.relevance}`} />{relevanceLabel[reference.relevance]}</span><h2 id="source-title">{reference.title}</h2><div className="drawer-byline"><span>{reference.creator.startsWith('@') ? reference.creator : `@${reference.creator}`}</span><span>{reference.platform}</span><span>{reference.publishedAt && !Number.isNaN(Date.parse(reference.publishedAt)) ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(reference.publishedAt)) : 'Date unavailable'}</span></div></div>
      <div className="drawer-evidence"><div className="drawer-main-frame"><img src={frame?.url ?? reference.thumbnail} alt={frame?.text || reference.title} /><span className="frame-time"><Clock3 size={12} /> {frame ? timestamp(frame.seconds) : 'Thumbnail'}</span><a className="frame-original" href={reference.url} target="_blank" rel="noreferrer">Open original video <ArrowUpRight size={15} /></a></div><div className="drawer-insights"><span className="eyebrow">WHY IT'S HERE</span><p className="drawer-reason">{reference.relevanceReason}</p><div className="drawer-insight"><span className="eyebrow">THE FORMAT</span><p>{reference.format || 'Format unavailable'}</p></div><div className="drawer-insight"><span className="eyebrow">THE HOOK</span><p>{reference.hook || 'Hook unavailable'}</p></div><span className="eyebrow metric-heading">RECORDED ENGAGEMENT</span><div className="drawer-metrics">{[{ label: 'Views', value: reference.views, icon: Eye }, { label: 'Likes', value: reference.likes, icon: Heart }, { label: 'Comments', value: reference.comments, icon: MessageCircle }, { label: 'Shares', value: reference.shares, icon: Share2 }].map(item => <div key={item.label}><span><item.icon size={13} /> {item.label}</span><strong>{metric(item.value)}</strong></div>)}</div><p className="metric-disclaimer">Public metrics at collection. No install or conversion data is inferred.</p></div></div>
      <div className="drawer-tabs" role="tablist" aria-label="Source content"><button role="tab" id="frames-tab" aria-controls="source-content" aria-selected={tab === 'frames'} className={tab === 'frames' ? 'selected' : ''} onClick={() => setTab('frames')}>Video frames <span>{reference.frames.length}</span></button><button role="tab" id="transcript-tab" aria-controls="source-content" aria-selected={tab === 'transcript'} className={tab === 'transcript' ? 'selected' : ''} onClick={() => setTab('transcript')}>Transcript & caption</button></div>
      <div id="source-content" role="tabpanel" aria-labelledby={tab === 'frames' ? 'frames-tab' : 'transcript-tab'}>{tab === 'frames' ? <>{reference.frames.length ? <><div className="frame-strip">{reference.frames.map((item, index) => <button className={index === frameIndex ? 'selected' : ''} key={`${item.url}-${item.seconds}`} onClick={() => setFrameIndex(index)} aria-label={`Inspect frame at ${timestamp(item.seconds)}`} aria-pressed={index === frameIndex}><img src={item.url} alt={item.text || `Video frame at ${timestamp(item.seconds)}`} /><span>{timestamp(item.seconds)}</span></button>)}</div>{frame?.text && <div className="frame-observation"><span className="eyebrow">FRAME NOTE <span>/</span> {timestamp(frame.seconds)}</span><p>{frame.text}</p></div>}</> : <p className="drawer-empty">No extracted frames are available for this source. Open the original video to inspect it.</p>}</> : <div className="transcript-content"><span className="eyebrow">TRANSCRIPT</span><p>{reference.transcript || 'A transcript is unavailable for this source.'}</p><span className="eyebrow">ORIGINAL CAPTION</span><p>{reference.caption || 'A caption is unavailable for this source.'}</p></div>}</div>
      <a className="drawer-source-link" href={reference.url} target="_blank" rel="noreferrer"><span>Go straight to the source</span><span>{reference.platform} <ArrowUpRight size={17} /></span></a>
    </div>
  </dialog>;
}
