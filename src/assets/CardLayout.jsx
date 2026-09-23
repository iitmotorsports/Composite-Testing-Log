import './CardLayout.css';

function CardLayout({ data }) {
  return (
    <div className="card-layout">
        {data.map((entry, index) => (
          <div key={index} className="card">
            <p><strong>Test Number:</strong> {entry.test_num}</p>
            {/* <p><strong>Date:</strong> {entry.date.toString()}</p> */}
            <p><strong>Material:</strong> {entry.material}</p>
            <p><strong>Test Type:</strong> {entry.test_type}</p>
            <p><strong>Props:</strong> {JSON.stringify(entry.props)}</p>
            <p><strong>Resin Type:</strong> {entry.resin_type}</p>
            <p><strong>Resin Matrix:</strong> {entry.resin_matrix}</p>
            <p><strong>Manufacturing Method:</strong> {entry.mfg_method}</p>
            <p><strong>Layup:</strong> {entry.layup.join(', ')}</p>
            <p><strong>Pictures:</strong> {entry.pictures.join(', ')}</p>
            <p><strong>Core Type:</strong> {entry.coretype}</p>
          </div>
        ))}
    </div>
  );
}

export default CardLayout;