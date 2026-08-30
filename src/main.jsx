import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Bell, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Compass, FileUp, Landmark, LayoutDashboard, Plus, Search, Settings, ShieldCheck, SlidersHorizontal, TrendingUp, Wallet, X } from 'lucide-react';
import './styles.css';

const holdings = [
  { symbol: 'SCHD', name: 'Schwab U.S. Dividend Equity', value: 18420, costBasis: 15680, yield: 3.82, income: 703.64, payoutRatio: 38, dividendGrowth: 11.2, dividendYears: 13, sector: 'Equity', industry: 'Dividend ETFs', color: '#6e5af7' },
  { symbol: 'VYM', name: 'Vanguard High Dividend Yield', value: 12680, costBasis: 11940, yield: 2.86, income: 362.65, payoutRatio: 42, dividendGrowth: 6.9, dividendYears: 18, sector: 'Equity', industry: 'Dividend ETFs', color: '#31bb92' },
  { symbol: 'O', name: 'Realty Income Corp.', value: 7950, costBasis: 8240, yield: 5.39, income: 428.51, payoutRatio: 76, dividendGrowth: 3.8, dividendYears: 28, sector: 'Real estate', industry: 'REITs', color: '#f5a742' },
  { symbol: 'DGRO', name: 'iShares Core Dividend Growth', value: 6500, costBasis: 5980, yield: 2.24, income: 145.60, payoutRatio: 35, dividendGrowth: 10.5, dividendYears: 10, sector: 'Equity', industry: 'Dividend ETFs', color: '#4d9df2' },
];
const recommendations = [
  { symbol: 'VIG', name: 'Vanguard Dividend Appreciation', yield: '1.7%', growth: '10.2%', tag: 'Dividend growth', sector: 'Equity', industry: 'Dividend ETFs', reason: 'Strong five-year dividend growth for a long-term income plan.', color: '#7a67fa' },
  { symbol: 'JEPI', name: 'JPMorgan Equity Premium Income', yield: '7.8%', growth: '4.1%', tag: 'High income', sector: 'Equity', industry: 'Options income ETFs', reason: 'High distribution yield to accelerate current income coverage.', color: '#d18bff' },
  { symbol: 'XLV', name: 'Health Care Select Sector', yield: '1.4%', growth: '8.6%', tag: 'Healthcare', sector: 'Healthcare', industry: 'Healthcare ETFs', reason: 'Healthcare exposure that supports your selected sector preference.', color: '#43c6a1' },
];
const defaultExpenses = [
  { id: 'home', label: 'Housing', amount: 1050 },
  { id: 'life', label: 'Living & food', amount: 650 },
  { id: 'transport', label: 'Transport', amount: 400 },
];
const defaultPortfolios = [
  { id: 'income-core', name: 'Income Core', holdings },
  { id: 'growth-income', name: 'Growth & Income', holdings: [
    { symbol: 'VIG', name: 'Vanguard Dividend Appreciation', value: 9200, costBasis: 8100, yield: 1.7, income: 156.4, color: '#7a67fa' },
    { symbol: 'XLV', name: 'Health Care Select Sector', value: 5400, costBasis: 5250, yield: 1.4, income: 75.6, color: '#43c6a1' },
  ] },
];
const demoMode = new URLSearchParams(window.location.search).has('demo') || import.meta.env.VITE_DEMO === 'true';
const emptyPortfolios = [{ id: 'my-portfolio', name: 'My Portfolio', holdings: [] }];
const pagePaths = { Overview: '/', Calendar: '/calendar', 'Income plan': '/income-plan', Portfolio: '/portfolio', Discover: '/discover', Settings: '/settings' };
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
      items[symbol] ||= { symbol, name: symbol, quantity: 0, value: 0, costBasis: 0, yield: 0, income: 0, color: '#6e5af7', simulated: false };
      items[symbol].quantity += quantity;
      items[symbol].value += quantity * cost;
      items[symbol].costBasis += quantity * cost;
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
    const costPerShare = numberValue(lookup(record, ['costpershare', 'avgcost', 'averagecost', 'costbasisps']));
    const reportedCostBasis = numberValue(lookup(record, ['costbasis', 'totalcost', 'investedamount', 'purchasevalue']));
    const costBasis = reportedCostBasis || (quantity && costPerShare ? quantity * costPerShare : value);
    const rawPayoutRatio = numberValue(lookup(record, ['payoutratio', 'dividendpayoutratio']));
    const payoutRatio = rawPayoutRatio > 0 && rawPayoutRatio <= 1 ? rawPayoutRatio * 100 : rawPayoutRatio;
    const dividendGrowth = numberValue(lookup(record, ['dividendgrowth', 'dividendgrowth5y', 'fiveyeardividendgrowth']));
    const dividendYears = numberValue(lookup(record, ['dividendyears', 'yearsofincreases', 'dividendstreak']));
    return { portfolio: lookup(record, ['portfolio', 'account', 'accountname']) || 'Imported portfolio', holding: { symbol: String(symbol).toUpperCase(), name: lookup(record, ['name', 'security', 'description', 'company']) || String(symbol).toUpperCase(), value, costBasis, quantity, yield: yieldValue, income, payoutRatio, dividendGrowth, dividendYears, sector: lookup(record, ['sector']) || 'Unclassified', industry: lookup(record, ['industry', 'category']) || 'Unclassified', color: '#6e5af7', simulated: false } };
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

function ConcentrationLens({ portfolio, navigate }) {
  const [dimension, setDimension] = useState('sector');
  const [measure, setMeasure] = useState('income');
  const metric = measure === 'income' ? 'income' : 'value';
  const total = portfolio.reduce((sum, holding) => sum + Number(holding[metric] || 0), 0);
  const groups = Object.values(portfolio.reduce((all, holding) => {
    const name = holding[dimension] || 'Unclassified';
    all[name] ||= { name, value: 0, holdings: 0, colors: [] };
    all[name].value += Number(holding[metric] || 0);
    all[name].holdings += 1;
    all[name].colors.push(holding.color || '#777786');
    return all;
  }, {})).map(group => ({ ...group, share: total ? group.value / total * 100 : 0 })).sort((a, b) => b.value - a.value);
  const leader = groups[0];
  const uncategorized = portfolio.filter(holding => !holding[dimension] || holding[dimension] === 'Unclassified').length;
  const reliance = leader?.share || 0;
  const posture = reliance >= 50 ? 'High reliance' : reliance >= 30 ? 'Worth watching' : 'Well spread';
  const postureClass = reliance >= 50 ? 'high' : reliance >= 30 ? 'watch' : 'spread';
  return <section className="panel concentration-panel"><div className="panel-heading"><div><p className="eyebrow">CONCENTRATION LENS</p><h2>See what your income relies on.</h2><p>Compare where your projected cash flow and invested capital are concentrated.</p></div><button className="ghost" onClick={()=>navigate('Discover')}>Explore ideas</button></div><div className="concentration-controls"><div className="segmented-control">{[['income','Income'],['value','Capital']].map(([key,label])=><button key={key} className={measure===key?'selected':''} onClick={()=>setMeasure(key)}>{label}</button>)}</div><div className="segmented-control">{[['sector','Sector'],['industry','Industry']].map(([key,label])=><button key={key} className={dimension===key?'selected':''} onClick={()=>setDimension(key)}>{label}</button>)}</div></div>{portfolio.length ? <div className="concentration-body"><div className="reliance-card"><span>Largest {dimension} dependency</span><b>{leader?.name || '—'}</b><strong>{reliance.toFixed(0)}%</strong><p>of projected {measure === 'income' ? 'annual income' : 'portfolio value'}</p><em className={postureClass}>{posture}</em></div><div className="concentration-bars">{groups.map(group=><div className="concentration-row" key={group.name}><div><span><i style={{ background: group.colors[0] }}/>{group.name}</span><b>{group.share.toFixed(0)}%</b></div><div className="concentration-track"><i style={{ width: `${group.share}%`, background: group.colors[0] }}/></div><small>{measure === 'income' ? `$${group.value.toFixed(0)} / yr` : `$${group.value.toLocaleString()}`} · {group.holdings} holding{group.holdings === 1 ? '' : 's'}</small></div>)}</div></div> : <div className="concentration-empty"><Compass size={19}/><div><b>Your concentration picture starts with a holding.</b><span>Add or import a portfolio to see where income is coming from.</span></div><button className="ghost" onClick={()=>navigate('Portfolio')}>Go to portfolio</button></div>}{uncategorized > 0 && <p className="concentration-note">{uncategorized} holding{uncategorized === 1 ? ' is' : 's are'} unclassified, so the grouping is incomplete. Add Sector or Industry columns to your next import for a fuller picture.</p>}</section>
}

