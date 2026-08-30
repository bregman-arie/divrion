import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Bell, ChevronDown, CircleHelp, Compass, FileUp, Landmark, LayoutDashboard, Plus, Search, Settings, ShieldCheck, SlidersHorizontal, TrendingUp, Wallet, X } from 'lucide-react';
import './styles.css';

const holdings = [
  { symbol: 'SCHD', name: 'Schwab U.S. Dividend Equity', value: 18420, yield: 3.82, income: 703.64, color: '#6e5af7' },
  { symbol: 'VYM', name: 'Vanguard High Dividend Yield', value: 12680, yield: 2.86, income: 362.65, color: '#31bb92' },
  { symbol: 'O', name: 'Realty Income Corp.', value: 7950, yield: 5.39, income: 428.51, color: '#f5a742' },
  { symbol: 'DGRO', name: 'iShares Core Dividend Growth', value: 6500, yield: 2.24, income: 145.60, color: '#4d9df2' },
];
const recommendations = [
  { symbol: 'VIG', name: 'Vanguard Dividend Appreciation', yield: '1.7%', growth: '10.2%', tag: 'Dividend growth', sector: 'Broad market', reason: 'Strong five-year dividend growth for a long-term income plan.', color: '#7a67fa' },
  { symbol: 'JEPI', name: 'JPMorgan Equity Premium Income', yield: '7.8%', growth: '4.1%', tag: 'High income', sector: 'Broad market', reason: 'High distribution yield to accelerate current income coverage.', color: '#d18bff' },
  { symbol: 'XLV', name: 'Health Care Select Sector', yield: '1.4%', growth: '8.6%', tag: 'Healthcare', sector: 'Healthcare', reason: 'Healthcare exposure that supports your selected sector preference.', color: '#43c6a1' },
];
const defaultExpenses = [
  { id: 'home', label: 'Housing', amount: 1050 },
  { id: 'life', label: 'Living & food', amount: 650 },
  { id: 'transport', label: 'Transport', amount: 400 },
];
const defaultPortfolios = [
  { id: 'income-core', name: 'Income Core', holdings },
  { id: 'growth-income', name: 'Growth & Income', holdings: [
    { symbol: 'VIG', name: 'Vanguard Dividend Appreciation', value: 9200, yield: 1.7, income: 156.4, color: '#7a67fa' },
    { symbol: 'XLV', name: 'Health Care Select Sector', value: 5400, yield: 1.4, income: 75.6, color: '#43c6a1' },
  ] },
];
const demoMode = new URLSearchParams(window.location.search).has('demo') || import.meta.env.VITE_DEMO === 'true';
const emptyPortfolios = [{ id: 'my-portfolio', name: 'My Portfolio', holdings: [] }];
const pagePaths = { Overview: '/', 'Income plan': '/income-plan', Portfolio: '/portfolio', Discover: '/discover', 'Data sources': '/data-sources' };
const pageFromPath = path => Object.entries(pagePaths).find(([, value]) => value === path)?.[0] || 'Overview';

const csvRows = text => {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/).filter(Boolean);
  const cells = line => { const values = []; let value = ''; let quoted = false; for (let i = 0; i < line.length; i += 1) { if (line[i] === '"') { if (quoted && line[i + 1] === '"') { value += '"'; i += 1; } else quoted = !quoted; } else if (line[i] === ',' && !quoted) { values.push(value.trim()); value = ''; } else value += line[i]; } values.push(value.trim()); return values; };
  const [header, ...records] = lines.map(cells); return records.map(record => Object.fromEntries(header.map((key, index) => [key, record[index] || ''])));
};
const lookup = (record, keys) => { const normalized = Object.fromEntries(Object.entries(record).map(([key, value]) => [key.toLowerCase().replace(/[^a-z0-9]/g, ''), value])); return keys.map(key => normalized[key]).find(value => value !== undefined) || ''; };
const numberValue = value => Number(String(value).replace(/[$,%\s,]/g, '')) || 0;
const parseImportedFile = (text, filename) => {
  const raw = filename.toLowerCase().endsWith('.json') ? JSON.parse(text) : csvRows(text);
  const records = Array.isArray(raw) ? raw : raw.portfolios ? raw.portfolios.flatMap(group => group.holdings.map(item => ({ ...item, portfolio: group.name }))) : raw.holdings || [];
  const isDivTracker = records.some(record => Object.prototype.hasOwnProperty.call(record, 'Quantity (Adjusted)') && Object.prototype.hasOwnProperty.call(record, 'Cost Per Share (Adjusted)'));
  if (isDivTracker) {
    const holdings = Object.values(records.reduce((items, record) => {
      const symbol = String(record.Ticker || '').toUpperCase(); if (!symbol) return items;
      const quantity = numberValue(record['Quantity (Adjusted)']);
      const cost = numberValue(record['Cost Per Share (Adjusted)']);
      items[symbol] ||= { symbol, name: symbol, quantity: 0, value: 0, yield: 0, income: 0, color: '#6e5af7', simulated: false };
      items[symbol].quantity += quantity;
      items[symbol].value += quantity * cost;
      return items;
    }, {}));
    if (!holdings.length) throw new Error('No DivTracker tickers were found.');
    return [{ name: 'DivTracker import', holdings, note: 'DivTracker transaction history was aggregated by ticker. Values shown are cost basis, not live market values.' }];
  }
  const normalized = records.map(record => {
    const symbol = lookup(record, ['symbol', 'ticker']);
    const value = numberValue(lookup(record, ['marketvalue', 'value', 'currentvalue', 'equity', 'totalvalue']));
    const yieldValue = numberValue(lookup(record, ['dividendyield', 'yield', 'yieldpercent', 'annualyield']));
    const income = numberValue(lookup(record, ['annualincome', 'dividendincome', 'income'])) || value * yieldValue / 100;
    const quantity = numberValue(lookup(record, ['quantity', 'shares', 'units', 'sharequantity']));
    return { portfolio: lookup(record, ['portfolio', 'account', 'accountname']) || 'Imported portfolio', holding: { symbol: String(symbol).toUpperCase(), name: lookup(record, ['name', 'security', 'description', 'company']) || String(symbol).toUpperCase(), value, quantity, yield: yieldValue, income, color: '#6e5af7', simulated: false } };
  }).filter(item => item.holding.symbol);
  if (!normalized.length) throw new Error('No recognizable holdings were found. Include a Symbol or Ticker column.');
  return Object.entries(normalized.reduce((groups, item) => { const key = item.portfolio; groups[key] ||= []; groups[key].push(item.holding); return groups; }, {})).map(([name, holdings]) => ({ name, holdings }));
};

