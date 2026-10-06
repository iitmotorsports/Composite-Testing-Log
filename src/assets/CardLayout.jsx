import './CardLayout.css';

// Turn "tensile_strength" or "tensileStrength" into "Tensile Strength"
const prettifyKey = (key) =>
  key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());

// Render any value in a readable way
const renderValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') {
    return (
      <ul className="props-nested">
        {Object.entries(value).map(([k, v]) => (
          <li key={k}>
            <span className="props-key">{prettifyKey(k)}:</span> {renderValue(v)}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
};

function PropsList({ props }) {
  const entries = Object.entries(props || {});
  if (entries.length === 0) return <span>—</span>;

  return (
    <dl className="props-list">
      {entries.map(([key, value]) => (
        <div key={key} className="props-row">
          <dt>{prettifyKey(key)}</dt>
          <dd>{renderValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function CardLayout({ data, setSelectedId }) {
  const formatDate = (date) =>
    date.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric' });

  const onCardClick = (index) => setSelectedId(index);

  return (
    <div className="card-layout">
      {data.map((entry, index) => (
        <div key={index} className="card" onClick={() => onCardClick(index)}>
          <h1><strong>Test:</strong> {entry.test_num}</h1>
          <p><strong>Date:</strong> {formatDate(entry.date)}</p>
          <p><strong>Material:</strong> {entry.material}</p>
          <p><strong>Test Type:</strong> {entry.test_type}</p>
          <div className="props-section">
            <strong>Props:</strong>
            <PropsList props={entry.props} />
          </div>
          <p><strong>Resin Type:</strong> {entry.resin_type}</p>
          <p><strong>Resin Matrix:</strong> {entry.resin_matrix}</p>
          <p><strong>Manufacturing Method:</strong> {entry.mfg_method}</p>
          <p><strong>Layup:</strong> {entry.layup.join(', ')}</p>
          {/* <p><strong>Pictures:</strong> {entry.pictures.join(', ')}</p> */}
          <p><strong>Core Type:</strong> {entry.coretype}</p>
        </div>
      ))}
    </div>
  );
}

export default CardLayout;