const confidenceFor = holding => {
  const payout = Number(holding.payoutRatio || 0);
  const growth = Number(holding.dividendGrowth || 0);
  const years = Number(holding.dividendYears || 0);
  const evidence = [payout, growth, years].filter(Boolean).length;
  if (!evidence) return { level: 'Needs data', tone: 'unknown', evidence: 'Add payout, growth, or history data to assess this income.' };
  if (payout > 80 || growth < 0) return { level: 'Watch', tone: 'watch', evidence: payout > 80 ? `Payout ratio is ${payout.toFixed(0)}%, leaving less room for a setback.` : 'Reported dividend growth is negative.' };
  if (payout <= 65 && growth >= 3 && years >= 5) return { level: 'Steady', tone: 'steady', evidence: `${years.toFixed(0)} years of history, ${growth.toFixed(1)}% growth, and ${payout.toFixed(0)}% payout.` };
  return { level: 'Building evidence', tone: 'building', evidence: `${evidence} of 3 confidence signals are available.` };
};

function IncomeConfidencePanel({ portfolio, navigate }) {
  const assessed = portfolio.map(holding => ({ holding, ...confidenceFor(holding) }));
  const annualIncome = portfolio.reduce((sum, holding) => sum + Number(holding.income || 0), 0);
  const steadyIncome = assessed.filter(item => item.tone === 'steady').reduce((sum, item) => sum + Number(item.holding.income || 0), 0);
  const known = assessed.filter(item => item.tone !== 'unknown').length;
  return <section className="panel confidence-panel"><div className="panel-heading"><div><p className="eyebrow">INCOME CONFIDENCE</p><h2>Know what supports your cash flow.</h2><p>Divrion explains the available evidence instead of turning it into an opaque safety score.</p></div><button className="ghost" onClick={()=>navigate('Settings')}>Data settings</button></div>{portfolio.length ? <><div className="confidence-summary"><div><span>Income with steady signals</span><b>{annualIncome ? `${(steadyIncome / annualIncome * 100).toFixed(0)}%` : '—'}</b><em>${steadyIncome.toFixed(0)} / yr</em></div><div><span>Holdings with evidence</span><b>{known} of {portfolio.length}</b><em>Payout ratio, growth, or history</em></div><p>Confidence is a research prompt, not investment advice. Review source data before acting.</p></div><div className="confidence-list">{assessed.sort((a,b) => Number(b.holding.income || 0) - Number(a.holding.income || 0)).map(item => <article className="confidence-row" key={`${item.holding.portfolioId}-${item.holding.symbol}`}><div className="ticker" style={{ background:item.holding.color }}>{item.holding.symbol.slice(0,2)}</div><div className="confidence-holding"><b>{item.holding.symbol}</b><span>{item.evidence}</span></div><div className="confidence-signals"><span>{item.holding.payoutRatio ? `${item.holding.payoutRatio}% payout` : 'Payout n/a'}</span><span>{item.holding.dividendGrowth ? `${item.holding.dividendGrowth}% growth` : 'Growth n/a'}</span><span>{item.holding.dividendYears ? `${item.holding.dividendYears}y history` : 'History n/a'}</span></div><em className={`confidence-status ${item.tone}`}>{item.level}</em></article>)}</div></> : <div className="confidence-empty"><ShieldCheck size={20}/><div><b>Income confidence appears once you add holdings.</b><span>Import dividend history fields when available to make the assessment richer.</span></div></div>}</section>
}

function HoldingLens({ holding, portfolio, onClose }) {
  const [amount, setAmount] = useState(1000);
  const basis = Number(holding.costBasis ?? holding.value);
  const gainLoss = Number(holding.value || 0) - basis;
  const yieldOnCost = basis ? Number(holding.income || 0) / basis * 100 : 0;
  const confidence = confidenceFor(holding);
  const sectorIncome = portfolio.filter(item => (item.sector || 'Unclassified') === (holding.sector || 'Unclassified')).reduce((sum, item) => sum + Number(item.income || 0), 0);
  const totalIncome = portfolio.reduce((sum, item) => sum + Number(item.income || 0), 0);
  const sectorShare = totalIncome ? sectorIncome / totalIncome * 100 : 0;
  const payment = paymentMonthsFor(holding);
  let nextPayment = null;
  for (let step = 0; step < 13; step += 1) { const candidate = new Date(); candidate.setDate(1); candidate.setMonth(candidate.getMonth() + step); if ((candidate.getFullYear() * 12 + candidate.getMonth() - payment.offset) % payment.interval === 0) { candidate.setDate(Math.min(payment.day, new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate())); if (candidate >= new Date()) { nextPayment = candidate; break; } } }
  const addedIncome = Number(amount || 0) * Number(holding.yield || 0) / 100;
  return <div className="modal-backdrop"><section className="modal holding-lens"><button className="close" onClick={onClose}><X/></button><div className="lens-header"><div className="ticker" style={{background:holding.color}}>{holding.symbol.slice(0,2)}</div><div><p className="eyebrow">HOLDING LENS</p><h2>{holding.symbol}</h2><p>{holding.name}</p></div><em className={`confidence-status ${confidence.tone}`}>{confidence.level}</em></div><div className="lens-metrics"><div><span>Market value</span><b>${Number(holding.value || 0).toLocaleString()}</b></div><div><span>Value vs. basis</span><b className={gainLoss >= 0 ? 'positive' : 'negative'}>{gainLoss >= 0 ? '+' : '−'}${Math.abs(gainLoss).toFixed(0)}</b></div><div><span>Yield on cost</span><b>{yieldOnCost.toFixed(2)}%</b></div></div><div className="lens-grid"><section><span className="lens-label">INCOME CONFIDENCE</span><b>{confidence.evidence}</b><div className="lens-tags"><span>{holding.payoutRatio ? `${holding.payoutRatio}% payout` : 'Payout n/a'}</span><span>{holding.dividendGrowth ? `${holding.dividendGrowth}% growth` : 'Growth n/a'}</span><span>{holding.dividendYears ? `${holding.dividendYears}y history` : 'History n/a'}</span></div></section><section><span className="lens-label">PORTFOLIO CONTEXT</span><b>{sectorShare.toFixed(0)}% of income sits in {holding.sector || 'Unclassified'}.</b><p>{holding.industry || 'Unclassified'} · ${Number(holding.income || 0).toFixed(0)} projected annually</p></section></div><section className="lens-payment"><div><span className="lens-label">NEXT ESTIMATED PAYMENT</span><b>{nextPayment ? new Intl.DateTimeFormat('en', { month:'long', day:'numeric' }).format(nextPayment) : 'Not available'}</b><p>{payment.frequency === 12 ? 'Monthly' : payment.frequency === 4 ? 'Quarterly' : `${payment.frequency}× yearly`} cadence · ${(Number(holding.income || 0) / payment.frequency).toFixed(2)} per payment</p></div><em>Estimated</em></section><section className="lens-simulator"><div><span className="lens-label">ADD-ON SIMULATOR</span><b>See the income impact before you add capital.</b></div><label><span>$</span><input aria-label="Additional investment" type="number" min="0" value={amount} onChange={event=>setAmount(event.target.value)}/></label><strong>+${addedIncome.toFixed(0)} / yr</strong></section><p className="lens-disclaimer">Planning view only. Payment timing and confidence signals depend on the data currently available in Divrion.</p></section></div>;
}

