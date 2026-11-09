import { ArrowUpRight } from 'lucide-react';
import { researchInputSchema, type Study } from '../shared/schema';

export function parseProjectLinks(text: string) {
  return researchInputSchema.shape.resources.safeParse(text.split(/\r?\n/).map(line => line.trim()).filter(Boolean));
}

export function ProjectLinksControl({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled: boolean }) {
  const result = parseProjectLinks(value);
  const message = result.success ? '' : value.split(/\r?\n/).filter(line => line.trim()).length > 5 ? 'Add up to 5 project links, one URL per line.' : 'Use a complete HTTP or HTTPS URL on each line.';
  return <div className="project-links-control"><label htmlFor="project-links">Project links <span>(recommended)</span></label><p id="project-links-help">Add your app, repository, or docs for project context. Optional, up to 5 links, one per line.</p><textarea id="project-links" value={value} onChange={event => onChange(event.target.value)} disabled={disabled} rows={2} placeholder={'https://your-app.com\nhttps://github.com/your-team/your-app\nhttps://docs.your-app.com'} aria-invalid={!result.success} aria-describedby={`project-links-help${message ? ' project-links-error' : ''}`} />{message && <p id="project-links-error" className="project-links-error" role="alert">{message}</p>}</div>;
}

export function ProjectContext({ study }: { study: Study }) {
  const unrecorded = study.resources.filter(url => !study.projectSources.some(source => source.url === url));
  return <section className="project-context" aria-labelledby="project-context-heading"><h3 id="project-context-heading">Project context</h3><p>Links supplied with this brief. Statuses and excerpts below reflect the content recorded during research; they do not certify a complete review of the linked project.</p>
    {!study.resources.length && !study.projectSources.length && <p>No project links were supplied with this study.</p>}
    {study.projectSources.map((source, index) => <article className="project-source" key={`${source.url}-${index}`}><span className={`project-source-status source-${source.status}`}>{source.status === 'loaded' ? 'Loaded' : 'Failed'}</span><a href={source.url} target="_blank" rel="noreferrer">{source.title || source.url} <ArrowUpRight size={13} /></a>{source.title && <span className="project-source-url">{source.url}</span>}<p>{source.reason || (source.status === 'loaded' ? 'An excerpt was recorded from this link.' : 'This link could not be loaded. Its content was unavailable to the research.')}</p>{source.excerpt ? <details><summary>Read recorded excerpt</summary><p>{source.excerpt}</p></details> : <p className="project-source-empty">No excerpt was recorded.</p>}</article>)}
    {unrecorded.map(url => <article className="project-source" key={url}><span className="project-source-status">Not recorded</span><a href={url} target="_blank" rel="noreferrer">{url} <ArrowUpRight size={13} /></a><p>No fetch status or source excerpt was recorded for this link.</p></article>)}
  </section>;
}
