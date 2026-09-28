import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { apiRequest, fetchApps } from './api.js';
import { CATEGORIES, categoryCounts, filterApps } from './catalog.js';
import './app.css';
import '../../../apps/legacy/hub-ui.css';

const TOKEN_KEY = 'hub8.auth.token';

function formatClock(now) {
  return now.toLocaleTimeString('pt-BR');
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [user, setUser] = useState(null);
  const [apps, setApps] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState('');
  const [summaryError, setSummaryError] = useState('');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [selectedApp, setSelectedApp] = useState(null);
  const [shift, setShift] = useState('1');
  const [clock, setClock] = useState(() => new Date());
  const searchRef = useRef(null);

  const logout = useCallback(async (expired = false) => {
    const existingToken = localStorage.getItem(TOKEN_KEY);
    if (existingToken && !expired) {
      try {
        await apiRequest('/auth/logout', { method: 'POST', token: existingToken });
      } catch {
        // Clear the local session even if the API is unavailable during logout.
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setUser(null);
    setApps([]);
    setSummary(null);
    setSelectedApp(null);
    setError(expired ? 'Sua sessão expirou. Entre novamente.' : '');
    setLoading(false);
  }, []);

  const loadAuthenticatedData = useCallback(async (authToken) => {
    setLoading(true);
    setError('');
    setSummaryError('');
    try {
      const currentUser = await apiRequest('/auth/me', { token: authToken });
      setUser(currentUser);
      const [appList, summaryResult] = await Promise.all([
        fetchApps(authToken),
        apiRequest('/dashboard/summary', { token: authToken }).catch((cause) => {
          setSummaryError(cause.message);
          return null;
        }),
      ]);
      setApps(appList);
      setSummary(summaryResult);
      setCategoryId('all');
    } catch (cause) {
      if (cause.status === 401) {
        await logout(true);
      } else {
        setError(cause.message || 'Não foi possível carregar os aplicativos.');
      }
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    if (token) loadAuthenticatedData(token);
  }, [token, loadAuthenticatedData]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredApps = useMemo(
    () => filterApps(apps, query, categoryId),
    [apps, query, categoryId],
  );
  const counts = useMemo(() => categoryCounts(apps), [apps]);
  const visibleCategories = CATEGORIES.filter(({ id }) => counts.has(id));
  const displayName = user?.displayName || user?.DISPLAY_NAME || user?.username;

  const refresh = () => {
    if (token) loadAuthenticatedData(token);
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (selectedApp) setSelectedApp(null);
        else if (document.activeElement === searchRef.current && query) setQuery('');
      }
      if (
        event.key === '/' &&
        token &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [query, selectedApp, token]);

  if (!token) {
    return (
      <iframe
        className="legacy-preview"
        title="HUB temporário"
        src="./HUB_7_v3-2.html"
      />
    );
  }

  const openApp = (app) => {
    if (!app.url) {
      setError(`O aplicativo “${app.name}” não possui uma URL configurada.`);
      return;
    }
    try {
      const destination = new URL(app.url, window.location.href);
      if (!['http:', 'https:'].includes(destination.protocol)) throw new Error();
      setError('');
      setSelectedApp({ ...app, resolvedUrl: destination.href });
    } catch {
      setError(`A URL configurada para “${app.name}” não é válida.`);
    }
  };

  return (
    <>
      <header id="hdr">
        <div id="hdr-top">
          <div>
            <div id="setor-name">FAHRWERK</div>
            <div className="hdr-caption">Central de Apps · VW Taubaté</div>
          </div>
          <div className="hdr-right">
            <div id="clock">{formatClock(clock)}</div>
            <div id="hdate">{clock.toLocaleDateString('pt-BR', { dateStyle: 'full' })}</div>
          </div>
        </div>
        <div id="hdr-bot">
          <div id="staff">👤 Conectado: <strong>{displayName}</strong></div>
          {user && (
            <>
              <div className="tsel" role="group" aria-label="Selecionar turno">
                {['1', '2', '3'].map((value) => (
                  <button
                    type="button"
                    className={`tbtn${shift === value ? ' active' : ''}`}
                    aria-pressed={shift === value}
                    key={value}
                    onClick={() => setShift(value)}
                  >
                    {value}º
                  </button>
                ))}
              </div>
              <button type="button" className="logout-button" onClick={() => logout(false)}>Sair da sessão</button>
            </>
          )}
        </div>
      </header>

      <main id="scroll">
        <>
            <section className="hub-welcome" aria-label="Resumo dos aplicativos">
              <div>
                <div className="hub-eyebrow">Central de trabalho</div>
                <h1 className="hub-title">Tudo o que você precisa, em um só lugar.</h1>
                <p className="hub-description">Acesse os aplicativos e acompanhe as ferramentas do seu turno.</p>
              </div>
              <div className="hub-total" aria-live="polite">
                {apps.length} {apps.length === 1 ? 'aplicativo disponível' : 'aplicativos disponíveis'}
              </div>
            </section>

            {summary && <Summary summary={summary} />}
            {summaryError && <div className="summary-note">Resumo indisponível: {summaryError}</div>}
            {error && <ErrorBanner message={error} onDismiss={() => setError('')} />}

            <section className="hub-toolbar" aria-label="Busca e filtros de aplicativos">
              <div className="hub-toolbar-top">
                <label className="hub-search">
                  <span className="hub-search-icon" aria-hidden="true">⌕</span>
                  <input
                    ref={searchRef}
                    type="search"
                    id="hub-search"
                    placeholder="Buscar aplicativo..."
                    aria-label="Buscar aplicativo por nome ou descrição"
                    autoComplete="off"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape' && query) setQuery('');
                      if (event.key === 'Enter' && filteredApps[0]) openApp(filteredApps[0]);
                    }}
                  />
                </label>
                <div className="hub-results" aria-live="polite">
                  {loading ? 'Carregando aplicativos…' : `Mostrando ${filteredApps.length} de ${apps.length} aplicativos`}
                </div>
              </div>
              <div className="hub-filters" role="group" aria-label="Filtrar por categoria">
                <button
                  type="button"
                  className={`hub-filter${categoryId === 'all' ? ' active' : ''}`}
                  aria-pressed={categoryId === 'all'}
                  onClick={() => setCategoryId('all')}
                >
                  Todos <span className="filter-count">{apps.length}</span>
                </button>
                {visibleCategories.map((category) => (
                  <button
                    type="button"
                    className={`hub-filter${categoryId === category.id ? ' active' : ''}`}
                    aria-pressed={categoryId === category.id}
                    key={category.id}
                    onClick={() => setCategoryId(category.id)}
                  >
                    {category.label} <span className="filter-count">{counts.get(category.id)}</span>
                  </button>
                ))}
                {Array.from(counts.entries())
                  .filter(([id]) => !CATEGORIES.some((category) => category.id === id))
                  .map(([id, count]) => (
                    <button
                      type="button"
                      className={`hub-filter${categoryId === id ? ' active' : ''}`}
                      aria-pressed={categoryId === id}
                      key={id}
                      onClick={() => setCategoryId(id)}
                    >
                      {apps.find((app) => app.categoryId === id)?.categoryLabel || 'Outros'}
                      <span className="filter-count">{count}</span>
                    </button>
                  ))}
              </div>
            </section>

            {loading && <div className="loading-state" role="status">Carregando dados da sua conta…</div>}
            {!loading && error && apps.length === 0 && (
              <div className="error-state">
                <p>Não foi possível carregar os aplicativos.</p>
                <button type="button" className="actbtn" onClick={refresh}>Tentar novamente</button>
              </div>
            )}
            {!loading && apps.length > 0 && (
              <>
                <section id="grid" aria-label="Aplicativos disponíveis">
                  {filteredApps.map((app) => (
                    <button
                      type="button"
                      className="acard"
                      key={app.id || `${app.name}-${app.url}`}
                      onClick={() => openApp(app)}
                      aria-label={`Abrir ${app.name}`}
                    >
                      <span className="ac-icon">{app.icon}</span>
                      <span className="ac-name">{app.name}</span>
                      <span className="ac-sub">{app.subtitle || app.description || app.categoryLabel}</span>
                      <span className="card-category">{app.categoryLabel}</span>
                    </button>
                  ))}
                </section>
                {!filteredApps.length && (
                  <div className="hub-empty" role="status">
                    <div className="hub-empty-title">Nenhum aplicativo encontrado</div>
                    <div>Tente mudar a busca ou selecionar outra categoria.</div>
                  </div>
                )}
              </>
            )}

            <div id="bot-actions">
              <button type="button" className="actbtn refresh-button" onClick={refresh} disabled={loading}>
                🔄 Atualizar aplicativos
              </button>
              <span className="session-status">Sessão protegida pela API</span>
            </div>
          </>
      </main>

      <nav id="bot-nav" aria-label="Navegação principal">
        <button type="button" className="nbtn active" aria-current="page">
          <span className="ni" aria-hidden="true">⌂</span><span className="nl">Aplicativos</span>
        </button>
      </nav>

      {selectedApp && (
        <div className="viewer" role="dialog" aria-modal="true" aria-label={`Aplicativo: ${selectedApp.name}`}>
          <div className="viewer-bar">
            <span className="viewer-icon" aria-hidden="true">{selectedApp.icon}</span>
            <div className="viewer-info">
              <strong>{selectedApp.name}</strong>
              <span>{selectedApp.subtitle || selectedApp.categoryLabel}</span>
            </div>
            <button type="button" className="viewer-close" onClick={() => setSelectedApp(null)}>Voltar ao HUB</button>
          </div>
          <iframe
            key={selectedApp.resolvedUrl}
            title={selectedApp.name}
            src={selectedApp.resolvedUrl}
            className="app-frame"
            allow="clipboard-read; clipboard-write"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}
    </>
  );
}

function Summary({ summary }) {
  const values = [
    ['Aplicativos', summary.apps],
    ['Operadores', summary.operators],
    ['Operações', summary.operations],
    ['Turnos', summary.shifts],
  ];
  return (
    <section className="summary-cards" aria-label="Resumo da plataforma">
      {values.map(([label, value]) => (
        <div className="summary-card" key={label}>
          <span>{label}</span>
          <strong>{formatMetric(value)}</strong>
          {label === 'Aplicativos' && value?.ATIVOS !== undefined &&
            <small>{Number(value.ATIVOS)} ativos</small>}
        </div>
      ))}
    </section>
  );
}

function formatMetric(value) {
  if (value == null) return '—';
  const count = value.total ?? value.TOTAL ?? value.count ?? value.COUNT;
  return count === undefined ? '—' : Number(count).toLocaleString('pt-BR');
}

function ErrorBanner({ message, onDismiss }) {
  return (
    <div className="error-banner" role="alert">
      <span>{message}</span>
      <button type="button" aria-label="Fechar aviso" onClick={onDismiss}>×</button>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
