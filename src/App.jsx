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
      ADVANCED_SEARCH_DATATYPES.test_type.values.add(entry.test_type ?? 'Any');
      ADVANCED_SEARCH_DATATYPES.resin_matrix.values.add(entry.resin_matrix ?? 'Any');
      ADVANCED_SEARCH_DATATYPES.core_type.values.add(entry.coretype ?? 'Any');
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
  test_num: {name: 'Test Number', type: ['number', 'number'], placeholder: ['Min', 'Max']},
  material: {name: 'Material', type: 'text', placeholder: 'Enter material'},
  date: {name: 'Date', type: ['date', 'date'], placeholder: ['Select start date', 'Select end date']},
  test_type: {name: 'Test Type', type: 'select', values: new Set(['Any']), placeholder: 'Select test type'},
  resin_type: {name: 'Resin Type', type: 'text', placeholder: 'Enter resin type'},
  resin_matrix: {name: 'Resin Matrix', type: 'select', values: new Set(['Any']), placeholder: 'Select resin matrix'},
  mfg_method: {name: 'Manufacturing Method', type: 'text', placeholder: 'Enter manufacturing method'},
  layup: {name: 'Layup', type: ['text'], placeholder: 'Enter layup', canAddEntries: true},
  core_type: {name: 'Core Type', type: 'select', values: new Set(['Any']), placeholder: 'Enter core type'},
}

function App() {
  const displayFormatter = useRef(null);
  const [selectedFormat, setSelectedFormat] = useState('card');
  const [selectedId, setSelectedId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);
  const [advancedSearch, setAdvancedSearch] = useState({
    test_num: ['', ''],
    material: '',
    date: ['', ''],
    test_type: '',
    resin_type: '',
    resin_matrix: '',
    mfg_method: '',
    layup: [''],
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
    const isArrayValue = Array.isArray(advancedSearch[key]);

    if (isArrayValue && !Array.isArray(value)) {
      value = [value];
    } else if (isArrayValue && Array.isArray(value)) {
      const canAddEntries = ADVANCED_SEARCH_DATATYPES[key].canAddEntries;
      if (!canAddEntries) { // ensure the value array does not exceed the original length
        value = value.slice(0, advancedSearch[key].length);
      } 
    }

    if (!isArrayValue && value.toLowerCase() === 'any') value = '';
    setAdvancedSearch((prev) => ({ ...prev, [key]: value }));
  };

  const clearAdvancedSearch = () => {
    setAdvancedSearch({
      test_num: ['', ''],
      material: '',
      date: ['', ''],
      test_type: '',
      resin_type: '',
      resin_matrix: '',
      mfg_method: '',
      layup: [''],
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
        filtered = filtered.filter((entry) => {
          if (key === 'date') {
            const [start, end] = value;
            const entryDate = new Date(entry[key]);
            if (start && entryDate < new Date(start)) return false;
            
            const endDate = (new Date(end)).setDate((new Date(end)).getDate() + 1);
            if (end && entryDate > endDate) return false;
            return true;
          } else if (key === 'test_num') {
            const [min, max] = value;
            const entryValue = Number(entry[key]);
            if (min && entryValue < Number(min)) return false;
            if (max && entryValue > Number(max)) return false;
            return true;
          } else if (key === 'layup') {
            /* method where order doesnt matter (save for later maybe idk)
            const entryLayers = String(entry[key]).toLowerCase();
            for (const layer of value) {
               if (!entryLayers.includes(layer.toLowerCase())) return false;
            }
            return true;
            */
            let layupIndex = 0;
            for (let i = 0; i < entry[key].length; i++) {
              layupIndex = 0;
              for (let j = 0; j < value.length; j++) {
                // if we've gone past the end of the entry's layup, break out of the loop
                if (i + layupIndex >= entry[key].length) break;

                const entryLayer = entry[key][i + layupIndex];
                const queryLayer = value[j];

                // when blank treat it as a match
                if (queryLayer.toLowerCase() === '') { layupIndex++; continue; }

                // if the entry layer includes the query layer, it matches
                if (entryLayer.toLowerCase().includes(queryLayer.toLowerCase())) { layupIndex++; continue; };
                break;
              }
              if (layupIndex === value.length) break;
            }

            // return true if all query layers matched in order 
            // ex. 90, _, _ looks for layups that have 90 followed by any two layers 
            // so like _, 90, _, _ would match
            return layupIndex === value.length;
          }
          return String(entry[key]).toLowerCase().includes(value.toLowerCase());
        });
      }
    }

    setFilteredData(filtered);
  }, [data, searchQuery, advancedSearch]);

  const activeAdvancedFilters = Object.values(advancedSearch).filter(Boolean).length;

  return (
    <div className="app-content">
      <div className="overlay-container" style={{ display: overlayDisplay }} onClick={overlayClick}>
        <div className="overlay-contents" onClick={stopPropagation}>
          {selectedId !== null && <InfoPage data={data} selectedId={selectedId} closeOverlay={overlayClick} />}
          {isFormOpen && <SubmitForm setIsFormOpen={setIsFormOpen} closeOverlay={overlayClick} />}
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
                  const type = data.type;
                  if (type === 'select') {
                    const options = Array.from(data.values);

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
                  
                  if (Array.isArray(data.type)) {
                    const isPlaceholderArray = Array.isArray(data.placeholder);
                    let placeholder = isPlaceholderArray ? data.placeholder : Array(data.type.length).fill(data.placeholder || '');
                    
                    const canAddEntries = data.canAddEntries || false;
                    let entries = data.type;
                    if (canAddEntries) {
                      entries = [...advancedSearch[key]];
                      placeholder = Array(entries.length).fill(data.placeholder || '');
                    }

                    return (
                      <label className="advanced-search-field" key={key}>
                        <span>{name}</span>
                        {entries.map((subType, index) => (
                          <input
                            key={index}
                            type={subType}
                            value={advancedSearch[key][index] || ''}
                            onChange={(e) => {
                              const newValue = [...advancedSearch[key]];
                              newValue[index] = e.target.value;
                              handleAdvancedChange(key, newValue);
                            }}
                            placeholder={placeholder[index] || ''}
                          />
                        ))}
                        {canAddEntries && (
                          <div className="unselectable">
                            <button
                              type="button"
                              onClick={() => {
                                const newValue = [...advancedSearch[key], ''];
                                handleAdvancedChange(key, newValue);
                              }}
                              className="add-button"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (advancedSearch[key].length === 1) return;
                                const newValue = [...advancedSearch[key]];
                                newValue.pop();
                                handleAdvancedChange(key, newValue);
                              }}
                              className={"remove-button" + (advancedSearch[key].length === 1 ? " disabled" : "")}
                            >
                              Remove
                            </button>
                          </div>
                        )}
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
