import './InfoPage.css';

// Units for entry.props keys. Add new properties here as you log them.
// Anything not listed is shown without a unit.
const PROP_UNITS = {
  'Flexural Strength': 'psi',
};

// Turn "0/90 Carbon Twill" into a crosshatch of fiber directions for the ply swatch.
function plyBackground(ply) {
  const match = /(-?\d+)\s*\/\s*(-?\d+)/.exec(ply);
  if (!match) return undefined;
  const fiber = (deg) =>
    `repeating-linear-gradient(${deg}deg, var(--fiber) 0 1px, transparent 1px 5px)`;
  return `${fiber(match[1])}, ${fiber(match[2])}`;
}

function formatValue(value) {
  return typeof value === 'number' ? value.toLocaleString() : String(value);
}

const formatDate = (date) => date.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric'}); 

function Field({ label, children }) {
  if (children === undefined || children === null || children === '') return null;
  return (
    <div className="info-field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function InfoPage({ data, selectedId }) {
  const entry = data[selectedId];
  if (!entry) {
    return (
      <div className="info-page">
        <p className="info-empty">Select a test to see its details.</p>
      </div>
    );
  }

  const {
    test_num,
    date,
    material,
    test_type,
    props,
    resin_type,
    resin_matrix,
    mfg_method,
    layup,
    pictures,
    coretype,
  } = entry;

  const propEntries = Object.entries(props ?? {});
  const hasResin = resin_type || resin_matrix;

  return (
    <div className="info-page">
      <header className="info-header">
        <h2>
          Test {test_num}: {material}
        </h2>
        <p className="info-subtitle">
          {test_type}
          {date && <span className="info-date"> on {formatDate(date)}</span>}
        </p>
      </header>

      {propEntries.length > 0 && (
        <section className="info-results" aria-label="Test results">
          {propEntries.map(([name, value]) => (
            <div className="info-result" key={name}>
              <span className="info-result-name">{name}</span>
              <span className="info-result-value">
                {formatValue(value)}
                {PROP_UNITS[name] && <span className="info-result-unit"> {PROP_UNITS[name]}</span>}
              </span>
            </div>
          ))}
        </section>
      )}

      <section className="info-section">
        <h3>Construction</h3>
        <dl className="info-fields">
          <Field label="Material">{material}</Field>
          <Field label="Core">{coretype}</Field>
          <Field label="Manufacturing">{mfg_method}</Field>
          {hasResin && (
            <Field label="Resin">
              {[resin_matrix, resin_type].filter(Boolean).join(' ')}
            </Field>
          )}
        </dl>
      </section>

      {layup?.length > 0 && (
        <section className="info-section">
          <h3>Layup</h3>
          <ol className="info-layup">
            {layup.map((ply, i) => (
              <li className="info-ply" key={`${ply}-${i}`}>
                <span
                  className="info-ply-swatch"
                  style={{ backgroundImage: plyBackground(ply) }}
                  aria-hidden="true"
                />
                <span className="info-ply-name">{ply}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {pictures?.length > 0 && (
        <section className="info-section">
          <h3>Pictures</h3>
          <div className="info-pictures">
            {pictures.map((src) => (
              <a key={src} href={src} target="_blank" rel="noreferrer">
                <img
                  src={src}
                  alt={`Test ${test_num}: ${src.split('/').pop()}`}
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default InfoPage;
