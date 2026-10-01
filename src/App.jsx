import { useEffect, useRef, useState } from 'react';

import CardLayout from './assets/CardLayout';
import TableLayout from './assets/TableLayout';
import InfoPage from './assets/InfoPage';
import SubmitForm from './assets/SubmitForm';

import './App.css';

function createPlaceholderEntry() {
  /* 
  {
  test_num: int,
  date: string,
  material: string,
  test_type: ENUM,
  props: obj,
  resin_type: string,
  resin_matrix: ENUM,
  mfg_method: string,
  layup: string[],
  pictures: string[],
  coretype: ENUM ? string
  }
  */
  return {
    test_num: 0,
    date: new Date(),
    material: 'Material',
    test_type: 'test_type (enum)',
    props: {},
    resin_type: 'resin_type',
    resin_matrix: 'resin_matrix (enum)',
    mfg_method: 'mfg_method',
    layup: [
      'layup1', 
      'layup2'
    ],
    pictures: [
      'path/to/picture1',
      'path/to/picture2'
    ],
    coretype: 'coretype (enum)'
  };
}

function App() {
  const displayFormatter = useRef(null);
  const [selectedFormat, setSelectedFormat] = useState('card');
  const [selectedId, setSelectedId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    if (!displayFormatter.current) return;

    const formatterElement = displayFormatter.current;
    
    for (const child of formatterElement.children) {
      child.addEventListener('click', () => {
        setSelectedFormat(child.id);
      });
    }
  }, [displayFormatter]);

  const data = [
    createPlaceholderEntry(),
    createPlaceholderEntry(),
    createPlaceholderEntry(),
    createPlaceholderEntry(),
  ];

  const overlayDisplay = selectedId !== null || isFormOpen ? 'flex' : 'none';
  const overlayClick = () => {
    setSelectedId(null);
    setIsFormOpen(false);
  };
  const stopPropagation = (e) => { e.stopPropagation(); };

  return (
    <div className="app-content">
      <div className="overlay-container" style={{ display: overlayDisplay }} onClick={overlayClick}>
        <div onClick={stopPropagation}>
          { selectedId !== null && <InfoPage selectedId={selectedId} setSelectedId={setSelectedId} /> }
          { isFormOpen && <SubmitForm setIsFormOpen={setIsFormOpen} /> }
        </div>
      </div>
      <h1>Composite Testing Log</h1>
      <div className="submission-btn">
        <button onClick={() => setIsFormOpen(true)}>Submit New Entry</button>
      </div>
      <div className="search-bar">
        (search WIP)
      </div>
      <div className="log-container">
        <div id="log-display-formatter" className="unselectable" ref={displayFormatter}>
          <button id="card" className={selectedFormat === 'card' ? 'selected' : ''}>
            Card
          </button>
          <button id="table" className={selectedFormat === 'table' ? 'selected' : ''}>
            Table
          </button>
        </div>
        <div className="log-section">
          <div className="table-layout-container" style={{ display: selectedFormat === 'table' ? 'block' : 'none' }}>
            <TableLayout data={data} setSelectedId={setSelectedId} />
          </div>
          <div className="card-layout-container" style={{ display: selectedFormat === 'card' ? 'block' : 'none' }}>
            <CardLayout data={data} setSelectedId={setSelectedId} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
