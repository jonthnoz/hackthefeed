import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, CircleCheck, Clock3, Compass, LoaderCircle, Plus, Search, Sparkles, X } from 'lucide-react';
import type { Constraints, HistoryEntry, Job, Study } from '../shared/schema';
import { api, errorMessage, type Resource } from './api';
import { Workspace } from './Workspace';
import { ConstraintsControl } from './Constraints';
import { History } from './History';
import { hasUsableStoryboard } from './constraintEvidence';
import { parseProjectLinks, ProjectLinksControl } from './ProjectLinks';

type Location = { view: 'home' } | { view: 'history' } | { view: 'study' | 'storyboard'; studyId: string };
type Research = { status: 'idle' } | { status: 'submitting' } | { status: 'job'; job: Job } | { status: 'error'; message: string; jobId?: string };

function readLocation(): Location {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  const studyId = params.get('study');
  if (view === 'history') return { view: 'history' };
  return studyId && view !== 'home' ? { view: view === 'storyboard' ? 'storyboard' : 'study', studyId } : { view: 'home' };
}

export function Brand({ light = false, onClick }: { light?: boolean; onClick: () => void }) {
  return <button className={`brand ${light ? 'brand-light' : ''}`} onClick={onClick} aria-label="Angle home"><span className="brand-mark" aria-hidden="true" /><span>angle<span className="brand-period">.</span></span></button>;
}

