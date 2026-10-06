import { useEffect, useState } from 'react';
import './SubmitForm.css';

// Paste your deployed Cloudflare Worker URL here
const WORKER_URL = 'https://composite-test-log.jacob612r.workers.dev/';

// Starting options for the dropdowns. These are placeholders: edit freely.
// Users can also add new values with "Other", and you can pass previously
// used values in via the `extraOptions` prop (see bottom of file).
export const DEFAULT_OPTIONS = {
  test_type: ['Flexural (3-point)', 'Tensile', 'Lap Joint / Lap Shear', 'Perimeter Shear'], 
  resin_matrix: ['Epoxy', 'Polyester', 'Vinyl Ester'],
  coretype: ['Honeycomb (Aluminum)', 'Foam (PET)'],
};

// Ask the worker for the next free test number (null if it can't be fetched)
async function fetchNextTestNum() {
  try {
    const res = await fetch(WORKER_URL);
    const out = await res.json();
    return res.ok && Number.isInteger(out.next) ? out.next : null;
  } catch {
    return null;
  }
}

const OTHER = '__other__';
const emptyEnum = { choice: '', custom: '' };

const initialState = {
  test_num: '',
  date: '',
  material: '',
  resin_type: '',
  mfg_method: '',
  test_type: emptyEnum,
  resin_matrix: emptyEnum,
  coretype: emptyEnum,
  layup: [''],
  props: [{ key: '', value: '' }],
};

const resolveEnum = ({ choice, custom }) => (choice === OTHER ? custom.trim() : choice);
const mergeOptions = (a = [], b = []) => [...new Set([...a, ...b])];

/** Dropdown + "Other" text box for adding a new value */
function EnumField({ label, options, state, onChange, required, emptyLabel }) {
  return (
    <label>
      {label}
      <select
        value={state.choice}
        required={required}
        onChange={(e) => onChange({ ...state, choice: e.target.value })}
      >
        <option value="">{emptyLabel || 'Select…'}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
        <option value={OTHER}>Other (add new)…</option>
      </select>
      {state.choice === OTHER && (
        <input
          value={state.custom}
          required
          autoFocus
          placeholder={`New ${label.toLowerCase()}`}
          onChange={(e) => onChange({ ...state, custom: e.target.value })}
        />
      )}
    </label>
  );
}

