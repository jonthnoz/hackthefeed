import type { Constraints } from '../shared/schema';

export const sampledEvidenceDisclaimer = 'Assessed from available frames and text.';

export function ConstraintChips({ constraints }: { constraints: Constraints }) {
  return <div className="constraint-chips">
    {constraints.noRealPeople && <span className="constraint-chip">No real person on screen</span>}
    {constraints.exclude.trim() && <span className="constraint-chip">Exclude: {constraints.exclude}</span>}
    {!constraints.noRealPeople && !constraints.exclude.trim() && <span className="constraint-chip constraint-chip-neutral">No creative constraints</span>}
  </div>;
}

export function ConstraintsControl({ value, onChange, disabled }: { value: Constraints; onChange: (value: Constraints) => void; disabled: boolean }) {
  return <fieldset className="constraints-control" disabled={disabled}>
    <legend>Creative constraints <span>Optional</span></legend>
    <label className="constraint-checkbox"><input type="checkbox" checked={value.noRealPeople} onChange={event => onChange({ ...value, noRealPeople: event.target.checked })} /><span>No real person on screen<small>Hands and fingers are allowed. No faces or presenters.</small></span></label>
    <details className="constraint-exclude"><summary>Anything else to exclude?{value.exclude.trim() && <span> Added</span>}</summary><label htmlFor="exclude">Avoid these subjects, formats, or styles</label><textarea id="exclude" rows={2} maxLength={1000} value={value.exclude} onChange={event => onChange({ ...value, exclude: event.target.value })} placeholder="For example: talking heads, before-and-after shots..." /></details>
  </fieldset>;
}