export default function App() {
  const [location, setLocation] = useState<Location>(readLocation);
  const [examples, setExamples] = useState<Resource<Study[]>>({ status: 'loading' });
  const [study, setStudy] = useState<Resource<Study>>({ status: 'loading' });
  const [research, setResearch] = useState<Research>({ status: 'idle' });
  const [brief, setBrief] = useState('');
  const [constraints, setConstraints] = useState<Constraints>({ noRealPeople: false, exclude: '' });
  const [resourceLinks, setResourceLinks] = useState('');
  const [correction, setCorrection] = useState<{ previousBrief: string; previousConstraints: Constraints; previousLinks: string } | null>(null);
  const briefInput = useRef<HTMLTextAreaElement>(null);
  const [history, setHistory] = useState<Resource<HistoryEntry[]>>({ status: 'loading' });
  const [historyReload, setHistoryReload] = useState(0);
  const [reload, setReload] = useState(0);
  const [notice, setNotice] = useState('');
  const studyId = 'studyId' in location ? location.studyId : null;

  function navigate(next: Location) {
    const params = new URLSearchParams({ view: next.view });
    if ('studyId' in next) params.set('study', next.studyId);
    window.history.pushState(null, '', `?${params}`);
    setLocation(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function correctBrief(original: Study) {
    setCorrection({ previousBrief: brief, previousConstraints: constraints, previousLinks: resourceLinks });
    setBrief(original.brief);
    setConstraints({ ...original.constraints });
    setResourceLinks(original.resources.join('\n'));
    navigate({ view: 'home' });
    window.requestAnimationFrame(() => briefInput.current?.focus());
  }

  function newBrief() {
    setBrief('');
    setConstraints({ noRealPeople: false, exclude: '' });
    setResourceLinks('');
    setCorrection(null);
    navigate({ view: 'home' });
  }

  useEffect(() => {
    const onPop = () => setLocation(readLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    let active = true;
    api.examples().then(data => { if (active) setExamples({ status: 'ready', data }); }).catch(error => { if (active) setExamples({ status: 'error', message: errorMessage(error) }); });
    return () => { active = false; };
  }, [reload]);

  useEffect(() => {
    if (location.view !== 'history') return;
    let active = true;
    setHistory({ status: 'loading' });
    api.history().then(data => { if (active) setHistory({ status: 'ready', data }); }).catch(error => { if (active) setHistory({ status: 'error', message: errorMessage(error) }); });
    return () => { active = false; };
  }, [location.view, historyReload]);

  useEffect(() => {
    if (!studyId) return;
    let active = true;
    setStudy({ status: 'loading' });
    api.study(studyId).then(data => { if (active) setStudy({ status: 'ready', data }); }).catch(error => { if (active) setStudy({ status: 'error', message: errorMessage(error) }); });
    return () => { active = false; };
  }, [studyId, reload]);

  const job = research.status === 'job' ? research.job : null;
  useEffect(() => {
    if (!job) return;
    if (job.status === 'complete') {
      const params = new URLSearchParams({ view: 'study', study: job.studyId });
      window.history.pushState(null, '', `?${params}`);
      setLocation({ view: 'study', studyId: job.studyId });
      setNotice('Your research is ready. Explore the evidence and make it yours.');
      setReload(value => value + 1);
      setHistoryReload(value => value + 1);
      setResearch({ status: 'idle' });
      return;
    }
    if (job.status === 'error') {
      setResearch({ status: 'error', message: job.message });
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      api.job(job.id).then(next => { if (active) setResearch({ status: 'job', job: next }); }).catch(error => { if (active) setResearch({ status: 'error', message: errorMessage(error), jobId: job.id }); });
    }, 1800);
    return () => { active = false; window.clearTimeout(timer); };
  }, [job]);

  async function startResearch() {
    if (brief.trim().length < 12 || brief.length > 5000) return;
    const resources = parseProjectLinks(resourceLinks);
    if (!resources.success) return;
    setCorrection(null);
    setResearch({ status: 'submitting' });
    try { setResearch({ status: 'job', job: await api.research(brief.trim(), constraints, resources.data) }); }
    catch (error) { setResearch({ status: 'error', message: errorMessage(error) }); }
  }

  const busy = research.status === 'submitting' || (research.status === 'job' && research.job.status === 'running');
  const exampleData = examples.status === 'ready' ? examples.data : [];

  return <>
    {location.view === 'home' ? <div className="home-page">
      <header className="home-nav"><Brand onClick={() => navigate({ view: 'home' })} /><span className="nav-descriptor">A new perspective on your next creative.</span><div className="home-nav-actions"><button className="text-link" onClick={() => navigate({ view: 'history' })}><Clock3 size={16} /> History</button><a className="text-link" href="#examples">Explore the examples <ArrowUpRight size={16} /></a></div></header>
      <main>
        <section className="home-hero">
          <div className="hero-copy"><span className="eyebrow"><span className="status-dot" /> CREATIVE INTELLIGENCE FOR APP BUILDERS</span><h1>Find your next<br /><span className="serif">creative direction.</span></h1><p className="hero-description">Turn real videos into a clear point of view.<br />The references, the reasoning, and your next storyboard.</p>
            <form className="brief-form" onSubmit={event => { event.preventDefault(); void startResearch(); }}>
              {correction && <div className="brief-correction" role="status"><p>Editing a previous brief. Your original study stays saved.</p>{(correction.previousBrief || correction.previousConstraints.noRealPeople || correction.previousConstraints.exclude || correction.previousLinks) && <button type="button" className="text-link" onClick={() => { setBrief(correction.previousBrief); setConstraints(correction.previousConstraints); setResourceLinks(correction.previousLinks); setCorrection(null); briefInput.current?.focus(); }}>Restore previous draft</button>}<button type="button" className="text-link" onClick={newBrief}>Clear and start a new brief</button></div>}
              <label htmlFor="brief"><span className="form-number">01</span> What are you building?</label>
              <textarea id="brief" ref={briefInput} value={brief} onChange={event => setBrief(event.target.value)} maxLength={5000} placeholder="Sokka Map finds addresses in TikTok/Instagram videos and saves places. https://apps.apple.com/app/id6811344185" required minLength={12} rows={3} disabled={busy} />
              <ProjectLinksControl value={resourceLinks} onChange={setResourceLinks} disabled={busy} />
              <ConstraintsControl value={constraints} onChange={setConstraints} disabled={busy} />
              <div className="brief-form-bottom"><span><Search size={13} /> We'll do the research.</span><button className="button button-dark" type="submit" disabled={busy || brief.trim().length < 12 || !parseProjectLinks(resourceLinks).success}>{busy ? <><LoaderCircle className="spin" size={16} /> Researching</> : <>Find my angle <ArrowUpRight size={17} /></>}</button></div>
            </form>
            <p className="brief-footnote">What it does, who it's for, and any important limits. Project links help ground the research.</p>
          </div>
          <div className="hero-art" aria-label="Real video references become a creative direction">
            <div className="art-orbit" /><span className="art-caption">GOOD CREATIVE STARTS WITH A BETTER QUESTION.</span>
            <div className="hero-frame hero-frame-back"><img src={exampleData[0]?.references[1]?.thumbnail ?? '/media/cnt_dee49e599b87456c4807c369b5f9-0.webp'} alt="Video reference for creative research" /><span className="frame-category">THE REAL-WORLD PROBLEM</span></div>
            <div className="hero-frame hero-frame-front"><img src={exampleData[0]?.references[0]?.thumbnail ?? '/media/cnt_8d8a072b69a716cd9353697a2328-0.webp'} alt="A real source video for creative research" /><span className="hero-frame-tag"><span className="status-dot" /> REAL REFERENCES</span><div className="frame-bottom"><span>Less scrolling.<br />More perspective.</span><ArrowUpRight size={25} /></div></div>
            <div className="hero-insight"><span className="insight-symbol"><Sparkles size={20} /></span><div><span className="eyebrow">THE ANGLE</span><p>Show the moment<br />your app makes better.</p></div><span className="insight-line" /></div>
            <span className="art-bottom-label">OBSERVE. CONNECT. CREATE.</span>
          </div>
        </section>
        <section id="examples" className="examples-section"><div className="section-heading"><div><span className="eyebrow">A LITTLE EVIDENCE. A FRESH PERSPECTIVE.</span><h2>See what a brief can become.</h2></div><span className="small-meta">REAL SOURCES. USEFUL DIRECTIONS. <ArrowDown size={14} /></span></div>
          {examples.status === 'loading' ? <div className="examples-skeleton" aria-label="Loading examples">{[1, 2, 3].map(value => <div className="skeleton example-skeleton" key={value} />)}</div> : examples.status === 'error' ? <div className="inline-error" role="alert"><span>{examples.message}</span><button onClick={() => setReload(value => value + 1)}>Try again <ArrowRight size={16} /></button></div> : <div className="example-grid">{examples.data.map((example, index) => <button className={`example-card example-card-${index % 3}`} key={example.id} onClick={() => navigate({ view: 'study', studyId: example.id })}>
            <div className="example-copy"><span className="example-number">0{index + 1} / {example.product}</span><h3>{example.tagline}</h3><span className="verified"><CircleCheck size={12} /> {example.origin === 'curated' ? 'Verified example' : 'Research study'}</span></div><div className="example-images">{example.references.slice(0, 2).map(reference => <img key={reference.id} src={reference.thumbnail} alt={reference.title} />)}</div><span className="example-arrow"><ArrowUpRight size={20} /></span>
          </button>)}</div>}
        </section>
        <footer className="home-footer"><span>Find the pattern. Make it your own.</span><span>ANGLE <span className="footer-asterisk">✳</span> BUILT FOR YOUR NEXT IDEA</span></footer>
      </main>
    </div> : <div className="app-shell">
      <aside className="sidebar"><Brand light onClick={() => navigate({ view: 'home' })} /><div className="sidebar-intro">A little evidence.<br />A different angle.</div><button className="new-brief" onClick={newBrief}><Plus size={16} /> New brief <span>↗</span></button><span className="sidebar-label">YOUR WORKSPACE</span>
        <button className={`sidebar-item ${location.view === 'history' ? 'active' : ''}`} onClick={() => navigate({ view: 'history' })}><Clock3 size={17} /> History</button>
        {studyId && <button className={`sidebar-item ${location.view === 'study' ? 'active' : ''}`} onClick={() => navigate({ view: 'study', studyId })}><Compass size={17} /> Research</button>}
        {studyId && study.status === 'ready' && study.data.id === studyId && hasUsableStoryboard(study.data) && <button className={`sidebar-item ${location.view === 'storyboard' ? 'active' : ''}`} onClick={() => navigate({ view: 'storyboard', studyId })}><span className="storyboard-icon" /> Storyboard</button>}
        <div className="sidebar-divider" /><span className="sidebar-label">EXPLORE EXAMPLES</span><div className="sidebar-examples">{exampleData.map((example, index) => <button className={example.id === studyId ? 'current' : ''} key={example.id} onClick={() => navigate({ view: 'study', studyId: example.id })}><span>0{index + 1}</span><span>{example.product}<small>{example.promise || example.tagline || 'Creative research'}</small></span><ArrowUpRight size={13} /></button>)}</div><div className="sidebar-bottom"><div className="sidebar-flower">✳</div><p>Better creative.<br /><span>Grounded in what you see.</span></p><span className="sidebar-local"><span className="status-dot" /> YOUR CREATIVE WORKSPACE</span></div></aside>
      <div className="workspace-main">{location.view === 'history' ? <History entries={history} onRefresh={() => setHistoryReload(value => value + 1)} onOpen={id => navigate({ view: 'study', studyId: id })} onBack={() => navigate({ view: 'home' })} /> : study.status === 'ready' && study.data.id === location.studyId ? <Workspace key={study.data.id} study={study.data} view={location.view} onView={view => navigate({ view, studyId: location.studyId })} onHistory={() => navigate({ view: 'history' })} onCorrectBrief={() => correctBrief(study.data)} /> : study.status === 'error' ? <div className="empty-state"><Compass size={32} /><h1>We couldn't open this study.</h1><p>{study.message}</p><button className="button button-dark" onClick={() => setReload(value => value + 1)}>Try again <ArrowRight size={16} /></button><button className="text-link" onClick={() => navigate({ view: 'history' })}>Back to history</button><button className="text-link" onClick={() => navigate({ view: 'home' })}>Back to the examples</button></div> : <div className="workspace-loading"><span className="eyebrow"><LoaderCircle size={14} className="spin" /> OPENING YOUR RESEARCH</span><div className="skeleton loading-heading" /><div className="loading-grid">{[1, 2, 3].map(value => <div className="skeleton" key={value} />)}</div></div>}</div>
    </div>}
    {busy && <div className="research-progress" role="status" aria-live="polite"><div className="research-orb"><Compass size={26} /></div><div><span className="eyebrow">FINDING YOUR ANGLE</span><h3>{research.status === 'job' && research.job.status === 'running' ? research.job.stage : 'Starting your research'}</h3><p>{research.status === 'job' && research.job.status === 'running' ? research.job.detail : 'Turning your brief into a research plan.'}</p><span className="progress-line"><span /></span></div></div>}
    {research.status === 'error' && <div className="toast toast-error" role="alert"><div><strong>Research paused</strong><p>{research.message}</p>{research.jobId && <button className="text-link" onClick={() => { const id = research.jobId; if (id) { setResearch({ status: 'submitting' }); void api.job(id).then(next => setResearch({ status: 'job', job: next })).catch(error => setResearch({ status: 'error', message: errorMessage(error), jobId: id })); } }}>Check job again <ArrowRight size={14} /></button>}</div><button className="icon-button" aria-label="Dismiss error" onClick={() => setResearch({ status: 'idle' })}><X size={16} /></button></div>}
    {notice && <div className="toast" role="status"><Check size={17} /><p>{notice}</p><button className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={16} /></button></div>}
  </>;
}