function DiscoverCards({ filter, setFilter, addHolding, full = false }) {
  const [minimumYield, setMinimumYield] = useState(0);
  const [sector, setSector] = useState('Any sector');
  const visible = recommendations.filter(r => (filter === 'All' || (filter === 'High yield' && r.tag === 'High income') || (filter === 'Growth' && r.tag === 'Dividend growth') || (filter === 'Sectors' && r.tag === 'Healthcare')) && Number.parseFloat(r.yield) >= minimumYield && (sector === 'Any sector' || r.sector === sector));
  return <section className="panel recommendations"><div className="panel-heading"><div><h2>Discover your next income investment</h2><p>Hand-picked to match your plan and preferences</p></div><div className="filter-group">{['All','High yield','Growth','Sectors'].map(f=><button key={f} className={filter===f?'selected':''} onClick={()=>setFilter(f)}>{f}</button>)}</div></div>{full && <div className="discovery-controls"><label>Minimum dividend yield <div className="input-prefix"><input type="number" min="0" max="15" step=".1" value={minimumYield} onChange={event=>setMinimumYield(Number(event.target.value))}/><em>%</em></div></label><label>Sector <select value={sector} onChange={event=>setSector(event.target.value)}><option>Any sector</option><option>Broad market</option><option>Healthcare</option></select></label><p>{visible.length} matching idea{visible.length === 1 ? '' : 's'}</p></div>}<div className="rec-grid">{visible.map(r=><article className="rec" key={r.symbol}><div className="rec-head"><div className="ticker" style={{background:r.color}}>{r.symbol.slice(0,2)}</div><button className="icon-button" onClick={()=>addHolding(r)}><Plus size={17}/></button></div><h3>{r.symbol}</h3><p>{r.name}</p><span className="tag">{r.tag}</span><div className="rec-stats"><div><span>Dividend yield</span><b>{r.yield}</b></div><div><span>5y div. growth</span><b>{r.growth}</b></div></div><div className="recommendation-reason"><span>Why it matches</span><p>{r.reason}</p></div><button className="add-button" onClick={()=>addHolding(r)}>{full ? 'Add & see impact' : 'Add to simulation'}</button></article>)}{!visible.length && <div className="discover-empty"><Search size={20}/><h3>No matching ideas yet</h3><p>Try lowering the minimum yield or broadening your sector preference.</p></div>}</div></section>
}

function PortfolioScreen({ portfolio, totalValue, annualIncome, overallYield, removeHolding, openHoldingForm, openImport, simulateSuggested, exportPortfolio, deletePortfolio, selectedPortfolioId, portfolioName, canDeletePortfolio, openDataSources }) {
  const [investmentAmount, setInvestmentAmount] = useState(1000);
  const lowestYield = portfolio.length ? portfolio.reduce((lowest, item) => item.yield < lowest.yield ? item : lowest) : null;
  const suggested = recommendations.find(item => item.symbol === 'JEPI');
  const missingYieldCount = portfolio.filter(item => !Number(item.yield)).length;
  return <div className="screen-stack"><section className="stats-grid">{[['Portfolio value', `$${totalValue.toLocaleString()}`], ['Annual income', `$${annualIncome.toFixed(0)}`], ['Blended yield', `${overallYield.toFixed(2)}%`], ['Holdings', portfolio.length]].map(([label,value])=><div className="mini-stat" key={label}><span>{label}</span><b>{value}</b></div>)}</section><section className="panel holdings-panel"><div className="panel-heading"><div><h2>Income portfolio</h2><p>Model how each holding changes your income engine</p></div><div className="portfolio-actions"><button className="ghost" onClick={openImport}><FileUp size={13}/>Import</button><button className="ghost" onClick={exportPortfolio}>Export CSV</button><button className="primary" onClick={openHoldingForm}><Plus size={16}/>Add holding</button></div></div>{missingYieldCount > 0 && <div className="yield-callout"><span>{missingYieldCount} holding{missingYieldCount === 1 ? '' : 's'} need dividend-yield data.</span><button onClick={openDataSources}>Connect market data →</button></div>}<div className="holdings-table">{portfolio.length ? <><div className="holding-row heading"><span>Investment</span><span>Market value</span><span>Yield</span><span>Annual income</span><span/></div>{portfolio.map(h=><div className="holding-row" key={`${h.portfolioId}-${h.symbol}`}><div className="investment"><div className="ticker" style={{background:h.color}}>{h.symbol.slice(0,2)}</div><span><b>{h.symbol}{h.simulated && <i className="simulated-badge">Simulated</i>}</b><em>{h.name}{h.portfolioName && ` · ${h.portfolioName}`}</em></span></div><span>${h.value.toLocaleString()}</span><span>{Number(h.yield) ? `${h.yield}%` : <button className="missing-yield" onClick={openDataSources}>Add yield</button>}</span><strong>{Number(h.yield) ? `$${h.income.toFixed(0)}` : '—'}</strong><button className="remove" onClick={()=>removeHolding(h.symbol, h.portfolioId)}>Remove</button></div>)}</> : <div className="empty-state"><div>＋</div><h3>Your portfolio is ready for its first holding.</h3><p>Add an ETF or stock manually, import a file, or use Discover to start an income simulation.</p><span><button className="primary" onClick={openImport}>Import portfolio</button><button className="ghost" onClick={openHoldingForm}>Add holding</button></span></div>}</div>{selectedPortfolioId !== 'combined' && <div className="portfolio-danger"><span>Managing {portfolioName}</span>{canDeletePortfolio && <button onClick={deletePortfolio}>Delete portfolio</button>}</div>}</section><section className="panel tuneup-panel"><div className="panel-heading"><div><p className="eyebrow">PORTFOLIO TUNE-UP</p><h2>Use your next investment intentionally.</h2></div><label className="amount-input">Investment amount <div className="input-prefix"><span>$</span><input type="number" min="0" value={investmentAmount} onChange={event=>setInvestmentAmount(Number(event.target.value))}/></div></label></div><div className="tuneup-grid"><div><span className="tuneup-label">Consider adding</span><h3>{suggested.symbol}</h3><p>${investmentAmount.toLocaleString()} at {suggested.yield} could add about <strong>${(investmentAmount * Number.parseFloat(suggested.yield) / 100).toFixed(0)}/yr</strong> in estimated income.</p><span className="tag">Higher yield</span><button className="simulate-button" onClick={()=>simulateSuggested(investmentAmount)}>Simulate ${investmentAmount.toLocaleString()} in {suggested.symbol}</button></div><div><span className="tuneup-label">Review exposure</span><h3>{lowestYield ? lowestYield.symbol : '—'}</h3><p>{lowestYield ? `${lowestYield.symbol} has the lowest current yield (${lowestYield.yield}%). Compare its role before adding more capital.` : 'Add holdings to receive portfolio-specific observations.'}</p><span className="tag subtle">Portfolio balance</span></div></div><p className="advice-note">Illustrative portfolio observations, not investment advice.</p></section></div>
}