function RebalancePlanner({ portfolio, totalValue, simulateContribution }) {
  const [amount, setAmount] = useState(1000);
  const groups = Object.values(portfolio.reduce((all, holding) => { const sector = holding.sector || 'Unclassified'; all[sector] = (all[sector] || 0) + Number(holding.value || 0); return all; }, {})).sort(([,a],[,b]) => b - a);
  const [leader, leaderValue] = groups[0] || ['Unclassified', 0];
  const suggestion = recommendations.find(item => item.sector !== leader) || recommendations[0];
  const contribution = Math.max(0, Number(amount) || 0);
  const currentLeaderShare = totalValue ? leaderValue / totalValue * 100 : 0;
  const nextLeaderShare = totalValue + contribution ? leaderValue / (totalValue + contribution) * 100 : 0;
  const suggestedSectorValue = groups.find(([sector]) => sector === suggestion.sector)?.[1] || 0;
  const nextSuggestedShare = totalValue + contribution ? (suggestedSectorValue + contribution) / (totalValue + contribution) * 100 : 0;
  if (!portfolio.length) return null;
  return <section className="panel rebalance-panel"><div className="panel-heading"><div><p className="eyebrow">REBALANCE PLANNER</p><h2>Put your next dollar to work with intent.</h2><p>This contribution plan aims to soften your largest sector dependency without selling anything.</p></div><label className="amount-input">Contribution <div className="input-prefix"><span>$</span><input type="number" min="0" value={amount} onChange={event=>setAmount(event.target.value)}/></div></label></div><div className="rebalance-body"><div className="rebalance-shift"><span>Largest capital exposure</span><b>{leader}</b><div><strong>{currentLeaderShare.toFixed(0)}%</strong><i>→</i><strong>{nextLeaderShare.toFixed(0)}%</strong></div><p>after a ${contribution.toLocaleString()} contribution outside this sector</p></div><div className="rebalance-suggestion"><div className="ticker" style={{background:suggestion.color}}>{suggestion.symbol.slice(0,2)}</div><div><span>Counterweight idea</span><h3>{suggestion.symbol}</h3><p>{suggestion.sector} would become {nextSuggestedShare.toFixed(0)}% of portfolio capital.</p></div><button className="simulate-button" onClick={()=>simulateContribution(suggestion.symbol, contribution)}>Simulate ${contribution.toLocaleString()} in {suggestion.symbol}</button></div></div><p className="advice-note">A diversification illustration based on categories stored in your portfolio. It is not personalized investment advice.</p></section>;
}

function PortfolioScreen({ portfolio, totalValue, annualIncome, overallYield, totalCostBasis, totalGainLoss, totalReturn, removeHolding, openHoldingForm, openImport, simulateSuggested, simulateContribution, exportPortfolio, deletePortfolio, selectedPortfolioId, portfolioName, canDeletePortfolio, openDataSources }) {
  const [investmentAmount, setInvestmentAmount] = useState(1000);
  const [lensHolding, setLensHolding] = useState(null);
  const lowestYield = portfolio.length ? portfolio.reduce((lowest, item) => item.yield < lowest.yield ? item : lowest) : null;
  const suggested = recommendations.find(item => item.symbol === 'JEPI');
  const missingYieldCount = portfolio.filter(item => !Number(item.yield)).length;
  const basisYield = totalCostBasis ? annualIncome / totalCostBasis * 100 : 0;
  return <div className="screen-stack"><section className="stats-grid">{[['Portfolio value', `$${totalValue.toLocaleString()}`], ['Annual income', `$${annualIncome.toFixed(0)}`], ['Blended yield', `${overallYield.toFixed(2)}%`], ['Holdings', portfolio.length]].map(([label,value])=><div className="mini-stat" key={label}><span>{label}</span><b>{value}</b></div>)}</section>{portfolio.length > 0 && <section className="panel capital-story"><div><p className="eyebrow">CAPITAL STORY</p><h2>Your income on the money you put in.</h2><p>Cost basis stays fixed when market values refresh, so you can separate price movement from income production.</p></div><div className="capital-metrics"><div><span>Value vs. basis</span><b className={totalGainLoss >= 0 ? 'positive' : 'negative'}>{totalGainLoss >= 0 ? '+' : '−'}${Math.abs(totalGainLoss).toFixed(0)}</b><em>{totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(1)}%</em></div><div><span>Yield on cost</span><b>{basisYield.toFixed(2)}%</b><em>Current yield {overallYield.toFixed(2)}%</em></div><div><span>Original capital</span><b>${totalCostBasis.toLocaleString()}</b><em>Across {portfolio.length} holding{portfolio.length === 1 ? '' : 's'}</em></div></div></section>}<section className="panel holdings-panel"><div className="panel-heading"><div><h2>Income portfolio</h2><p>Model how each holding changes your income engine</p></div><div className="portfolio-actions"><button className="ghost" onClick={openImport}><FileUp size={13}/>Import</button><button className="ghost" onClick={exportPortfolio}>Export CSV</button><button className="primary" onClick={openHoldingForm}><Plus size={16}/>Add holding</button></div></div>{missingYieldCount > 0 && <div className="yield-callout"><span>{missingYieldCount} holding{missingYieldCount === 1 ? '' : 's'} need dividend-yield data.</span><button onClick={openDataSources}>Connect market data →</button></div>}<div className="holdings-table">{portfolio.length ? <><div className="holding-row heading"><span>Investment</span><span>Market value</span><span>Yield</span><span>Annual income</span><span/></div>{portfolio.map(h=>{ const basis = Number(h.costBasis || h.value); const change = h.value - basis; const yieldOnCost = basis ? h.income / basis * 100 : 0; return <div className="holding-row" key={`${h.portfolioId}-${h.symbol}`}><div className="investment"><div className="ticker" style={{background:h.color}}>{h.symbol.slice(0,2)}</div><span><b>{h.symbol}{h.simulated && <i className="simulated-badge">Simulated</i>}</b><em>{h.name}{h.portfolioName && ` · ${h.portfolioName}`}</em></span></div><span>${h.value.toLocaleString()}<small className={change >= 0 ? 'holding-gain' : 'holding-loss'}>{change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(0)} · {yieldOnCost.toFixed(1)}% YOC</small></span><span>{Number(h.yield) ? `${h.yield}%` : <button className="missing-yield" onClick={openDataSources}>Add yield</button>}</span><strong>{Number(h.yield) ? `$${h.income.toFixed(0)}` : '—'}</strong><span className="holding-actions"><button className="lens-button" onClick={()=>setLensHolding(h)}>Lens</button><button className="remove" onClick={()=>removeHolding(h.symbol, h.portfolioId)}>Remove</button></span></div>;})}</> : <div className="empty-state"><div>＋</div><h3>Your portfolio is ready for its first holding.</h3><p>Add an ETF or stock manually, import a file, or use Discover to start an income simulation.</p><span><button className="primary" onClick={openImport}>Import portfolio</button><button className="ghost" onClick={openHoldingForm}>Add holding</button></span></div>}</div>{selectedPortfolioId !== 'combined' && <div className="portfolio-danger"><span>Managing {portfolioName}</span>{canDeletePortfolio && <button onClick={deletePortfolio}>Delete portfolio</button>}</div>}</section><section className="panel tuneup-panel"><div className="panel-heading"><div><p className="eyebrow">PORTFOLIO TUNE-UP</p><h2>Use your next investment intentionally.</h2></div><label className="amount-input">Investment amount <div className="input-prefix"><span>$</span><input type="number" min="0" value={investmentAmount} onChange={event=>setInvestmentAmount(Number(event.target.value))}/></div></label></div><div className="tuneup-grid"><div><span className="tuneup-label">Consider adding</span><h3>{suggested.symbol}</h3><p>${investmentAmount.toLocaleString()} at {suggested.yield} could add about <strong>${(investmentAmount * Number.parseFloat(suggested.yield) / 100).toFixed(0)}/yr</strong> in estimated income.</p><span className="tag">Higher yield</span><button className="simulate-button" onClick={()=>simulateSuggested(investmentAmount)}>Simulate ${investmentAmount.toLocaleString()} in {suggested.symbol}</button></div><div><span className="tuneup-label">Review exposure</span><h3>{lowestYield ? lowestYield.symbol : '—'}</h3><p>{lowestYield ? `${lowestYield.symbol} has the lowest current yield (${lowestYield.yield}%). Compare its role before adding more capital.` : 'Add holdings to receive portfolio-specific observations.'}</p><span className="tag subtle">Portfolio balance</span></div></div><p className="advice-note">Illustrative portfolio observations, not investment advice.</p></section><RebalancePlanner portfolio={portfolio} totalValue={totalValue} simulateContribution={simulateContribution}/>{lensHolding && <HoldingLens holding={lensHolding} portfolio={portfolio} onClose={()=>setLensHolding(null)}/>}</div>
}