function SubmitForm({ setIsFormOpen, extraOptions = {} }) {
  const [f, setF] = useState(initialState);
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [message, setMessage] = useState('');
  const [numLoading, setNumLoading] = useState(true);

  // Pre-fill the test number (still editable). Never overwrites what the user typed.
  useEffect(() => {
    fetchNextTestNum().then((n) => {
      if (n !== null) setF((p) => (p.test_num === '' ? { ...p, test_num: String(n) } : p));
      setNumLoading(false);
    });
  }, []);

  const opts = {
    test_type: mergeOptions(DEFAULT_OPTIONS.test_type, extraOptions.test_type),
    resin_matrix: mergeOptions(DEFAULT_OPTIONS.resin_matrix, extraOptions.resin_matrix),
    coretype: mergeOptions(DEFAULT_OPTIONS.coretype, extraOptions.coretype),
  };

  const set = (key) => (e) => setF((p) => ({ ...p, [key]: e.target.value }));
  const setEnum = (key) => (val) => setF((p) => ({ ...p, [key]: val }));

  // layup helpers
  const setLayup = (i, v) => setF((p) => ({ ...p, layup: p.layup.map((l, j) => (j === i ? v : l)) }));
  const addLayup = () => setF((p) => ({ ...p, layup: [...p.layup, ''] }));
  const removeLayup = (i) =>
    setF((p) => ({ ...p, layup: p.layup.length > 1 ? p.layup.filter((_, j) => j !== i) : [''] }));

  // props helpers
  const setProp = (i, field, v) =>
    setF((p) => ({ ...p, props: p.props.map((r, j) => (j === i ? { ...r, [field]: v } : r)) }));
  const addProp = () => setF((p) => ({ ...p, props: [...p.props, { key: '', value: '' }] }));
  const removeProp = (i) =>
    setF((p) => ({ ...p, props: p.props.length > 1 ? p.props.filter((_, j) => j !== i) : [{ key: '', value: '' }] }));

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus('submitting');
    setMessage('');

    // props rows -> object (numeric-looking values become numbers)
    const props = {};
    for (const { key, value } of f.props) {
      const k = key.trim();
      const v = value.trim();
      if (!k || v === '') continue;
      props[k] = !isNaN(Number(v)) ? Number(v) : v;
    }

    const data = {
      test_num: parseInt(f.test_num, 10),
      date: f.date,
      material: f.material.trim(),
      test_type: resolveEnum(f.test_type),
      props,
      resin_type: f.resin_type.trim(),
      resin_matrix: resolveEnum(f.resin_matrix),
      mfg_method: f.mfg_method.trim(),
      layup: f.layup.map((l) => l.trim()).filter(Boolean),
      coretype: resolveEnum(f.coretype) || null,
      // `pictures` is filled in by the worker from the uploaded files
    };

    const body = new FormData();
    body.append('data', JSON.stringify(data));
    body.append('website', form.elements.website.value); // honeypot
    for (const file of form.elements.images.files) body.append('images', file);

    try {
      const res = await fetch(WORKER_URL, { method: 'POST', body });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'Submission failed');

      setStatus('success');
      setMessage('Submitted! A pull request was opened for review.');
      setF(initialState);
      form.reset();
      // the new PR now counts, so this fetches the following number
      fetchNextTestNum().then((n) => {
        if (n !== null) setF((p) => (p.test_num === '' ? { ...p, test_num: String(n) } : p));
      });
    } catch (err) {
      setStatus('error');
      setMessage(err.message);
    }
  }

  return (
    <div className="submit-form">
      <h2>Submit Test</h2>

      <form onSubmit={handleSubmit}>
        <div className="sf-grid-2">
          <label>
            Test number
            <input type="number" min="0" step="1" required value={f.test_num} onChange={set('test_num')} placeholder={numLoading ? 'Loading…' : 'Enter Test Number'} />
          </label>
          <label>
            Date
            <input type="date" required value={f.date} onChange={set('date')} />
          </label>
        </div>

        <label>
          Material
          <input required value={f.material} onChange={set('material')} placeholder="e.g. Carbon Fiber or Fiberglass" />
        </label>

        <EnumField
          label="Test type"
          required
          options={opts.test_type}
          state={f.test_type}
          onChange={setEnum('test_type')}
        />

        <div className="sf-grid-2">
          <label>
            Resin type
            <input required value={f.resin_type} onChange={set('resin_type')} />
          </label>
          <EnumField
            label="Resin matrix"
            required
            options={opts.resin_matrix}
            state={f.resin_matrix}
            onChange={setEnum('resin_matrix')}
          />
        </div>

        <label>
          Manufacturing method
          <input required value={f.mfg_method} onChange={set('mfg_method')} placeholder="e.g. vacuum bag, wet layup" />
        </label>

        <EnumField
          label="Core type (optional)"
          options={opts.coretype}
          state={f.coretype}
          onChange={setEnum('coretype')}
          emptyLabel="None"
        />

        {/* Layup: ordered list of plies */}
        <fieldset className="sf-group">
          <legend>Layup (in order)</legend>
          {f.layup.map((ply, i) => (
            <div className="sf-row" key={i}>
              <span className="sf-index">{i + 1}</span>
              <input
                value={ply}
                required={i === 0}
                placeholder="e.g. 0/90 carbon twill"
                onChange={(e) => setLayup(i, e.target.value)}
                aria-label={`Layer ${i + 1}`}
              />
              <button type="button" className="sf-icon-btn" onClick={() => removeLayup(i)} aria-label={`Remove layer ${i + 1}`}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="sf-add-btn" onClick={addLayup}>+ Add layer</button>
        </fieldset>

        {/* Props: free-form name/value results */}
        <fieldset className="sf-group">
          <legend>Properties / results</legend>
          <p className="sf-hint">Name + value pairs, e.g. flexural_strength_MPa → 412</p>
          {f.props.map((row, i) => (
            <div className="sf-row" key={i}>
              <input
                value={row.key}
                placeholder="Name"
                onChange={(e) => setProp(i, 'key', e.target.value)}
                aria-label={`Property ${i + 1} name`}
              />
              <input
                value={row.value}
                placeholder="Value"
                onChange={(e) => setProp(i, 'value', e.target.value)}
                aria-label={`Property ${i + 1} value`}
              />
              <button type="button" className="sf-icon-btn" onClick={() => removeProp(i)} aria-label={`Remove property ${i + 1}`}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="sf-add-btn" onClick={addProp}>+ Add property</button>
        </fieldset>

        <label>
          Pictures
          <input name="images" type="file" accept="image/*" multiple />
        </label>

        {/* honeypot: hidden from humans, bots tend to fill it in */}
        <input
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px' }}
        />

        <div className="submit-form-actions">
          <button type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Submitting...' : 'Submit'}
          </button>
          {setIsFormOpen && (
            <button type="button" onClick={() => setIsFormOpen(false)}>
              Close
            </button>
          )}
        </div>

        {message && <p className={`submit-form-${status}`}>{message}</p>}
      </form>
    </div>
  );
}

export default SubmitForm;

// Usage with previously-added values so the dropdowns grow over time:
// <SubmitForm
//   setIsFormOpen={setIsFormOpen}
//   extraOptions={{
//     test_type: [...new Set(tests.map(t => t.test_type))],
//     resin_matrix: [...new Set(tests.map(t => t.resin_matrix))],
//     coretype: [...new Set(tests.map(t => t.coretype).filter(Boolean))],
//   }}
// />
