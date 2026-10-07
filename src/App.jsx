import { useEffect, useRef, useState } from 'react';

import CardLayout from './assets/CardLayout';
import TableLayout from './assets/TableLayout';
import InfoPage from './assets/InfoPage';
import SubmitForm from './assets/SubmitForm';

import './App.css';

const BASE = import.meta.env.BASE_URL;

function parseDate(str) {
  const [y, m, d] = String(str).split('-').map(Number);
  return new Date(y, m - 1, d);
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  return res.json();
}

async function loadTests() {
  const files = await fetchJson(`${BASE}tests/manifest.json`);

  const entries = await Promise.all(
    files.map(async (file) => {
      const entry = await fetchJson(`${BASE}tests/${file}`);
      return {
        ...entry,
        date: parseDate(entry.date),
        // stored as "tests/pics/test1/1-photo.png"; turn into a URL the <img> can use
        pictures: (entry.pictures ?? []).map((p) => `${BASE}${p}`),
      };
    })
  );

  return entries.sort((a, b) => a.test_num - b.test_num);
}

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

const ADVANCED_SEARCH_DATATYPES = {
  test_num: {name: 'Test Number', type: 'number', placeholder: 'Enter test number'},
  material: {name: 'Material', type: 'text', placeholder: 'Enter material'},
  date: {name: 'Date', type: 'date', placeholder: 'Enter date'},
  test_type: {name: 'Test Type', type: ['Any', 'Tension', 'Compression', 'Shear', 'Bending'], placeholder: 'Select test type'},
  resin_type: {name: 'Resin Type', type: 'text', placeholder: 'Enter resin type'},
  mfg_method: {name: 'Manufacturing Method', type: 'text', placeholder: 'Enter manufacturing method'},
  layup: {name: 'Layup', type: 'text', placeholder: 'Enter layup'},
  core_type: {name: 'Core Type', type: 'text', placeholder: 'Enter core type'},
}