function HoldingModal({ onClose, onSave }) {
  const [draft, setDraft] = useState({ symbol: '', name: '', value: 2500, quantity: '', yield: 4 });
  const change = key => event => setDraft(current => ({ ...current, [key]: event.target.value }));
  const submit = event => { event.preventDefault(); onSave({ ...draft, symbol: draft.symbol.toUpperCase(), value: Number(draft.value), quantity: Number(draft.quantity) || 0, yield: Number(draft.yield) }); };
  return <div className="modal-backdrop"><form className="modal holding-modal" onSubmit={submit}><button type="button" className="close" onClick={onClose}><X/></button><p className="eyebrow">PORTFOLIO SIMULATION</p><h2>Add a holding</h2><p className="modal-intro">Use an estimated market value and annual dividend yield to model its income impact. Add shares to make it ready for a market refresh later.</p><div className="field-grid"><label>Symbol<input required maxLength="8" placeholder="e.g. SCHD" value={draft.symbol} onChange={change('symbol')}/></label><label>Annual yield<input required type="number" min="0" step="0.01" value={draft.yield} onChange={change('yield')}/></label></div><label>Investment name<input required placeholder="e.g. Schwab U.S. Dividend Equity ETF" value={draft.name} onChange={change('name')}/></label><div className="field-grid"><label>Market value <div className="input-prefix"><span>$</span><input required type="number" min="0" value={draft.value} onChange={change('value')}/></div></label><label>Shares <input type="number" min="0" step="any" placeholder="Optional" value={draft.quantity} onChange={change('quantity')}/></label></div><div className="income-preview"><span>Estimated annual income</span><b>${(Number(draft.value || 0) * Number(draft.yield || 0) / 100).toFixed(2)}</b></div><button className="primary full" type="submit">Add to portfolio</button></form></div>
}

function ImportModal({ onClose, onImport }) {
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState('');
  const loadFile = event => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { setPreview(parseImportedFile(String(reader.result), file.name)); setError(''); } catch (err) { setPreview([]); setError(err.message || 'Unable to read this file.'); } };
    reader.readAsText(file);
  };
  const count = preview.reduce((sum, group) => sum + group.holdings.length, 0);
  return <div className="modal-backdrop"><div className="modal import-modal"><button className="close" onClick={onClose}><X/></button><p className="eyebrow">IMPORT PORTFOLIO DATA</p><h2>Bring your holdings into Divrion</h2><p className="modal-intro">Upload CSV or JSON from a broker, spreadsheet, or another tracker. Recognized fields include Symbol/Ticker, Name, Market Value, Yield, Income, Portfolio, and Account.</p><label className="file-picker"><FileUp size={19}/><span>Choose a CSV or JSON file</span><input type="file" accept=".csv,.json,text/csv,application/json" onChange={loadFile}/></label>{error && <p className="import-error">{error}</p>}{preview.length > 0 && <div className="import-preview"><span>Ready to import</span><b>{count} holding{count === 1 ? '' : 's'} across {preview.length} portfolio{preview.length === 1 ? '' : 's'}</b><div>{preview.map(group => <p key={group.name}><strong>{group.name}</strong><span>{group.holdings.map(item => item.symbol).join(', ')}</span></p>)}</div>{preview[0].note && <small>{preview[0].note}</small>}</div>}<button className="primary full" disabled={!preview.length} onClick={()=>{ onImport(preview); onClose(); }}>Import {count || ''} holdings</button></div></div>
}

