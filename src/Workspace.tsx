import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, CircleCheck, Clapperboard, Eye, FileText, Heart, Layers3, Search, SlidersHorizontal } from 'lucide-react';
import type { Reference, Study } from '../shared/schema';
import { metric } from './api';
import { SourceDrawer } from './SourceDrawer';
import { Storyboard } from './Storyboard';

type WorkspaceTab = 'angles' | 'references' | 'notes';
type Relevance = 'all' | Reference['relevance'];

export const relevanceLabel = { direct: 'Direct reference', adjacent: 'Adjacent inspiration', mechanism: 'Creative mechanism' } satisfies Record<Reference['relevance'], string>;

function ReferenceCard({ reference, onOpen, index }: { reference: Reference; onOpen: () => void; index: number }) {
  return <button className="reference-card" onClick={onOpen}>
    <div className="reference-image"><img src={reference.thumbnail} alt={reference.title} loading="lazy" /><span className="reference-index">REF. {String(index + 1).padStart(2, '0')}</span><span className="reference-platform">{reference.platform}</span><span className="reference-open"><ArrowUpRight size={21} /></span><div className="reference-image-bottom"><span>{reference.format}</span></div></div>
    <div className="reference-caption"><span className={`relevance-dot relevance-${reference.relevance}`} />{relevanceLabel[reference.relevance]}</div><h3>{reference.title}</h3><span className="reference-creator">{reference.creator.startsWith('@') ? reference.creator : `@${reference.creator}`}</span><div className="reference-metrics"><span><Eye size={13} /> {metric(reference.views)}<span className="sr-only"> views</span></span><span><Heart size={12} /> {metric(reference.likes)}<span className="sr-only"> likes</span></span></div>
  </button>;
}