function HoldingModal({ onClose, onSave }) {
  const [draft, setDraft] = useState({ symbol: '', name: '', value: 2500, costBasis: 2500, quantity: '', yield: 4 });
  const change = key => event => setDraft(current => ({ ...current, [key]: event.target.value }));
  const submit = event => { event.preventDefault(); onSave({ ...draft, symbol: draft.symbol.toUpperCase(), value: Number(draft.value), costBasis: Number(draft.costBasis), quantity: Number(draft.quantity) || 0, yield: Number(draft.yield) }); };
  return <div className="modal-backdrop"><form className="modal holding-modal" onSubmit={submit}><button type="button" className="close" onClick={onClose}><X/></button><p className="eyebrow">PORTFOLIO SIMULATION</p><h2>Add a holding</h2><p className="modal-intro">Use market value, your original capital, and dividend yield to separate portfolio growth from income.</p><div className="field-grid"><label>Symbol<input required maxLength="8" placeholder="e.g. SCHD" value={draft.symbol} onChange={change('symbol')}/></label><label>Annual yield<input required type="number" min="0" step="0.01" value={draft.yield} onChange={change('yield')}/></label></div><label>Investment name<input required placeholder="e.g. Schwab U.S. Dividend Equity ETF" value={draft.name} onChange={change('name')}/></label><div className="field-grid"><label>Market value <div className="input-prefix"><span>$</span><input required type="number" min="0" value={draft.value} onChange={change('value')}/></div></label><label>Original capital <div className="input-prefix"><span>$</span><input required type="number" min="0" value={draft.costBasis} onChange={change('costBasis')}/></div></label></div><label>Shares <input type="number" min="0" step="any" placeholder="Optional" value={draft.quantity} onChange={change('quantity')}/></label><div className="income-preview"><span>Estimated annual income</span><b>${(Number(draft.value || 0) * Number(draft.yield || 0) / 100).toFixed(2)}</b></div><button className="primary full" type="submit">Add to portfolio</button></form></div>
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

function SettingsScreen({ config, saveConfig, refreshMarketData, refreshing, selectedName, holdingsWithQuantity, providerUpdatedAt, portfolioSize, resetAllData }) {
  const [provider, setProvider] = useState(config.provider || 'alpha-vantage');
  const [key, setKey] = useState(config.apiKey || '');
  const [secret, setSecret] = useState(config.apiSecret || '');
  const [taxRate, setTaxRate] = useState(Number(config.taxRate || 0));
  const [incomeViewMode, setIncomeViewMode] = useState(config.incomeViewMode || 'gross');
  const [saved, setSaved] = useState(false);
  const isAlpaca = provider === 'alpaca';
  const save = () => { saveConfig({ provider, apiKey: key.trim(), apiSecret: secret.trim(), taxRate: Math.max(0, Math.min(100, Number(taxRate) || 0)), incomeViewMode }); setSaved(true); };
  const refreshedLabel = providerUpdatedAt ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(providerUpdatedAt)) : 'Not refreshed yet';
  return <div className="screen-stack"><section className="panel source-hero"><p className="eyebrow">SETTINGS</p><h2>Manage your local workspace.</h2><p>Connect optional market data, choose an estimated tax display, or reset this browser’s Divrion workspace.</p></section><section className="source-ledger"><article className="panel source-ledger-card"><Landmark size={18}/><div><span>Official-source foundation</span><b>Issuer announcements + SEC filings</b><p>Best for confirmed US dividend events and company disclosures.</p></div><em>Backend-ready</em></article><article className="panel source-ledger-card"><ShieldCheck size={18}/><div><span>Your portfolio</span><b>{portfolioSize} holding{portfolioSize === 1 ? '' : 's'} · local only</b><p>Imports and calculations stay in this browser unless you connect a provider.</p></div><em>Private</em></article></section><section className="source-layout"><div className="panel source-config"><div className="panel-heading"><div><h2>Optional market-data connection</h2><p>Use your own provider subscription for price and yield enrichment.</p></div><span className={config.apiKey ? 'connection-status connected' : 'connection-status'}>{config.apiKey ? 'Configured' : 'Not connected'}</span></div><label>Provider<select value={provider} onChange={event=>{setProvider(event.target.value);setSaved(false);}}><option value="alpha-vantage">Alpha Vantage</option><option value="alpaca">Alpaca Market Data</option></select></label><p className="field-help">{isAlpaca ? 'Alpaca refreshes US stock and ETF prices and uses cash-dividend corporate actions to calculate trailing yield.' : 'Prices and dividend yield are refreshed from your provider.'}</p><label>{isAlpaca ? 'Alpaca API key ID' : 'API key'}<input type="password" placeholder={isAlpaca ? 'Paste your Alpaca key ID' : 'Paste your Alpha Vantage API key'} value={key} onChange={event=>{setKey(event.target.value);setSaved(false);}}/></label>{isAlpaca && <label>Alpaca secret key<input type="password" placeholder="Paste your Alpaca secret key" value={secret} onChange={event=>{setSecret(event.target.value);setSaved(false);}}/></label>}<button className="primary" onClick={save} disabled={!key.trim() || (isAlpaca && !secret.trim())}>{saved ? 'Saved locally' : 'Save connection'}</button></div><div className="panel refresh-panel"><p className="eyebrow">MARKET REFRESH</p><h2>Refresh {selectedName}</h2><p>{holdingsWithQuantity} of {portfolioSize} holdings include share quantities and are ready for price-based valuation.</p><button className="primary full" disabled={!config.apiKey || (config.provider === 'alpaca' && !config.apiSecret) || !holdingsWithQuantity || refreshing} onClick={refreshMarketData}>{refreshing ? 'Refreshing market data…' : 'Refresh market data'}</button><p className="source-note">Last provider refresh: <strong>{refreshedLabel}</strong></p></div></section><section className="panel tax-panel"><div className="panel-heading"><div><p className="eyebrow">ESTIMATED DIVIDEND TAX</p><h2>Choose how income is displayed.</h2><p>This local estimate is a planning aid—not tax advice.</p></div><span className="estimate-badge">Local only</span></div><div className="tax-controls"><label>Estimated tax rate <div className="input-prefix"><input type="number" min="0" max="100" step="0.1" value={taxRate} onChange={event=>{setTaxRate(event.target.value);setSaved(false);}}/><em>%</em></div></label><label className="tax-mode"><input type="checkbox" checked={incomeViewMode === 'after-tax'} onChange={event=>{setIncomeViewMode(event.target.checked ? 'after-tax' : 'gross');setSaved(false);}}/><span><b>Show income after estimated tax</b><em>{incomeViewMode === 'after-tax' ? 'Income figures, coverage, calendar payments, and plans use this after-tax estimate.' : 'Keep income gross and display estimated tax as supporting context.'}</em></span></label><button className="primary" onClick={save}>{saved ? 'Tax settings saved' : 'Save tax settings'}</button></div></section><section className="panel source-support"><h2>How Divrion treats your data</h2><div><span>1</span><p><strong>Imported values</strong> are your source of truth until a market refresh is run.</p></div><div><span>2</span><p><strong>Provider values</strong> update price, calculated value, yield, and estimated annual income.</p></div><div><span>3</span><p><strong>Tax estimates</strong> are local planning assumptions and should be reviewed with a qualified professional.</p></div></section><section className="panel reset-panel"><div><p className="eyebrow">DANGER ZONE</p><h2>Reset local data</h2><p>Delete all portfolios, holdings, income-plan settings, expenses, and saved market-data credentials from this browser.</p></div><button className="danger-button" onClick={resetAllData}>Reset all data</button></section></div>
}