function DataSourcesScreen({ config, saveConfig, refreshMarketData, refreshing, selectedName, holdingsWithQuantity, providerUpdatedAt, portfolioSize }) {
  const [provider, setProvider] = useState(config.provider || 'alpha-vantage');
  const [key, setKey] = useState(config.apiKey || '');
  const [secret, setSecret] = useState(config.apiSecret || '');
  const [saved, setSaved] = useState(false);
  const isAlpaca = provider === 'alpaca';
  const save = () => { saveConfig({ provider, apiKey: key.trim(), apiSecret: secret.trim() }); setSaved(true); };
  const refreshedLabel = providerUpdatedAt ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(providerUpdatedAt)) : 'Not refreshed yet';
  return <div className="screen-stack"><section className="panel source-hero"><p className="eyebrow">FREE-FIRST, SOURCE-AWARE</p><h2>Build on transparent data.</h2><p>Divrion keeps your calculations local, makes every refresh traceable, and lets you add a provider only when you need richer or faster market data.</p></section><section className="source-ledger"><article className="panel source-ledger-card"><Landmark size={18}/><div><span>Official-source foundation</span><b>Issuer announcements + SEC filings</b><p>Best for confirmed US dividend events and company disclosures. This is the intended free public-data layer for a future Divrion backend.</p></div><em>Backend-ready</em></article><article className="panel source-ledger-card"><ShieldCheck size={18}/><div><span>Your portfolio</span><b>{portfolioSize} holding{portfolioSize === 1 ? '' : 's'} · local only</b><p>Imports and calculations stay in this browser unless you connect your own market-data key.</p></div><em>Private</em></article></section><section className="source-layout"><div className="panel source-config"><div className="panel-heading"><div><h2>Optional market-data connection</h2><p>Use your own provider subscription for price and yield enrichment.</p></div><span className={config.apiKey ? 'connection-status connected' : 'connection-status'}>{config.apiKey ? 'Configured' : 'Not connected'}</span></div><label>Provider<select value={provider} onChange={event=>{setProvider(event.target.value);setSaved(false);}}><option value="alpha-vantage">Alpha Vantage</option><option value="alpaca">Alpaca Market Data</option></select></label><p className="field-help">{isAlpaca ? 'Alpaca refreshes US stock and ETF prices and uses cash-dividend corporate actions to calculate trailing yield.' : 'Prices and dividend yield are refreshed from your provider. Coverage, freshness, and rate limits depend on its plan.'}</p><label>{isAlpaca ? 'Alpaca API key ID' : 'API key'}<input type="password" placeholder={isAlpaca ? 'Paste your Alpaca key ID' : 'Paste your Alpha Vantage API key'} value={key} onChange={event=>{setKey(event.target.value);setSaved(false);}}/></label>{isAlpaca && <label>Alpaca secret key<input type="password" placeholder="Paste your Alpaca secret key" value={secret} onChange={event=>{setSecret(event.target.value);setSaved(false);}}/></label>}<button className="primary" onClick={save} disabled={!key.trim() || (isAlpaca && !secret.trim())}>{saved ? 'Saved locally' : 'Save connection'}</button><p className="field-help">The keys are saved only in this browser. Use keys dedicated to Divrion.</p></div><div className="panel refresh-panel"><p className="eyebrow">MARKET REFRESH</p><h2>Refresh {selectedName}</h2><p>{holdingsWithQuantity} of {portfolioSize} holding{portfolioSize === 1 ? '' : 's'} include share quantities and are ready for price-based valuation.</p><button className="primary full" disabled={!config.apiKey || (config.provider === 'alpaca' && !config.apiSecret) || !holdingsWithQuantity || refreshing} onClick={refreshMarketData}>{refreshing ? 'Refreshing market data…' : 'Refresh market data'}</button><p className="source-note">Last provider refresh: <strong>{refreshedLabel}</strong></p></div></section><section className="panel source-support"><h2>How Divrion treats your data</h2><div><span>1</span><p><strong>Imported values</strong> are your source of truth until a market refresh is run.</p></div><div><span>2</span><p><strong>Provider values</strong> update price, calculated value, yield, and estimated annual income.</p></div><div><span>3</span><p><strong>Dividend dates</strong> should be confirmed from issuer announcements; future dates are never guaranteed.</p></div></section></div>
}

