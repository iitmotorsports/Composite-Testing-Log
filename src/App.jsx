import { useEffect, useRef, useState } from 'react';

import CardLayout from './assets/CardLayout';
import TableLayout from './assets/TableLayout';

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
  let [selectedFormat, setSelectedFormat] = useState('card');

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

  return (
    <div className="app-content">
      <h1>Composite Testing Log</h1>
      <div className="submission-section">
        (submission WIP)
      </div>
      <div className="search-section">
        (search WIP)
      </div>
      <div className="log-container">
        <div id="log-display-formatter" className="unselectable" ref={displayFormatter}>
          <div id="card" className={selectedFormat === 'card' ? 'selected' : ''}>
            <p>Card</p>
          </div>
          <div id="table" className={selectedFormat === 'table' ? 'selected' : ''}>
            <p>Table</p>
          </div>
        </div>
        <div className="log-section">
          <div className="table-layout-container" style={{ display: selectedFormat === 'table' ? 'block' : 'none' }}>
            <TableLayout data={data} />
          </div>
          <div className="card-layout-container" style={{ display: selectedFormat === 'card' ? 'block' : 'none' }}>
            <CardLayout data={data} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