const paymentMonthsFor = holding => {
  const frequency = Math.max(1, Math.min(12, Number(holding.dividendFrequency) || 4));
  const interval = Math.max(1, Math.round(12 / frequency));
  const seed = [...holding.symbol].reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
  return { frequency, interval, offset: seed % interval, day: 4 + seed % 23 };
};

const buildCalendarEvents = (portfolio, month) => portfolio.flatMap(holding => {
  if (!Number(holding.income)) return [];
  const { frequency, interval, offset, day } = paymentMonthsFor(holding);
  const eventMonth = month.getFullYear() * 12 + month.getMonth();
  if ((eventMonth - offset) % interval !== 0) return [];
  const date = new Date(month.getFullYear(), month.getMonth(), Math.min(day, new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()));
  return [{ id: `${holding.portfolioId}-${holding.symbol}-${date.toISOString()}`, date, holding, amount: holding.income / frequency, frequency }];
}).sort((a, b) => a.date - b.date);

function CalendarScreen({ portfolio, navigate }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(null);
  const events = buildCalendarEvents(portfolio, month);
  const total = events.reduce((sum, event) => sum + event.amount, 0);
  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const dayEvents = selectedDay ? events.filter(event => event.date.getDate() === selectedDay) : events;
  const monthTitle = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(month);
  const moveMonth = direction => { setSelectedDay(null); setMonth(current => new Date(current.getFullYear(), current.getMonth() + direction, 1)); };
  const today = new Date();
  return <div className="screen-stack calendar-screen">
    <section className="calendar-hero panel"><div><p className="eyebrow">INCOME SCHEDULE</p><h2>See the rhythm behind your income.</h2><p>Payments are projected from each holding’s annual income and default quarterly cadence. They are planning estimates, not declared dividends.</p></div><div className="calendar-total"><span>Projected this month</span><b>${total.toFixed(0)}</b><em>{events.length} payment{events.length === 1 ? '' : 's'}</em></div></section>
    <section className="calendar-layout"><div className="panel calendar-panel"><div className="panel-heading"><div><h2>{monthTitle}</h2><p>Choose a date to focus the payment list.</p></div><div className="calendar-controls"><button className="icon-button" aria-label="Previous month" onClick={()=>moveMonth(-1)}><ChevronLeft size={17}/></button><button className="ghost" onClick={()=>{setSelectedDay(null);setMonth(new Date(today.getFullYear(), today.getMonth(), 1));}}>Today</button><button className="icon-button" aria-label="Next month" onClick={()=>moveMonth(1)}><ChevronRight size={17}/></button></div></div><div className="calendar-grid"><div className="calendar-weekdays">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day=><span key={day}>{day}</span>)}</div><div className="calendar-days">{Array.from({ length: firstWeekday }, (_, index)=><i key={`empty-${index}`}/>) }{Array.from({ length: days }, (_, index) => { const day = index + 1; const payments = events.filter(event => event.date.getDate() === day); const isToday = today.getFullYear() === month.getFullYear() && today.getMonth() === month.getMonth() && today.getDate() === day; return <button key={day} className={`calendar-day ${selectedDay === day ? 'selected' : ''} ${isToday ? 'today' : ''}`} onClick={()=>setSelectedDay(day)}><span>{day}</span>{payments.slice(0,2).map(event=><em key={event.id} style={{ '--event-color': event.holding.color }}>{event.holding.symbol}</em>)}{payments.length > 2 && <small>+{payments.length - 2}</small>}</button>; })}</div></div></div><aside className="panel payment-panel"><div className="panel-heading"><div><p className="eyebrow">{selectedDay ? `${monthTitle} ${selectedDay}` : 'THIS MONTH'}</p><h2>{selectedDay ? 'Scheduled payments' : 'Payment schedule'}</h2></div><span className="estimate-badge">Estimated</span></div>{dayEvents.length ? <div className="payment-list">{dayEvents.map(event=><article className="payment-row" key={event.id}><div className="ticker" style={{background:event.holding.color}}>{event.holding.symbol.slice(0,2)}</div><div><b>{event.holding.symbol}</b><span>{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(event.date)} · {event.frequency === 12 ? 'monthly' : event.frequency === 4 ? 'quarterly' : `${event.frequency}× yearly`}</span></div><strong>+${event.amount.toFixed(2)}</strong></article>)}</div> : <div className="calendar-empty"><CalendarDays size={20}/><h3>No projected payments</h3><p>{portfolio.length ? 'Choose another month or add a holding with dividend income.' : 'Add holdings to start building your income schedule.'}</p>{!portfolio.length && <button className="primary" onClick={()=>navigate('Portfolio')}>Add holdings</button>}</div>}<p className="calendar-disclaimer">Dates are deliberately labeled as estimates until Divrion has a verified issuer or provider payment date.</p></aside></section>
  </div>;
}