function IncomePlanScreen({ goal, setGoal, monthly, setMonthly, risk, setRisk, expenses, expenseItems, setExpenseItems, coverage, monthlyIncome }) {
  const [cadence, setCadence] = useState('Monthly');
  const [sectors, setSectors] = useState(['Healthcare', 'Financials']);
  const annualYield = risk === 'Conservative' ? .032 : risk === 'Balanced' ? .041 : .048;
  const goalValue = cadence === 'Yearly' ? goal * 12 : cadence === 'Daily' ? goal / 30 : goal;
  const updateGoal = value => setGoal(cadence === 'Yearly' ? value / 12 : cadence === 'Daily' ? value * 30 : value);
  const years = Math.max(1, Math.ceil((goal * 12 * 10) / (monthly * 12 * annualYield + 1)) / 10);
  const forecast = [0, 1, 2, 3, 4].map(year => ({ year, income: monthlyIncome + monthly * year * annualYield * 1.35 }));
  const forecastMax = Math.max(goal, ...forecast.map(x => x.income));
  const updateExpense = (id, amount) => setExpenseItems(items => items.map(item => item.id === id ? { ...item, amount: Number(amount) } : item));
  const addExpense = () => setExpenseItems(items => [...items, { id: crypto.randomUUID(), label: 'New expense', amount: 0 }]);
  return <div className="screen-stack"><section className="plan-hero panel"><div><p className="eyebrow">BUILD YOUR ROADMAP</p><h2>Make your income goal actionable.</h2><p>Adjust your target and contribution to see the path ahead.</p></div><div className="plan-figure"><b>{years.toFixed(1)} yrs</b><span>to target</span></div></section><section className="plan-layout"><div className="panel form-panel"><h2>Your targets</h2><div className="cadence-tabs">{['Monthly','Yearly','Daily'].map(x=><button key={x} className={cadence===x?'selected':''} onClick={()=>setCadence(x)}>{x}</button>)}</div><label>{cadence} income goal <div className="input-prefix"><span>$</span><input type="number" value={Math.round(goalValue)} onChange={e=>updateGoal(Number(e.target.value))}/><em>/ {cadence.toLowerCase().replace('ly','')}</em></div></label><label>Monthly investment <div className="input-prefix"><span>$</span><input type="number" value={monthly} onChange={e=>setMonthly(Number(e.target.value))}/><em>/ month</em></div></label><label>Risk profile <div className="risk-options">{['Conservative','Balanced','Growth'].map(x=><button key={x} className={risk===x?'selected':''} onClick={()=>setRisk(x)}>{x}</button>)}</div></label><label>Preferred sectors <div className="sector-chips">{['Healthcare','Financials','Utilities','Technology'].map(sector=><button key={sector} className={sectors.includes(sector)?'selected':''} onClick={()=>setSectors(current=>current.includes(sector)?current.filter(x=>x!==sector):[...current,sector])}>{sector}</button>)}</div></label></div><div className="panel expense-panel"><div className="panel-heading"><div><p className="eyebrow">EXPENSE COVERAGE</p><h2>Monthly expenses</h2></div><button className="ghost" onClick={addExpense}>+ Add category</button></div><p>Track the recurring costs your portfolio is designed to cover.</p><div className="expense-list">{expenseItems.map(item=><div key={item.id}><input aria-label="Expense category" value={item.label} onChange={event=>setExpenseItems(items=>items.map(current=>current.id===item.id?{...current,label:event.target.value}:current))}/><span>$<input aria-label={`${item.label} amount`} type="number" min="0" value={item.amount} onChange={event=>updateExpense(item.id,event.target.value)}/></span><button aria-label={`Remove ${item.label}`} onClick={()=>setExpenseItems(items=>items.filter(current=>current.id!==item.id))}>×</button></div>)}</div><div className="expense-total"><span>Total monthly expenses</span><b>${expenses.toLocaleString()}</b></div><div className="coverage-summary"><b>{coverage}%</b><span>${monthlyIncome.toFixed(0)} of ${expenses.toLocaleString()} covered</span></div></div></section><section className="panel forecast-panel"><div className="panel-heading"><div><p className="eyebrow">PROJECTED MONTHLY INCOME</p><h2>Your four-year income runway</h2></div><b className="forecast-yield">{(annualYield * 100).toFixed(1)}% target yield</b></div><div className="forecast-chart">{forecast.map(point=><div className="forecast-column" key={point.year}><div className="forecast-value">${point.income.toFixed(0)}</div><div className="forecast-bar-wrap"><i className="forecast-goal" style={{bottom:`${goal/forecastMax*100}%`}}/><div className="forecast-bar" style={{height:`${Math.max(8,point.income/forecastMax*100)}%`}}/></div><span>{point.year === 0 ? 'Today' : `Year ${point.year}`}</span></div>)}</div><p className="forecast-note"><i/> Target income: ${goal.toLocaleString()} / month</p></section></div>
}