function App() {
  const displayFormatter = useRef(null);
  const [selectedFormat, setSelectedFormat] = useState('card');
  const [selectedId, setSelectedId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);
  const [advancedSearch, setAdvancedSearch] = useState({
    test_num: '',
    material: '',
    date: '',
    test_type: '',
    resin_type: '',
    mfg_method: '',
    layup: '',
    core_type: '',
  });
  const canResetAdvancedSearch = Object.values(advancedSearch).some(value => value !== '');

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    if (!displayFormatter.current) return;

    const formatterElement = displayFormatter.current;

    for (const child of formatterElement.children) {
      child.addEventListener('click', () => {
        setSelectedFormat(child.id);
      });
    }
  }, [displayFormatter]);

  useEffect(() => {
    let cancelled = false;

    loadTests()
      .then((entries) => { if (!cancelled) setData(entries); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const overlayDisplay = selectedId !== null || isFormOpen ? 'flex' : 'none';
  const overlayClick = () => {
    setSelectedId(null);
    setIsFormOpen(false);
  };
  const stopPropagation = (e) => { e.stopPropagation(); };

  const handleAdvancedChange = (key, value) => {
    if (value.toLowerCase() === 'any') value = '';
    setAdvancedSearch((prev) => ({ ...prev, [key]: value }));
  };

  const clearAdvancedSearch = () => {
    setAdvancedSearch({
      test_num: '',
      material: '',
      date: '',
      test_type: '',
      resin_type: '',
      mfg_method: '',
      layup: '',
      core_type: '',
    });
  };

  useEffect(() => {
    let filtered = data;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((entry) =>
        String(entry.test_num).toLowerCase().includes(query) ||
        String(entry.material).toLowerCase().includes(query) ||
        String(entry.date).toLowerCase().includes(query)
      );
    }

    for (const [key, value] of Object.entries(advancedSearch)) {
      if (value) {
        filtered = filtered.filter((entry) =>
          String(entry[key]).toLowerCase().includes(value.toLowerCase())
        );
      }
    }

    setFilteredData(filtered);
  }, [data, searchQuery, advancedSearch]);

  const activeAdvancedFilters = Object.values(advancedSearch).filter(Boolean).length;

  return (
    <div className="app-content">
      <div className="overlay-container" style={{ display: overlayDisplay }} onClick={overlayClick}>
        <div className="overlay-contents" onClick={stopPropagation}>
          {selectedId !== null && <InfoPage data={data} selectedId={selectedId} />}
          {isFormOpen && <SubmitForm setIsFormOpen={setIsFormOpen} />}
        </div>
      </div>
      <header className="top-bar unselectable">
        <h1><img src="favicon.png" style={{ verticalAlign: 'middle', borderRadius: '4px', transform: 'translateY(-2px)' }} height={32} alt="Logo"></img> Composite Testing Log</h1>
        <div className="submission-btn">
          <button onClick={() => setIsFormOpen(true)}>Submit New Entry</button>
        </div>
      </header>
      <main className="page-content">
        <p>
          Welcome to the Composite Testing Log. Here you can view and submit entries related to composite testing.
        </p>
        <div className="log-container">

          <div id="log-display-formatter" className="unselectable" ref={displayFormatter}>
            <button id="card" className={selectedFormat === 'card' ? 'selected' : ''}>
              Card
            </button>
            <button id="table" className={selectedFormat === 'table' ? 'selected' : ''}>
              Table
            </button>
          </div>

          <div className="search-panel" aria-label="Search tests">
            <div className="search-input-row">
              <button
                type="button"
                className="advanced-search-button"
                title="Advanced search"
                onClick={() => setAdvancedSearchOpen((prev) => !prev)}
                aria-expanded={advancedSearchOpen}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M4 4h16l-6 8v7l-4 2v-9L4 4z" />
                  <path d="M7 8h10" />
                  <path d="M9 12h6" />
                </svg>
              </button>

              <label className="search-field">
                <span className="search-icon unselectable" aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by number, material, or date"
                  aria-label="Search tests"
                />
              </label>

              <button
                type="button"
                className="clear-search unselectable"
                onClick={() => setSearchQuery('')}
                disabled={!searchQuery}
              >
                Clear
              </button>
            </div>

            <div className={`advanced-search-container ${advancedSearchOpen ? 'open' : ''}`}>
              <div className="advanced-search-grid">
                {Object.entries(ADVANCED_SEARCH_DATATYPES).map(([key, data]) => {
                  const name = data.name;
                  let type = data.type;
                  if (Array.isArray(data.type)) {
                    let options = data.type;
                    type = "dropdown";

                    return (
                      <label className="advanced-search-field" key={key}>
                        <span>{name}</span>
                        <select
                          value={advancedSearch[key]}
                          onChange={(e) => handleAdvancedChange(key, e.target.value)}
                        >
                          {options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  }
                  
                  return (
                    <label className="advanced-search-field" key={key}>
                      <span>{name}</span>
                      <input
                        type={type}
                        value={advancedSearch[key]}
                        onChange={(e) => handleAdvancedChange(key, e.target.value)}
                        placeholder={data.placeholder || ''}
                      />
                    </label>
                  );
                })}
              </div>
              <div className="advanced-search-actions unselectable">
                <button type="button" className={`reset-button ${canResetAdvancedSearch ? '' : 'disabled'}`} onClick={clearAdvancedSearch}>
                  Reset filters
                </button>
                <button type="button" className="apply-button" onClick={() => setAdvancedSearchOpen(false)}>
                  Apply filters
                </button>
              </div>
            </div>

          </div>

          <div className="log-section">
            <div className="table-layout-container" style={{ display: selectedFormat === 'table' ? 'block' : 'none' }}>
              <TableLayout data={filteredData} setSelectedId={setSelectedId} />
            </div>
            <div className="card-layout-container" style={{ display: selectedFormat === 'card' ? 'block' : 'none' }}>
              <CardLayout data={filteredData} setSelectedId={setSelectedId} />
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

export default App
