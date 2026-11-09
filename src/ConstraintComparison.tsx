import type { Reference } from '../shared/schema';
import { recordedMedian } from './constraintEvidence';

function medianLabel(value: number | null): string {
  return value === null ? 'Unavailable' : Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(value);
}

export function ConstraintComparison({ fits, excluded, unknownCount }: { fits: Reference[]; excluded: Reference[]; unknownCount: number }) {
  const rows = (['views', 'interactions'] satisfies Array<'views' | 'interactions'>).map(key => ({ key, fits: recordedMedian(fits, key), excluded: recordedMedian(excluded, key) }));
  const excludedHigher = rows.filter(row => row.fits.count >= 2 && row.excluded.count >= 2 && row.fits.median !== null && row.excluded.median !== null && row.excluded.median > row.fits.median).map(row => row.key);
  const summarySignal = excludedHigher.length ? `Excluded sources have higher recorded median ${excludedHigher.join(' and ')} in this sample. Your constraints still apply.` : rows.every(row => row.fits.count < 2 || row.excluded.count < 2) ? 'Insufficient samples to establish a stronger signal.' : 'Recorded medians are observational signals. Your constraints still apply.';
  return <section className="constraint-comparison" aria-labelledby="comparison-heading">
    <details><summary><span id="comparison-heading">Compare recorded engagement</span><span className="comparison-summary-signal">{excluded.length} excluded · {fits.length} fits sampled evidence. {summarySignal}</span></summary><div className="comparison-details">
    <span className="eyebrow">RECORDED EVIDENCE</span><h2>Excluded vs. fits the sampled evidence</h2><p>{excluded.length} excluded sources · {fits.length} sources marked fits. {unknownCount} uncertain or unassessed sources kept out of this comparison.</p>
    <div className="comparison-table-wrap"><table><caption>Recorded medians. Each n counts sources with that metric; missing values are omitted, never treated as zero.</caption><thead><tr><th scope="col">Metric</th><th scope="col">Excluded</th><th scope="col">Fits sampled evidence</th></tr></thead><tbody>{rows.map(row => <tr key={row.key}><th scope="row">{row.key === 'views' ? 'Views' : 'Interactions'}</th><td>{medianLabel(row.excluded.median)} <small>n={row.excluded.count}</small></td><td>{medianLabel(row.fits.median)} <small>n={row.fits.count}</small></td></tr>)}</tbody></table></div>
    <div className="comparison-signals">{rows.map(row => <p key={row.key}>{row.fits.median === null || row.excluded.median === null ? `Insufficient recorded ${row.key} data to compare both groups.` : row.fits.count < 2 || row.excluded.count < 2 ? `For ${row.key}, n=1 in at least one group is insufficient to establish a stronger signal, even if the medians differ.` : row.excluded.median > row.fits.median ? `Excluded sources show a higher recorded median for ${row.key} in this sample. That observation does not make them suitable for your constraints.` : row.excluded.median < row.fits.median ? `Sources marked fits show a higher recorded median for ${row.key} in this sample.` : `Both groups have the same recorded median for ${row.key}.`}</p>)}</div>
    <p className="comparison-disclaimer">Small or unequal samples can mislead. These are observational signals, not causal results or efficiency measures. Platforms, audience sizes, and time since posting may differ. ROI cannot be inferred without cost and conversion data. Keep developing ideas within your constraints using the accepted references.</p>
    </div></details>
  </section>;
}
