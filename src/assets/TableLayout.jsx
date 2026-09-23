import './TableLayout.css';

function TableLayout({ data }) {
  return (
    <div className="table-layout">
        <div id="header">
            <p className="header-cell" style={{ "--col": 1 }}><strong>Test Number</strong></p>
            <p className="header-cell" style={{ "--col": 2 }}><strong>Date</strong></p>
            <p className="header-cell" style={{ "--col": 3 }}><strong>Material</strong></p>
            <p className="header-cell" style={{ "--col": 4 }}><strong>Test Type</strong></p>
            <p className="header-cell" style={{ "--col": 5 }}><strong>Props</strong></p>
            <p className="header-cell" style={{ "--col": 6 }}><strong>Resin Type</strong></p>
            <p className="header-cell" style={{ "--col": 7 }}><strong>Resin Matrix</strong></p>
            <p className="header-cell" style={{ "--col": 8 }}><strong>Manufacturing Method</strong></p>
            <p className="header-cell" style={{ "--col": 9 }}><strong>Layup</strong></p>
            <p className="header-cell" style={{ "--col": 10 }}><strong>Pictures</strong></p>
            <p className="header-cell" style={{ "--col": 11 }}><strong>Core Type</strong></p>
        </div>
        <div id="body">
            {data.map((entry, index) => (
                <div className="row" key={index}>
                    <div style={{ "--col": 1 }}>
                    <p>{entry.test_num}</p>
                    </div>
                    <div style={{ "--col": 2 }}>
                    <p>{entry.date.toString()}</p>
                    </div>
                    <div style={{ "--col": 3 }}>
                    <p>{entry.material}</p>
                    </div>
                    <div style={{ "--col": 4 }}>
                    <p>{entry.test_type}</p>
                    </div>
                    <div style={{ "--col": 5 }}>
                    <p>{JSON.stringify(entry.props)}</p>
                    </div>
                    <div style={{ "--col": 6 }}>
                    <p>{entry.resin_type}</p>
                    </div>
                    <div style={{ "--col": 7 }}>
                    <p>{entry.resin_matrix}</p>
                    </div>
                    <div style={{ "--col": 8 }}>
                    <p>{entry.mfg_method}</p>
                    </div>
                    <div style={{ "--col": 9 }}>
                    <p>{entry.layup.join(', ')}</p>
                    </div>
                    <div style={{ "--col": 10 }}>
                    <p>{entry.pictures.join(', ')}</p>
                    </div>
                    <div style={{ "--col": 11 }}>
                    <p>{entry.coretype}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
}

export default TableLayout;