function IncomePlanScreen({ goal, setGoal, monthly, setMonthly, risk, setRisk, expenses, expenseItems, setExpenseItems, coverage, monthlyIncome, milestones, setMilestones }) {
  const [cadence, setCadence] = useState('Monthly');
  const [sectors, setSectors] = useState(['Healthcare', 'Financials']);
  const [reinvest, setReinvest] = useState(true);
  const annualYield = risk === 'Conservative' ? .032 : risk === 'Balanced' ? .041 : .048;
  const goalValue = cadence === 'Yearly' ? goal * 12 : cadence === 'Daily' ? goal / 30 : goal;
  const updateGoal = value => setGoal(cadence === 'Yearly' ? value / 12 : cadence === 'Daily' ? value * 30 : value);
  const updateExpense = (id, amount) => setExpenseItems(items => items.map(item => item.id === id ? { ...item, amount: Number(amount) } : item));
  const addExpense = () => setExpenseItems(items => [...items, { id: crypto.randomUUID(), label: 'New expense', amount: 0 }]);
  const scenarios = [{ name: 'Cautious', growth: .01, tone: 'cautious' }, { name: 'Base case', growth: .04, tone: 'base' }, { name: 'Tailwind', growth: .07, tone: 'tailwind' }];
  const incomeAfterMonths = (months, growth) => { let income = monthlyIncome; for (let month = 0; month < months; month += 1) { income += monthly * annualYield / 12; if (reinvest) income *= 1 + growth / 12; } return income; };
  const coverageMonth = growth => { for (let month = 0; month <= 600; month += 1) if (incomeAfterMonths(month, growth) >= expenses) return month; return null; };
  const targetDate = months => { if (months === null) return 'Beyond 50 years'; const date = new Date(); date.setMonth(date.getMonth() + months); return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(date); };
  const milestoneMonth = amount => { for (let month = 0; month <= 600; month += 1) if (incomeAfterMonths(month, .04) >= amount) return month; return null; };
  const updateMilestone = (id, key, value) => setMilestones(current => current.map(item => item.id === id ? { ...item, [key]: key === 'amount' ? Number(value) : value } : item));
  const addMilestone = () => setMilestones(current => [...current, { id: crypto.randomUUID(), label: 'New milestone', amount: Math.max(100, Math.round(expenses / 4)) }]);
  const baseForecast = [0, 1, 2, 3, 4].map(year => ({ year, income: incomeAfterMonths(year * 12, .04) }));
  const forecastMax = Math.max(goal, expenses, ...baseForecast.map(point => point.income));
  return <div className="screen-stack"><section className="plan-hero panel"><div><p className="eyebrow">BUILD YOUR ROADMAP</p><h2>Make your income goal actionable.</h2><p>Adjust your target and contribution to see the path ahead.</p></div><div className="plan-figure"><b>{targetDate(coverageMonth(.04))}</b><span>base coverage</span></div></section><section className="plan-layout"><div className="panel form-panel"><h2>Your targets</h2><div className="cadence-tabs">{['Monthly','Yearly','Daily'].map(x=><button key={x} className={cadence===x?'selected':''} onClick={()=>setCadence(x)}>{x}</button>)}</div><label>{cadence} income goal <div className="input-prefix"><span>$</span><input type="number" value={Math.round(goalValue)} onChange={e=>updateGoal(Number(e.target.value))}/><em>/ {cadence.toLowerCase().replace('ly','')}</em></div></label><label>Monthly investment <div className="input-prefix"><span>$</span><input type="number" value={monthly} onChange={e=>setMonthly(Number(e.target.value))}/><em>/ month</em></div></label><label>Risk profile <div className="risk-options">{['Conservative','Balanced','Growth'].map(x=><button key={x} className={risk===x?'selected':''} onClick={()=>setRisk(x)}>{x}</button>)}</div></label><label className="reinvest-control"><span>Reinvest projected income</span><button type="button" className={reinvest ? 'selected' : ''} onClick={()=>setReinvest(current=>!current)}>{reinvest ? 'On' : 'Off'}</button></label><label>Preferred sectors <div className="sector-chips">{['Healthcare','Financials','Utilities','Technology'].map(sector=><button key={sector} className={sectors.includes(sector)?'selected':''} onClick={()=>setSectors(current=>current.includes(sector)?current.filter(x=>x!==sector):[...current,sector])}>{sector}</button>)}</div></label></div><div className="panel expense-panel"><div className="panel-heading"><div><p className="eyebrow">EXPENSE COVERAGE</p><h2>Monthly expenses</h2></div><button className="ghost" onClick={addExpense}>+ Add category</button></div><p>Track the recurring costs your portfolio is designed to cover.</p><div className="expense-list">{expenseItems.map(item=><div key={item.id}><input aria-label="Expense category" value={item.label} onChange={event=>setExpenseItems(items=>items.map(current=>current.id===item.id?{...current,label:event.target.value}:current))}/><span>$<input aria-label={`${item.label} amount`} type="number" min="0" value={item.amount} onChange={event=>updateExpense(item.id,event.target.value)}/></span><button aria-label={`Remove ${item.label}`} onClick={()=>setExpenseItems(items=>items.filter(current=>current.id!==item.id))}>×</button></div>)}</div><div className="expense-total"><span>Total monthly expenses</span><b>${expenses.toLocaleString()}</b></div><div className="coverage-summary"><b>{coverage}%</b><span>${monthlyIncome.toFixed(0)} of ${expenses.toLocaleString()} covered</span></div></div></section><section className="panel runway-panel"><div className="panel-heading"><div><p className="eyebrow">DECISION RUNWAY</p><h2>How choices move your coverage date.</h2><p>Each scenario assumes new contributions earn the selected plan yield and dividends grow at the stated rate.</p></div><b className="forecast-yield">{(annualYield * 100).toFixed(1)}% plan yield</b></div><div className="scenario-grid">{scenarios.map(scenario => { const month = coverageMonth(scenario.growth); const incomeInFourYears = incomeAfterMonths(48, scenario.growth); return <article className={`scenario-card ${scenario.tone}`} key={scenario.name}><span>{scenario.name}</span><b>{targetDate(month)}</b><em>expense coverage</em><p>{(scenario.growth * 100).toFixed(0)}% annual dividend growth · ${incomeInFourYears.toFixed(0)}/mo in year 4</p></article>; })}</div><div className="forecast-chart">{baseForecast.map(point=><div className="forecast-column" key={point.year}><div className="forecast-value">${point.income.toFixed(0)}</div><div className="forecast-bar-wrap"><i className="forecast-goal" style={{bottom:`${expenses/forecastMax*100}%`}}/><div className="forecast-bar" style={{height:`${Math.max(8,point.income/forecastMax*100)}%`}}/></div><span>{point.year === 0 ? 'Today' : `Year ${point.year}`}</span></div>)}</div><p className="forecast-note"><i/> Monthly expense coverage: ${expenses.toLocaleString()} · Base case assumes {reinvest ? 'reinvestment' : 'cash distributions'}</p></section><section className="panel milestone-panel"><div className="panel-heading"><div><p className="eyebrow">GOAL MILESTONES</p><h2>Turn future income into meaningful wins.</h2><p>Set a monthly amount you want your portfolio to cover, then follow its base-case path.</p></div><button className="ghost" onClick={addMilestone}>+ Add milestone</button></div><div className="milestone-list">{milestones.map(milestone => { const progress = milestone.amount ? Math.min(100, monthlyIncome / milestone.amount * 100) : 0; const month = milestoneMonth(milestone.amount); return <article className="milestone-row" key={milestone.id}><div className="milestone-fields"><input aria-label="Milestone label" value={milestone.label} onChange={event=>updateMilestone(milestone.id, 'label', event.target.value)}/><label>$<input aria-label={`${milestone.label} monthly amount`} type="number" min="0" value={milestone.amount} onChange={event=>updateMilestone(milestone.id, 'amount', event.target.value)}/><em>/mo</em></label></div><div className="milestone-progress"><div><span>{progress.toFixed(0)}% covered today</span><b>{progress >= 100 ? 'Covered now' : targetDate(month)}</b></div><i><em style={{width:`${progress}%`}}/></i></div><button className="remove" aria-label={`Remove ${milestone.label}`} onClick={()=>setMilestones(current=>current.filter(item=>item.id !== milestone.id))}>Remove</button></article>; })}</div>{!milestones.length && <div className="milestone-empty"><TrendingUp size={18}/><span>Add a milestone such as “Cover utilities” or “Cover rent” to make the runway more tangible.</span></div>}</section></div>
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
  const [milestones, setMilestones] = useState(savedPlan.milestones || [{ id: 'first-income-win', label: 'Cover a monthly bill', amount: 250 }]);
  const [showHoldingForm, setShowHoldingForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [toast, setToast] = useState('');
  const [incomeCadence, setIncomeCadence] = useState('Monthly');
  const [dataSourceConfig, setDataSourceConfig] = useState(() => { try { return JSON.parse(localStorage.getItem('divrion-data-source')) || { provider: 'alpha-vantage', apiKey: '', apiSecret: '', taxRate: 0, incomeViewMode: 'gross' }; } catch { return { provider: 'alpha-vantage', apiKey: '', apiSecret: '', taxRate: 0, incomeViewMode: 'gross' }; } });
  const [refreshing, setRefreshing] = useState(false);
  const activePortfolio = portfolios.find(item => item.id === selectedPortfolioId) || portfolios[0];
  const portfolio = selectedPortfolioId === 'combined' ? portfolios.flatMap(group => group.holdings.map(holding => ({ ...holding, portfolioId: group.id, portfolioName: group.name }))) : (activePortfolio?.holdings || []).map(holding => ({ ...holding, portfolioId: activePortfolio.id, portfolioName: activePortfolio.name }));
  const taxRate = Math.max(0, Math.min(100, Number(dataSourceConfig.taxRate) || 0));
  const incomeMultiplier = dataSourceConfig.incomeViewMode === 'after-tax' ? 1 - taxRate / 100 : 1;
  const displayPortfolio = portfolio.map(holding => ({ ...holding, income: Number(holding.income || 0) * incomeMultiplier }));
  const totalValue = portfolio.reduce((sum, item) => sum + item.value, 0);
  const totalCostBasis = portfolio.reduce((sum, item) => sum + Number(item.costBasis ?? item.value ?? 0), 0);
  const totalGainLoss = totalValue - totalCostBasis;
  const totalReturn = totalCostBasis ? totalGainLoss / totalCostBasis * 100 : 0;
  const refreshedHoldings = portfolio.filter(item => item.lastUpdated && Number(item.value) > 0).length;
  const annualIncome = displayPortfolio.reduce((sum, item) => sum + item.income, 0);
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
  useEffect(() => localStorage.setItem('divrion-plan', JSON.stringify({ goal, monthly, risk, expenseItems, milestones })), [goal, monthly, risk, expenseItems, milestones]);
  useEffect(() => localStorage.setItem('divrion-data-source', JSON.stringify(dataSourceConfig)), [dataSourceConfig]);
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(''), 2800); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { const onPopState = () => setActive(pageFromPath(window.location.pathname)); window.addEventListener('popstate', onPopState); return () => window.removeEventListener('popstate', onPopState); }, []);
  const navigate = page => { const path = pagePaths[page]; if (path && window.location.pathname !== path) window.history.pushState({}, '', path); setActive(page); };
  const resetAllData = () => {
    if (!window.confirm('Reset all local Divrion data? This permanently deletes your portfolios, holdings, income plan, expenses, and saved market-data credentials from this browser.')) return;
    localStorage.removeItem('divrion-portfolios');
    localStorage.removeItem('divrion-plan');
    localStorage.removeItem('divrion-data-source');
    setPortfolios(emptyPortfolios);
    setSelectedPortfolioId('combined');
    setGoal(1200);
    setMonthly(850);
    setRisk('Balanced');
    setExpenseItems(defaultExpenses);
    setDataSourceConfig({ provider: 'alpha-vantage', apiKey: '', apiSecret: '', taxRate: 0, incomeViewMode: 'gross' });
    setToast('All local Divrion data has been reset');
  };
  const removeHolding = (symbol, sourceId) => setPortfolios(current => current.map(group => group.id !== (sourceId || activePortfolio.id) ? group : { ...group, holdings: group.holdings.filter(holding => holding.symbol !== symbol) }));
  const removeHoldingWithToast = (symbol, sourceId) => { removeHolding(symbol, sourceId); setToast(`${symbol} removed from your simulation`); };
  const addHolding = holding => setPortfolios(current => current.map(group => { if (group.id !== activePortfolio.id) return group; if (group.holdings.some(item => item.symbol === holding.symbol)) { setToast(`${holding.symbol} is already in ${group.name}`); return group; } setToast(`${holding.symbol} added to ${group.name}`); return { ...group, holdings: [...group.holdings, { ...holding, costBasis: Number(holding.costBasis ?? holding.value), income: holding.value * holding.yield / 100, color: holding.color || '#ef789a', simulated: true }] }; }));
  const addRecommendation = r => { addHolding({ symbol: r.symbol, name: r.name, value: 2500, costBasis: 2500, yield: Number.parseFloat(r.yield), sector: r.sector, industry: r.industry, color: r.color }); navigate('Portfolio'); };
  const simulateContribution = (symbol, amount) => {
    const value = Number(amount) || 0;
    if (value <= 0) return setToast('Enter an investment amount above $0');
    const suggestion = recommendations.find(item => item.symbol === symbol);
    if (!suggestion) return setToast('That investment idea is not available right now');
    setPortfolios(current => current.map(group => {
      if (group.id !== activePortfolio.id) return group;
      const existing = group.holdings.find(item => item.symbol === suggestion.symbol);
      return { ...group, holdings: existing ? group.holdings.map(item => item.symbol === suggestion.symbol ? { ...item, value: item.value + value, costBasis: Number(item.costBasis ?? item.value) + value, income: item.income + value * Number.parseFloat(suggestion.yield) / 100, simulated: true } : item) : [...group.holdings, { symbol: suggestion.symbol, name: suggestion.name, value, costBasis: value, yield: Number.parseFloat(suggestion.yield), income: value * Number.parseFloat(suggestion.yield) / 100, sector: suggestion.sector, industry: suggestion.industry, color: suggestion.color, simulated: true }] };
    }));
    setToast(`$${value.toLocaleString()} simulated in ${suggestion.symbol}`);
  };
  const simulateSuggested = amount => simulateContribution('JEPI', amount);
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
    const csv = [['Portfolio', 'Symbol', 'Name', 'Market value', 'Cost basis', 'Annual yield', 'Annual income', 'Simulated'], ...portfolio.map(item => [item.portfolioName, item.symbol, item.name, item.value, item.costBasis ?? item.value, `${item.yield}%`, item.income.toFixed(2), item.simulated ? 'Yes' : 'No'])].map(row => row.map(quote).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'divrion-portfolio.csv'; link.click(); URL.revokeObjectURL(url);
    setToast('Portfolio CSV downloaded');
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">d</span><span>Divrion</span></div>
      <nav>
        {[['Overview', LayoutDashboard], ['Calendar', CalendarDays], ['Income plan', TrendingUp], ['Portfolio', Wallet], ['Discover', Compass]].map(([label, Icon]) => <button key={label} onClick={() => navigate(label)} className={active === label ? 'nav-item active' : 'nav-item'}><Icon size={19}/>{label}</button>)}
      </nav>
      <div className="sidebar-bottom"><button className={active === 'Settings' ? 'nav-item active' : 'nav-item'} onClick={()=>navigate('Settings')}><Settings size={19}/>Settings</button><div className="profile"><div className="avatar">G</div><div><strong>Guest</strong><span>Local session</span></div><ChevronDown size={16}/></div></div>
    </aside>
    <main className={taxRate ? 'app-main has-tax-context' : 'app-main'} data-tax-context={dataSourceConfig.incomeViewMode === 'after-tax' ? `Income shown after an estimated ${taxRate}% dividend tax.` : `Income shown before an estimated ${taxRate}% dividend tax.`}>
      <header><div><p className="eyebrow">{active === 'Overview' ? 'WELCOME, GUEST' : active.toUpperCase()}</p><h1>{active === 'Overview' ? 'Your income, at a glance.' : active}</h1></div><div className="header-actions"><label className="portfolio-switcher"><span>Portfolio</span><select value={selectedPortfolioId} onChange={event=>setSelectedPortfolioId(event.target.value)}><option value="combined">Combined</option>{portfolios.map(group=><option key={group.id} value={group.id}>{group.name}</option>)}</select></label><button className="icon-button" title="Create portfolio" onClick={createPortfolio}><Plus size={18}/></button><button className="icon-button"><CircleHelp size={20}/></button><button className="icon-button notification"><Bell size={20}/><i/></button></div></header>
      {active === 'Overview' && <>{!portfolio.length && <section className="panel newcomer-panel"><div><p className="eyebrow">GET STARTED</p><h2>Build your first income plan in three steps.</h2><p>Add or import holdings, set the monthly income you want to reach, and optionally connect a market-data provider to refresh your portfolio.</p></div><div className="newcomer-actions"><button className="primary" onClick={()=>navigate('Portfolio')}><Plus size={15}/>Create portfolio</button><button className="onboarding-import" onClick={()=>setShowImport(true)}><FileUp size={15}/>Import data</button><button className="onboarding-target" onClick={()=>setShowPlanner(true)}>Set target</button><button className="onboarding-data" onClick={()=>navigate('Settings')}>Connect data source</button></div></section>}<section className="hero-grid">
        <div className="income-card"><div className="income-card-header"><div className="card-label">{incomeCadence.toUpperCase()} PASSIVE INCOME <CircleHelp size={15}/></div><select aria-label="Income timeframe" value={incomeCadence} onChange={event=>setIncomeCadence(event.target.value)}>{['Monthly','Weekly','Daily','Yearly'].map(period=><option key={period}>{period}</option>)}</select></div><div className="income-top"><div><div className="big-number">${incomeView.income.toFixed(0)}<small>/{incomeView.suffix}</small></div><p>{!portfolio.length ? 'Create a portfolio to start tracking income.' : refreshedHoldings !== portfolio.length ? `Performance is unavailable until prices refresh for all ${portfolio.length} holdings.` : totalCostBasis ? <><span className={totalReturn >= 0 ? 'up' : 'down'}>{totalReturn >= 0 ? '↑' : '↓'} {Math.abs(totalReturn).toFixed(1)}%</span> vs. cost basis</> : 'Performance is unavailable until original capital is added.'}</p></div><div className="spark">{portfolio.length ? <svg viewBox="0 0 130 55" preserveAspectRatio="none"><path d="M0 45 C12 38 18 43 28 31 S45 36 55 26 S69 33 78 19 S95 24 105 12 S118 19 130 3" fill="none" stroke="currentColor" strokeWidth="3"/></svg> : <span className="empty-spark">No income history</span>}</div></div><div className="goal-line"><span>{incomeCadence} goal</span><strong>${incomeView.goal.toLocaleString(undefined, { maximumFractionDigits: 0 })} /{incomeView.suffix}</strong></div><div className="progress"><span style={{width: `${goalProgress}%`}}/></div><p className="muted">You’re {goalProgress.toFixed(0)}% of the way there. Keep building.</p></div>
        <div className="coverage-card"><div className="card-label">EXPENSE COVERAGE</div><div className="coverage-body"><div className="donut" style={{'--percent': `${coverage * 3.6}deg`}}><div><b>{coverage}%</b><span>covered</span></div></div><div><h3>${monthlyIncome.toFixed(0)} <span>of ${expenses.toLocaleString()}</span></h3><p>Your portfolio covers {coverage}% of monthly spending.</p><button className="text-button" onClick={() => navigate('Income plan')}>View expenses →</button></div></div></div>
      </section>
      <section className="two-col">
        <div className="panel allocation-panel"><div className="panel-heading"><div><h2>Portfolio allocation</h2><p>How your income portfolio is working</p></div><button className="ghost" onClick={() => navigate('Portfolio')}>View portfolio</button></div><div className={`allocation-content ${allocation.length > 8 ? 'allocation-dense' : ''}`}><div className="allocation-donut" style={{background: allocation.length ? `conic-gradient(${allocation.map((a, i) => `${a.color} ${allocation.slice(0,i).reduce((s,x)=>s+x.share,0)}% ${allocation.slice(0,i+1).reduce((s,x)=>s+x.share,0)}%`).join(',')})` : '#373841'}}><div><strong>${(totalValue/1000).toFixed(1)}k</strong><span>{allocation.length ? 'invested' : 'no holdings'}</span></div></div><div className={`legend ${allocation.length > 8 ? 'legend-large' : allocation.length > 4 ? 'legend-medium' : ''}`}>{allocation.length ? allocation.map(x => <div key={x.symbol}><i style={{background:x.color}}/><span>{x.symbol}{x.simulated && <em className="allocation-simulated">Sim</em>}</span><b>{x.share.toFixed(0)}%</b></div>) : <p className="empty-legend">Add a holding to see your allocation mix.</p>}</div></div></div>
        <div className="panel activity"><div className="panel-heading"><div><h2>Income activity</h2><p>Upcoming dividends and distributions</p></div><button className="ghost" onClick={()=>navigate('Calendar')}>Open calendar</button></div>{portfolio.slice(0,3).map((h,i)=>{ const days=[3,9,16][i]; return <div className="activity-row" key={h.symbol}><div className="ticker" style={{background:h.color}}>{h.symbol.slice(0,2)}</div><div><strong>{h.symbol} dividend</strong><span>Estimated in {days} day{days === 1 ? '' : 's'}</span></div><b>+${(h.income/4).toFixed(2)}</b></div>})}<div className="month-income"><span>Expected for the rest of this month</span><b>+${(annualIncome / 12 * .72).toFixed(0)}</b></div></div>
      </section>
      <ConcentrationLens portfolio={displayPortfolio} navigate={navigate}/>
      <IncomeConfidencePanel portfolio={displayPortfolio} navigate={navigate}/>
      <DiscoverCards filter={filter} setFilter={setFilter} addHolding={addRecommendation}/>
      </>}
      {active === 'Portfolio' && <PortfolioScreen portfolio={displayPortfolio} totalValue={totalValue} annualIncome={annualIncome} overallYield={overallYield} totalCostBasis={totalCostBasis} totalGainLoss={totalGainLoss} totalReturn={totalReturn} removeHolding={removeHoldingWithToast} openHoldingForm={()=>setShowHoldingForm(true)} openImport={()=>setShowImport(true)} simulateSuggested={simulateSuggested} simulateContribution={simulateContribution} exportPortfolio={exportPortfolio} deletePortfolio={deletePortfolio} selectedPortfolioId={selectedPortfolioId} portfolioName={activePortfolio.name} canDeletePortfolio={portfolios.length > 1} openDataSources={()=>navigate('Settings')}/>}
      {active === 'Calendar' && <CalendarScreen portfolio={displayPortfolio} navigate={navigate}/>}
      {active === 'Income plan' && <IncomePlanScreen goal={goal} setGoal={setGoal} monthly={monthly} setMonthly={setMonthly} risk={risk} setRisk={setRisk} expenses={expenses} expenseItems={expenseItems} setExpenseItems={setExpenseItems} coverage={coverage} monthlyIncome={monthlyIncome} milestones={milestones} setMilestones={setMilestones}/>}
      {active === 'Discover' && <DiscoverCards filter={filter} setFilter={setFilter} addHolding={addRecommendation} full/>} 
      {active === 'Settings' && <SettingsScreen config={dataSourceConfig} saveConfig={setDataSourceConfig} refreshMarketData={refreshMarketData} refreshing={refreshing} selectedName={selectedPortfolioId === 'combined' ? 'combined portfolios' : activePortfolio.name} holdingsWithQuantity={portfolio.filter(item => Number(item.quantity) > 0).length} portfolioSize={portfolio.length} providerUpdatedAt={portfolio.map(item => item.lastUpdated).filter(Boolean).sort().at(-1)} resetAllData={resetAllData}/>}
    </main>
    {showPlanner && <div className="modal-backdrop"><div className="modal"><button className="close" onClick={()=>setShowPlanner(false)}><X/></button><p className="eyebrow">INCOME PLAN</p><h2>Design your income engine</h2><p className="modal-intro">Tune the inputs and we’ll shape a portfolio path toward your goal.</p><label>Monthly passive-income goal <div className="input-prefix"><span>$</span><input type="number" value={goal} onChange={e=>setGoal(Number(e.target.value))}/><em>/ month</em></div></label><label>Monthly contribution <div className="input-prefix"><span>$</span><input type="number" value={monthly} onChange={e=>setMonthly(Number(e.target.value))}/><em>/ month</em></div></label><label>Risk preference <div className="risk-options">{['Conservative','Balanced','Growth'].map(x=><button key={x} className={risk===x?'selected':''} onClick={()=>setRisk(x)}>{x}</button>)}</div></label><div className="plan-result"><span>Suggested target yield</span><b>{risk==='Conservative'?'3.2%':risk==='Balanced'?'4.1%':'4.8%'}</b><span>Estimated time to goal</span><b>{risk==='Conservative'?'5 years':'3 years, 8 months'}</b></div><button className="primary full" onClick={()=>setShowPlanner(false)}>Save income plan</button></div></div>}
    {showHoldingForm && <HoldingModal onClose={()=>setShowHoldingForm(false)} onSave={holding=>{ addHolding(holding); setShowHoldingForm(false); }}/>} 
    {showImport && <ImportModal onClose={()=>setShowImport(false)} onImport={importPortfolios}/>} 
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>
}
createRoot(document.getElementById('root')).render(<App/>);
