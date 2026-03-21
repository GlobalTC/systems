import { useState, useEffect } from 'react';
import { Search, Hash, Sparkles, Layers, SearchCode, Menu, X } from 'lucide-react';
import './App.css';
import { searchQmd, semanticSearchQmd, deepSearchQmd } from './services/mcpClient';
import { DocumentViewer } from './components/DocumentViewer';

type SearchMode = 'keyword' | 'semantic' | 'deep';

function App() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchMode>('keyword');
  const [collection, setCollection] = useState<string | undefined>(undefined);

  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const collections = [
    { id: undefined, name: 'All Collections' },
    { id: 'opm', name: 'opm' },
    { id: 'leap-mcp', name: 'leap-mcp' },
    { id: 'luma-project', name: 'luma-project' },
    { id: 'mcpOS', name: 'mcpOS' },
    { id: 'leap-project', name: 'leap-project' },
    { id: 'leap-ai-org', name: 'leap-ai-org' },
    { id: 'desktop', name: 'desktop' },
    { id: 'agy', name: 'agy' },
  ];

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim()) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [query, mode, collection]);

  const performSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      let res;
      if (mode === 'keyword') {
        res = await searchQmd(query, collection);
      } else if (mode === 'semantic') {
        res = await semanticSearchQmd(query, collection);
      } else {
        res = await deepSearchQmd(query, collection);
      }

      // Parse text results from QMD (which returns markdown text, not JSON)
      const contentArr = res.content as { type: string, text?: string }[];
      const textContent = contentArr?.find(c => c.type === 'text');
      if (textContent && textContent.text) {
        // Example output: "#0ab416 75% path/to/file.md - Document Title"
        const lines = textContent.text.split('\n');
        const parsedResults: any[] = [];

        lines.forEach(line => {
          // Match lines starting with a 7-character hash, like "#0ab416"
          const match = line.match(/^#([a-fA-F0-9]{6})\s+(\d+%?)?\s*(.*?)\s+-\s+(.*)$/);
          if (match) {
            parsedResults.push({
              docId: `#${match[1]}`,       // e.g. #0ab416
              score: match[2] || '',       // e.g. 75%
              file: match[3],              // e.g. leap-project/kb/meta/best-practices-testing.md
              title: match[4]              // e.g. Best Practices: Testing
            });
          } else if (line.match(/^#([a-fA-F0-9]{6})\s+(.*)$/)) {
            // Fallback if no title hyphen
            const fallbackMatch = line.match(/^#([a-fA-F0-9]{6})\s+(.*)$/);
            if (fallbackMatch) {
              parsedResults.push({
                docId: `#${fallbackMatch[1]}`,
                file: fallbackMatch[2],
                title: fallbackMatch[2].split('/').pop()
              });
            }
          }
        });

        setResults(parsedResults);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Overlay for mobile */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span>Collections</span>
          <button className="close-sidebar-btn mobile-only" onClick={() => setIsSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>
        {collections.map(c => (
          <div
            key={c.id || 'all'}
            className={`sidebar-item ${collection === c.id ? 'active' : ''}`}
            onClick={() => {
              setCollection(c.id);
              setIsSidebarOpen(false);
            }}
          >
            <Layers size={14} />
            <span>{c.name}</span>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="search-header">
          <div className="header-topbar">
            <button className="menu-btn mobile-only" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="search-input-wrapper">
              <Search className="search-icon" size={18} />
              <input
                type="text"
                className="search-input"
                placeholder="Search QMD..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="search-controls">
            <label className="control-label">
              <input
                type="radio"
                name="searchMode"
                checked={mode === 'keyword'}
                onChange={() => setMode('keyword')}
              />
              <Hash size={14} /> Keyword
            </label>
            <label className="control-label">
              <input
                type="radio"
                name="searchMode"
                checked={mode === 'semantic'}
                onChange={() => setMode('semantic')}
              />
              <Sparkles size={14} /> Semantic
            </label>
            <label className="control-label">
              <input
                type="radio"
                name="searchMode"
                checked={mode === 'deep'}
                onChange={() => setMode('deep')}
              />
              <SearchCode size={14} /> Deep Search
            </label>
          </div>
        </div>

        <div className="results-area">
          {isSearching ? (
            <div className="loader-container">Searching...</div>
          ) : results.length > 0 ? (
            results.map((result: any, i: number) => (
              <div key={i} className="result-card" onClick={() => setSelectedDoc(result.file || result.docId)}>
                <h3 className="result-title">{result.title || result.file?.split('/').pop()}</h3>
                <div className="result-path">{result.file || result.docId}</div>
                {result.score && <div style={{ fontSize: '11px', color: 'var(--accent-color)', marginBottom: '8px' }}>Relevance: {result.score}</div>}
              </div>
            ))
          ) : query.trim() ? (
            <div className="empty-state">No results found for "{query}"</div>
          ) : (
            <div className="empty-state">
              <Search size={48} />
              <h2>Start typing to search your 837 documents</h2>
              <p>Powered by local ML models on your Mac</p>
            </div>
          )}
        </div>

        {selectedDoc && (
          <DocumentViewer file={selectedDoc} onClose={() => setSelectedDoc(null)} />
        )}
      </div>
    </div>
  )
}

export default App