export function Workspace({ study, view, onView }: { study: Study; view: 'study' | 'storyboard'; onView: (view: 'study' | 'storyboard') => void }) {
  const [tab, setTab] = useState<WorkspaceTab>('angles');
  const [selectedAngleId, setSelectedAngleId] = useState(study.angles[0]?.id ?? '');
  const [source, setSource] = useState<Reference | null>(null);
  const [filter, setFilter] = useState<Relevance>('all');
  const selectedAngle = study.angles.find(angle => angle.id === selectedAngleId);
  const angleReferences = selectedAngle ? study.references.filter(reference => selectedAngle.referenceIds.includes(reference.id)) : study.references;
  const visibleReferences = (tab === 'angles' ? angleReferences : study.references).filter(reference => filter === 'all' || reference.relevance === filter);

  return <>
    <header className="workspace-topbar"><div className="breadcrumb"><span>Workspace</span><span>/</span><span>{study.product}</span><span>/</span><strong>{view === 'storyboard' ? 'Storyboard' : 'Creative research'}</strong></div><span className="verified workspace-verified"><CircleCheck size={13} />{study.origin === 'curated' ? 'Verified example' : 'Completed research'}</span></header>
    {view === 'storyboard' ? <Storyboard study={study} onBack={() => onView('study')} onSource={setSource} /> : <main className="research-workspace">
      <div className="study-heading"><div><span className="eyebrow">THE CREATIVE RESEARCH <span className="heading-slash">/</span> {study.product.toUpperCase()}</span><h1>{study.tagline}</h1><p>{study.question}</p></div><button className="button button-lime" onClick={() => onView('storyboard')}><Clapperboard size={17} /> Open storyboard <ArrowUpRight size={17} /></button></div>
      <div className="study-summary"><div className="summary-symbol"><Search size={19} /></div><p>{study.overview}</p><span className="summary-count"><strong>{String(study.references.length).padStart(2, '0')}</strong> sources<br />examined</span></div>
      <div className="workspace-tabs" role="tablist" aria-label="Research views"><button id="tab-angles" role="tab" aria-selected={tab === 'angles'} aria-controls="research-panel" className={tab === 'angles' ? 'selected' : ''} onClick={() => { setTab('angles'); setFilter('all'); }}><Layers3 size={16} /> Creative directions <span>{study.angles.length}</span></button><button id="tab-references" role="tab" aria-selected={tab === 'references'} aria-controls="research-panel" className={tab === 'references' ? 'selected' : ''} onClick={() => { setTab('references'); setFilter('all'); }}><Eye size={16} /> Source library <span>{study.references.length}</span></button><button id="tab-notes" role="tab" aria-selected={tab === 'notes'} aria-controls="research-panel" className={tab === 'notes' ? 'selected' : ''} onClick={() => setTab('notes')}><FileText size={16} /> Research notes</button><span className="tabs-aside">EVIDENCE INTO IDEAS <ArrowRight size={13} /></span></div>
      <div id="research-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'notes' ? <div className="research-notes"><div><span className="eyebrow">THE STARTING POINT</span><h2>A clear brief.<br /><span className="serif">An informed direction.</span></h2><p>{study.brief}</p></div><div className="notes-paper"><span className="eyebrow">RESEARCH NOTES</span>{study.searchNotes.length ? study.searchNotes.map((note, index) => <div className="research-note" key={`${index}-${note}`}><span>{String(index + 1).padStart(2, '0')}</span><p>{note}</p></div>) : <p>No additional research notes were recorded.</p>}<div className="research-note note-disclaimer"><CircleCheck size={16} /><p>Sources show creative approaches and available engagement. They do not establish app installs or conversion performance.</p></div></div></div> : <div className={`research-columns ${tab === 'references' ? 'library-view' : ''}`}>
          {tab === 'angles' && <section className="angles-panel"><div className="panel-heading"><span className="eyebrow">OBSERVED ANGLES</span><span className="small-meta">CHOOSE A DIRECTION</span></div><div className="angles-list">{study.angles.map((angle, index) => <article className={`angle-card ${angle.id === selectedAngleId ? 'angle-selected' : ''}`} key={angle.id}>
            <button className="angle-select" onClick={() => { setSelectedAngleId(angle.id); setFilter('all'); }} aria-expanded={angle.id === selectedAngleId}><span className="angle-number">0{index + 1}</span><div><span className="angle-label">{angle.label}</span><h2>{angle.title}</h2></div><span className="angle-check">{angle.id === selectedAngleId ? <Check size={14} /> : <ArrowUpRight size={15} />}</span></button>
            {angle.id === selectedAngleId && <div className="angle-content"><p>{angle.description}</p><div className="angle-fit"><span className="eyebrow">WHY IT FITS {study.product.toUpperCase()}</span><p>{angle.whyItFits}</p></div><div className="angle-evidence"><span className="eyebrow">WHAT THE REFERENCES SHOW</span><p>{angle.evidence}</p></div><span className="angle-sources"><span className="status-dot" /> {angle.referenceIds.filter(id => study.references.some(reference => reference.id === id)).length} linked references</span></div>}
          </article>)}</div>{!study.angles.length && <p className="muted">No creative directions were recorded in this study.</p>}<p className="panel-footnote">Observed patterns, ready for your interpretation.</p></section>}
          <section className="sources-panel"><div className="panel-heading"><div><span className="eyebrow">{tab === 'angles' ? 'THE EVIDENCE BEHIND THE ANGLE' : 'YOUR REFERENCE LIBRARY'}</span><span className="source-subheading">Real videos. A closer look.</span></div><label className="source-filter"><SlidersHorizontal size={13} /><span className="sr-only">Filter references by relevance</span><select value={filter} onChange={event => { const value = event.target.value; if (value === 'all' || value === 'direct' || value === 'adjacent' || value === 'mechanism') setFilter(value); }}><option value="all">All sources</option><option value="direct">Direct</option><option value="adjacent">Adjacent</option><option value="mechanism">Mechanism</option></select></label></div>
            <div className="reference-grid">{visibleReferences.map(reference => <ReferenceCard key={reference.id} reference={reference} index={study.references.findIndex(item => item.id === reference.id)} onOpen={() => setSource(reference)} />)}</div>
            {!visibleReferences.length && <div className="sources-empty"><Search size={24} /><h3>No references in this view.</h3><p>{filter === 'all' ? 'This direction has no linked sources.' : 'Try another relevance filter.'}</p>{filter !== 'all' && <button className="text-link" onClick={() => setFilter('all')}>Show all sources <ArrowRight size={14} /></button>}</div>}
            {selectedAngle && tab === 'angles' && <div className="hook-note"><span className="hook-note-mark">“</span><div><span className="eyebrow">A HOOK TO MAKE YOUR OWN</span><p>{selectedAngle.suggestedHook}</p><span className="hook-visual">{selectedAngle.visualDirection}</span></div></div>}
            <div className="sources-footer"><span><CircleCheck size={12} /> Metrics as recorded. Missing data stays unavailable.</span><button onClick={() => tab === 'angles' ? setTab('references') : setTab('angles')}>{tab === 'angles' ? 'Explore all sources' : 'Back to directions'} <ArrowRight size={13} /></button></div>
          </section>
        </div>}
      </div>
      <div className="workspace-endnote"><span>YOUR RESEARCH IS A STARTING POINT. YOUR PERSPECTIVE IS THE DIFFERENCE.</span><span>ANGLE <span>✳</span></span></div>
    </main>}
    {source && <SourceDrawer reference={source} onClose={() => setSource(null)} />}
  </>;
}
