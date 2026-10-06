import './TableLayout.css';

const COLUMNS = [
  'Test Number',
  'Date',
  'Material',
  'Test Type',
  'Props',
  'Resin Type',
  'Resin Matrix',
  'Manufacturing Method',
  'Layup',
  'Core Type',
];

const Empty = () => <span className="tl-empty">—</span>;

function Text({ value }) {
  return value ? <span>{value}</span> : <Empty />;
}

function Props({ value }) {
  const entries = value && typeof value === 'object' ? Object.entries(value) : [];
  if (!entries.length) return <Empty />;
  return entries.map(([key, val]) => (
    <span className="tl-chip" key={key}>
      <span className="tl-chip-key">{key}</span>
      <span>{String(val)}</span>
    </span>
  ));
}

function Layup({ value }) {
  if (!value?.length) return <Empty />;
  return value.map((ply, i) => (
    <span className="tl-chip tl-chip-ply" key={i}>{ply}</span>
  ));
}

// selectedId is optional: pass it to highlight the active row.
function TableLayout({ data, setSelectedId, selectedId }) {
  const select = (index) => setSelectedId(index);

  return (
    <div className="table-layout" role="table" aria-label="Test results">
      <div className="tl-head" role="row">
        {COLUMNS.map((label) => (
          <div className="tl-head-cell" role="columnheader" key={label}>
            {label}
          </div>
        ))}
      </div>

      <div className="tl-body" role="rowgroup">
        {data.map((entry, index) => (
          <div
            className="tl-row"
            role="row"
            key={index}
            tabIndex={0}
            aria-selected={selectedId === index}
            onClick={() => select(index)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                select(index);
              }
            }}
          >
            <div className="tl-cell tl-num" role="cell">{entry.test_num}</div>
            <div className="tl-cell tl-date" role="cell">
              {entry.date.toLocaleDateString('en-CA')}
            </div>
            <div className="tl-cell" role="cell"><Text value={entry.material} /></div>
            <div className="tl-cell" role="cell"><Text value={entry.test_type} /></div>
            <div className="tl-cell" role="cell"><Props value={entry.props} /></div>
            <div className="tl-cell" role="cell"><Text value={entry.resin_type} /></div>
            <div className="tl-cell" role="cell"><Text value={entry.resin_matrix} /></div>
            <div className="tl-cell" role="cell"><Text value={entry.mfg_method} /></div>
            <div className="tl-cell" role="cell"><Layup value={entry.layup} /></div>
            <div className="tl-cell" role="cell"><Text value={entry.coretype} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TableLayout;
