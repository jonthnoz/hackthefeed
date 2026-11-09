import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Clock3, LoaderCircle, RefreshCw, Search } from 'lucide-react';
import type { HistoryEntry } from '../shared/schema';
import type { Resource } from './api';
import { ConstraintChips } from './Constraints';

function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function History({ entries, onRefresh, onOpen, onBack }: { entries: Resource<HistoryEntry[]>; onRefresh: () => void; onOpen: (id: string) => void; onBack: () => void }) {
  const [query, setQuery] = useState('');
  const search = query.trim().toLocaleLowerCase();
  const matches = entries.status === 'ready' ? entries.data.filter(entry => [entry.product, entry.tagline, entry.brief, entry.constraints.exclude, entry.constraints.noRealPeople ? 'No real person on screen' : ''].join(' ').toLocaleLowerCase().includes(search)) : [];

  return <main className="history-workspace">
    <button className="back-link" onClick={onBack}><ArrowLeft size={14} /> Back to new brief</button>
    <div className="study-heading"><div><span className="eyebrow">YOUR PREVIOUS RESEARCH</span><h1>Research history.</h1><p>Completed studies stored on this local installation. Reopen a study to review its original evidence and directions.</p></div><button className="button button-outline" onClick={onRefresh} disabled={entries.status === 'loading'}><RefreshCw size={15} /> Refresh history</button></div>
    <label className="history-search"><Search size={17} /><span className="sr-only">Search research history</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search products, briefs, or constraints" /></label>
    {entries.status === 'loading' ? <div className="history-state" role="status"><LoaderCircle className="spin" size={24} /><p>Loading research history...</p></div> : entries.status === 'error' ? <div className="inline-error" role="alert"><p>Couldn't load history. {entries.message}</p><button onClick={onRefresh}>Try again <RefreshCw size={14} /></button></div> : !entries.data.length ? <div className="history-state"><Clock3 size={28} /><h2>No research history yet.</h2><p>Completed research will appear here. Start with a new brief.</p><button className="button button-dark" onClick={onBack}>Write a brief <ArrowUpRight size={16} /></button></div> : <>
      <p className="history-count" role="status">{matches.length} {matches.length === 1 ? 'study' : 'studies'}{search ? ' found' : ' · newest first'}</p>
      {!matches.length ? <div className="history-state"><Search size={26} /><h2>No matching studies.</h2><p>Try another product, brief, or constraint.</p><button className="text-link" onClick={() => setQuery('')}>Clear search</button></div> : <div className="history-grid">{matches.map(entry => <article className="history-card" key={entry.id}>
        <div className="history-card-meta"><span>{entry.product}</span><time dateTime={entry.createdAt}>{dateLabel(entry.createdAt)}</time></div><h2>{entry.tagline}</h2><p className="history-brief">{entry.brief}</p><ConstraintChips constraints={entry.constraints} /><div className="history-card-bottom"><span>{entry.referenceCount} references · {entry.angleCount} directions</span><button className="text-link" onClick={() => onOpen(entry.id)} aria-label={`Reopen ${entry.product}: ${entry.tagline}`}>Reopen study <ArrowUpRight size={16} /></button></div>
      </article>)}</div>}
    </>}
  </main>;
}