function App() {
  const [active, setActive] = useState(() => pageFromPath(window.location.pathname));
  const savedPlan = (() => { try { return JSON.parse(localStorage.getItem('divrion-plan')) || {}; } catch { return {}; } })();
  const [goal, setGoal] = useState(savedPlan.goal || 1200);
  const [monthly, setMonthly] = useState(savedPlan.monthly || 850);
  const [risk, setRisk] = useState(savedPlan.risk || 'Balanced');
  const [filter, setFilter] = useState('All');
  const [showPlanner, setShowPlanner] = useState(false);
  const [portfolios, setPortfolios] = useState(() => { if (demoMode) return defaultPortfolios; try { const saved = JSON.parse(localStorage.getItem('divrion-portfolios')); if (saved) return saved; return emptyPortfolios; } catch { return emptyPortfolios; } });
  const [selectedPortfolioId, setSelectedPortfolioId] = useState('combined');
  const [expenseItems, setExpenseItems] = useState(savedPlan.expenseItems || defaultExpenses);
  const [showHoldingForm, setShowHoldingForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [toast, setToast] = useState('');
  const [incomeCadence, setIncomeCadence] = useState('Monthly');
  const [dataSourceConfig, setDataSourceConfig] = useState(() => { try { return JSON.parse(localStorage.getItem('divrion-data-source')) || { provider: 'alpha-vantage', apiKey: '', apiSecret: '' }; } catch { return { provider: 'alpha-vantage', apiKey: '', apiSecret: '' }; } });
  const [refreshing, setRefreshing] = useState(false);
  const activePortfolio = portfolios.find(item => item.id === selectedPortfolioId) || portfolios[0];
  const portfolio = selectedPortfolioId === 'combined' ? portfolios.flatMap(group => group.holdings.map(holding => ({ ...holding, portfolioId: group.id, portfolioName: group.name }))) : (activePortfolio?.holdings || []).map(holding => ({ ...holding, portfolioId: activePortfolio.id, portfolioName: activePortfolio.name }));
  const totalValue = portfolio.reduce((sum, item) => sum + item.value, 0);
  const annualIncome = portfolio.reduce((sum, item) => sum + item.income, 0);
  const monthlyIncome = annualIncome / 12;
  const incomeView = {
    Monthly: { income: monthlyIncome, goal, suffix: 'mo' },
    Weekly: { income: annualIncome / 52, goal: goal * 12 / 52, suffix: 'wk' },
    Daily: { income: annualIncome / 365, goal: goal * 12 / 365, suffix: 'day' },
    Yearly: { income: annualIncome, goal: goal * 12, suffix: 'yr' },
  }[incomeCadence];
  const expenses = expenseItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const coverage = Math.min(100, Math.round((monthlyIncome / expenses) * 100));
  const overallYield = totalValue ? annualIncome / totalValue * 100 : 0;
  const allocation = totalValue ? portfolio.map(h => ({ ...h, share: h.value / totalValue * 100 })) : [];
  const goalProgress = Math.min(100, monthlyIncome / goal * 100);
  const targetValue = goal * 12 / .041;
  let projectedValue = totalValue;
  let monthsToGoal = 0;
  while (projectedValue < targetValue && monthsToGoal < 600) { projectedValue = projectedValue * (1 + .08 / 12) + monthly; monthsToGoal += 1; }
  const goalDate = new Date();
  goalDate.setMonth(goalDate.getMonth() + monthsToGoal);
  const goalDateLabel = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(goalDate);
  useEffect(() => { if (!demoMode) localStorage.setItem('divrion-portfolios', JSON.stringify(portfolios)); }, [portfolios]);
  useEffect(() => localStorage.setItem('divrion-plan', JSON.stringify({ goal, monthly, risk, expenseItems })), [goal, monthly, risk, expenseItems]);
  useEffect(() => localStorage.setItem('divrion-data-source', JSON.stringify(dataSourceConfig)), [dataSourceConfig]);
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(''), 2800); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { const onPopState = () => setActive(pageFromPath(window.location.pathname)); window.addEventListener('popstate', onPopState); return () => window.removeEventListener('popstate', onPopState); }, []);
  const navigate = page => { const path = pagePaths[page]; if (path && window.location.pathname !== path) window.history.pushState({}, '', path); setActive(page); };
  const removeHolding = (symbol, sourceId) => setPortfolios(current => current.map(group => group.id !== (sourceId || activePortfolio.id) ? group : { ...group, holdings: group.holdings.filter(holding => holding.symbol !== symbol) }));
  const removeHoldingWithToast = (symbol, sourceId) => { removeHolding(symbol, sourceId); setToast(`${symbol} removed from your simulation`); };
  const addHolding = holding => setPortfolios(current => current.map(group => { if (group.id !== activePortfolio.id) return group; if (group.holdings.some(item => item.symbol === holding.symbol)) { setToast(`${holding.symbol} is already in ${group.name}`); return group; } setToast(`${holding.symbol} added to ${group.name}`); return { ...group, holdings: [...group.holdings, { ...holding, income: holding.value * holding.yield / 100, color: holding.color || '#ef789a', simulated: true }] }; }));
  const addRecommendation = r => { addHolding({ symbol: r.symbol, name: r.name, value: 2500, yield: Number.parseFloat(r.yield), color: r.color }); navigate('Portfolio'); };
  const simulateSuggested = amount => {
    const value = Number(amount) || 0;
    if (value <= 0) return setToast('Enter an investment amount above $0');
    const suggestion = recommendations.find(item => item.symbol === 'JEPI');
    setPortfolios(current => current.map(group => {
      if (group.id !== activePortfolio.id) return group;
      const existing = group.holdings.find(item => item.symbol === suggestion.symbol);
      return { ...group, holdings: existing ? group.holdings.map(item => item.symbol === suggestion.symbol ? { ...item, value: item.value + value, income: item.income + value * Number.parseFloat(suggestion.yield) / 100, simulated: true } : item) : [...group.holdings, { symbol: suggestion.symbol, name: suggestion.name, value, yield: Number.parseFloat(suggestion.yield), income: value * Number.parseFloat(suggestion.yield) / 100, color: suggestion.color, simulated: true }] };
    }));
    setToast(`$${value.toLocaleString()} simulated in JEPI`);
  };
  const createPortfolio = () => {
    const id = crypto.randomUUID();
    const name = `Portfolio ${portfolios.length + 1}`;
    setPortfolios(current => [...current, { id, name, holdings: [] }]);
    setSelectedPortfolioId(id);
    setToast(`${name} created`);
  };
  const deletePortfolio = () => {
    if (portfolios.length < 2) return setToast('Keep at least one portfolio');
    if (!window.confirm(`Delete ${activePortfolio.name} and its holdings? This cannot be undone.`)) return;
    setPortfolios(current => current.filter(group => group.id !== activePortfolio.id));
    setSelectedPortfolioId('combined');
    setToast(`${activePortfolio.name} deleted`);
  };
  const importPortfolios = groups => {
    setPortfolios(current => [...current, ...groups.map((group, index) => ({ id: crypto.randomUUID(), name: current.some(item => item.name === group.name) ? `${group.name} ${index + 2}` : group.name, holdings: group.holdings }))]);
    setSelectedPortfolioId('combined');
    setToast(`${groups.length} portfolio${groups.length === 1 ? '' : 's'} imported`);
  };
  const refreshMarketData = async () => {
    const holdings = portfolio.filter(item => Number(item.quantity) > 0);
    if (!holdings.length || !dataSourceConfig.apiKey) return;
    setRefreshing(true);
    try {
      const updates = dataSourceConfig.provider === 'alpaca' ? await Promise.all(holdings.map(async holding => {
        const headers = { 'APCA-API-KEY-ID': dataSourceConfig.apiKey, 'APCA-API-SECRET-KEY': dataSourceConfig.apiSecret };
        const snapshot = await fetch(`https://data.alpaca.markets/v2/stocks/${holding.symbol}/snapshot?feed=iex`, { headers }).then(response => response.json());
        const price = Number(snapshot.latestTrade?.p || snapshot.dailyBar?.c || snapshot.prevDailyBar?.c);
        if (!price) return null;
        const date = new Date(); const start = new Date(date); start.setFullYear(start.getFullYear() - 1);
        const actions = await fetch(`https://data.alpaca.markets/v1/corporate-actions?${new URLSearchParams({ symbols: holding.symbol, types: 'cash_dividend', start: start.toISOString().slice(0, 10), end: date.toISOString().slice(0, 10), limit: '1000' })}`, { headers }).then(response => response.json());
        const dividends = actions.cash_dividends || actions.cashDividends || [];
        const annualDividend = dividends.reduce((sum, dividend) => sum + Number(dividend.rate || dividend.cash_rate || 0), 0);
        const yieldValue = annualDividend ? annualDividend / price * 100 : holding.yield;
        const value = Number(holding.quantity) * price;
        return { symbol: holding.symbol, portfolioId: holding.portfolioId, price, value, yield: yieldValue, income: value * yieldValue / 100, source: 'Alpaca' };
      })) : await Promise.all(holdings.map(async holding => {
        const request = fn => fetch(`https://www.alphavantage.co/query?${new URLSearchParams({ function: fn, symbol: holding.symbol, apikey: dataSourceConfig.apiKey })}`).then(response => response.json());
        const [quote, overview] = await Promise.all([request('GLOBAL_QUOTE'), request('OVERVIEW')]);
        const price = Number(quote['Global Quote']?.['05. price']);
        if (!price) return null;
        const rawYield = Number(overview.DividendYield);
        const yieldValue = rawYield ? (rawYield <= 1 ? rawYield * 100 : rawYield) : holding.yield;
        const value = Number(holding.quantity) * price;
        return { symbol: holding.symbol, portfolioId: holding.portfolioId, price, value, yield: yieldValue, income: value * yieldValue / 100, source: 'Alpha Vantage' };
      }));
      const usable = updates.filter(Boolean);
      const refreshedAt = new Date().toISOString();
      setPortfolios(current => current.map(group => ({ ...group, holdings: group.holdings.map(holding => { const update = usable.find(item => item.portfolioId === group.id && item.symbol === holding.symbol); return update ? { ...holding, value: update.value, yield: update.yield, income: update.income, marketDataSource: update.source, lastPrice: update.price, lastUpdated: refreshedAt } : holding; }) })));
      setToast(`${usable.length} holding${usable.length === 1 ? '' : 's'} refreshed from ${dataSourceConfig.provider === 'alpaca' ? 'Alpaca' : 'Alpha Vantage'}`);
    } catch { setToast('Market refresh failed. Check your API key and provider limits.'); } finally { setRefreshing(false); }
  };
  const exportPortfolio = () => {
    const quote = value => `"${String(value).replaceAll('"', '""')}"`;
    const csv = [['Portfolio', 'Symbol', 'Name', 'Market value', 'Annual yield', 'Annual income', 'Simulated'], ...portfolio.map(item => [item.portfolioName, item.symbol, item.name, item.value, `${item.yield}%`, item.income.toFixed(2), item.simulated ? 'Yes' : 'No'])].map(row => row.map(quote).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'divrion-portfolio.csv'; link.click(); URL.revokeObjectURL(url);
    setToast('Portfolio CSV downloaded');
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">d</span><span>divrion</span></div>
      <nav>
        {[['Overview', LayoutDashboard], ['Income plan', TrendingUp], ['Portfolio', Wallet], ['Discover', Compass]].map(([label, Icon]) => <button key={label} onClick={() => navigate(label)} className={active === label ? 'nav-item active' : 'nav-item'}><Icon size={19}/>{label}</button>)}
      </nav>
      <div className="sidebar-bottom"><button className={active === 'Data sources' ? 'nav-item active' : 'nav-item'} onClick={()=>navigate('Data sources')}><Settings size={19}/>Data sources</button><div className="profile"><div className="avatar">G</div><div><strong>Guest</strong><span>Local session</span></div><ChevronDown size={16}/></div></div>
    </aside>
    <main>
      <header><div><p className="eyebrow">{active === 'Overview' ? 'WELCOME, GUEST' : active.toUpperCase()}</p><h1>{active === 'Overview' ? 'Your income, at a glance.' : active}</h1></div><div className="header-actions"><label className="portfolio-switcher"><span>Portfolio</span><select value={selectedPortfolioId} onChange={event=>setSelectedPortfolioId(event.target.value)}><option value="combined">Combined</option>{portfolios.map(group=><option key={group.id} value={group.id}>{group.name}</option>)}</select></label><button className="icon-button" title="Create portfolio" onClick={createPortfolio}><Plus size={18}/></button><button className="icon-button"><CircleHelp size={20}/></button><button className="icon-button notification"><Bell size={20}/><i/></button><button className="primary" onClick={() => setShowPlanner(true)}><Plus size={18}/>Build income plan</button></div></header>
      {active === 'Overview' && <><section className="hero-grid">
        <div className="income-card"><div className="income-card-header"><div className="card-label">{incomeCadence.toUpperCase()} PASSIVE INCOME <CircleHelp size={15}/></div><select aria-label="Income timeframe" value={incomeCadence} onChange={event=>setIncomeCadence(event.target.value)}>{['Monthly','Weekly','Daily','Yearly'].map(period=><option key={period}>{period}</option>)}</select></div><div className="income-top"><div><div className="big-number">${incomeView.income.toFixed(0)}<small>/{incomeView.suffix}</small></div><p>{portfolio.length ? <><span className="up">↑ 4.8%</span> vs. last period</> : 'Add a holding to start tracking income.'}</p></div><div className="spark">{portfolio.length ? <svg viewBox="0 0 130 55" preserveAspectRatio="none"><path d="M0 45 C12 38 18 43 28 31 S45 36 55 26 S69 33 78 19 S95 24 105 12 S118 19 130 3" fill="none" stroke="currentColor" strokeWidth="3"/></svg> : <span className="empty-spark">No income history</span>}</div></div><div className="goal-line"><span>{incomeCadence} goal</span><strong>${incomeView.goal.toLocaleString(undefined, { maximumFractionDigits: 0 })} /{incomeView.suffix}</strong></div><div className="progress"><span style={{width: `${goalProgress}%`}}/></div><p className="muted">You’re {goalProgress.toFixed(0)}% of the way there. Keep building.</p></div>
        <div className="coverage-card"><div className="card-label">EXPENSE COVERAGE</div><div className="coverage-body"><div className="donut" style={{'--percent': `${coverage * 3.6}deg`}}><div><b>{coverage}%</b><span>covered</span></div></div><div><h3>${monthlyIncome.toFixed(0)} <span>of ${expenses.toLocaleString()}</span></h3><p>Your portfolio covers {coverage}% of monthly spending.</p><button className="text-button" onClick={() => navigate('Income plan')}>View expenses →</button></div></div></div>
      </section>
      <section className="two-col">
        <div className="panel allocation-panel"><div className="panel-heading"><div><h2>Portfolio allocation</h2><p>How your income portfolio is working</p></div><button className="ghost" onClick={() => navigate('Portfolio')}>View portfolio</button></div><div className={`allocation-content ${allocation.length > 8 ? 'allocation-dense' : ''}`}><div className="allocation-donut" style={{background: allocation.length ? `conic-gradient(${allocation.map((a, i) => `${a.color} ${allocation.slice(0,i).reduce((s,x)=>s+x.share,0)}% ${allocation.slice(0,i+1).reduce((s,x)=>s+x.share,0)}%`).join(',')})` : '#373841'}}><div><strong>${(totalValue/1000).toFixed(1)}k</strong><span>{allocation.length ? 'invested' : 'no holdings'}</span></div></div><div className={`legend ${allocation.length > 8 ? 'legend-large' : allocation.length > 4 ? 'legend-medium' : ''}`}>{allocation.length ? allocation.map(x => <div key={x.symbol}><i style={{background:x.color}}/><span>{x.symbol}{x.simulated && <em className="allocation-simulated">Sim</em>}</span><b>{x.share.toFixed(0)}%</b></div>) : <p className="empty-legend">Add a holding to see your allocation mix.</p>}</div></div></div>
        <div className="panel activity"><div className="panel-heading"><div><h2>Income activity</h2><p>Upcoming dividends and distributions</p></div><button className="ghost">See all</button></div>{portfolio.slice(0,3).map((h,i)=>{ const days=[3,9,16][i]; return <div className="activity-row" key={h.symbol}><div className="ticker" style={{background:h.color}}>{h.symbol.slice(0,2)}</div><div><strong>{h.symbol} dividend</strong><span>Expected in {days} day{days === 1 ? '' : 's'}</span></div><b>+${(h.income/4).toFixed(2)}</b></div>})}<div className="month-income"><span>Expected for the rest of this month</span><b>+${(annualIncome / 12 * .72).toFixed(0)}</b></div></div>
      </section>
      <DiscoverCards filter={filter} setFilter={setFilter} addHolding={addRecommendation}/>
      <section className="panel goal-panel"><div><p className="eyebrow">YOUR INCOME GOAL</p><h2>Reach ${goal.toLocaleString()} in monthly income</h2><p>At your current contribution and return assumptions, you could get there by <strong>{goalDateLabel}</strong> — about {Math.ceil(monthsToGoal / 12)} years.</p></div><button className="primary" onClick={()=>setShowPlanner(true)}>Explore plan <TrendingUp size={17}/></button></section>
      </>}
      {active === 'Portfolio' && <PortfolioScreen portfolio={portfolio} totalValue={totalValue} annualIncome={annualIncome} overallYield={overallYield} removeHolding={removeHoldingWithToast} openHoldingForm={()=>setShowHoldingForm(true)} openImport={()=>setShowImport(true)} simulateSuggested={simulateSuggested} exportPortfolio={exportPortfolio} deletePortfolio={deletePortfolio} selectedPortfolioId={selectedPortfolioId} portfolioName={activePortfolio.name} canDeletePortfolio={portfolios.length > 1} openDataSources={()=>navigate('Data sources')}/>}
      {active === 'Income plan' && <IncomePlanScreen goal={goal} setGoal={setGoal} monthly={monthly} setMonthly={setMonthly} risk={risk} setRisk={setRisk} expenses={expenses} expenseItems={expenseItems} setExpenseItems={setExpenseItems} coverage={coverage} monthlyIncome={monthlyIncome}/>} 
      {active === 'Discover' && <DiscoverCards filter={filter} setFilter={setFilter} addHolding={addRecommendation} full/>} 
      {active === 'Data sources' && <DataSourcesScreen config={dataSourceConfig} saveConfig={setDataSourceConfig} refreshMarketData={refreshMarketData} refreshing={refreshing} selectedName={selectedPortfolioId === 'combined' ? 'combined portfolios' : activePortfolio.name} holdingsWithQuantity={portfolio.filter(item => Number(item.quantity) > 0).length} portfolioSize={portfolio.length} providerUpdatedAt={portfolio.map(item => item.lastUpdated).filter(Boolean).sort().at(-1)}/>}
    </main>
    {showPlanner && <div className="modal-backdrop"><div className="modal"><button className="close" onClick={()=>setShowPlanner(false)}><X/></button><p className="eyebrow">INCOME PLAN</p><h2>Design your income engine</h2><p className="modal-intro">Tune the inputs and we’ll shape a portfolio path toward your goal.</p><label>Monthly passive-income goal <div className="input-prefix"><span>$</span><input type="number" value={goal} onChange={e=>setGoal(Number(e.target.value))}/><em>/ month</em></div></label><label>Monthly contribution <div className="input-prefix"><span>$</span><input type="number" value={monthly} onChange={e=>setMonthly(Number(e.target.value))}/><em>/ month</em></div></label><label>Risk preference <div className="risk-options">{['Conservative','Balanced','Growth'].map(x=><button key={x} className={risk===x?'selected':''} onClick={()=>setRisk(x)}>{x}</button>)}</div></label><div className="plan-result"><span>Suggested target yield</span><b>{risk==='Conservative'?'3.2%':risk==='Balanced'?'4.1%':'4.8%'}</b><span>Estimated time to goal</span><b>{risk==='Conservative'?'5 years':'3 years, 8 months'}</b></div><button className="primary full" onClick={()=>setShowPlanner(false)}>Save income plan</button></div></div>}
    {showHoldingForm && <HoldingModal onClose={()=>setShowHoldingForm(false)} onSave={holding=>{ addHolding(holding); setShowHoldingForm(false); }}/>} 
    {showImport && <ImportModal onClose={()=>setShowImport(false)} onImport={importPortfolios}/>} 
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>
}
createRoot(document.getElementById('root')).render(<App/>);
