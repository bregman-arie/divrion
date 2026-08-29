import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Bell, ChevronDown, CircleHelp, Compass, LayoutDashboard, Plus, Search, Settings, SlidersHorizontal, TrendingUp, Wallet, X } from 'lucide-react';
import './styles.css';

const holdings = [
  { symbol: 'SCHD', name: 'Schwab U.S. Dividend Equity', value: 18420, yield: 3.82, income: 703.64, color: '#6e5af7' },
  { symbol: 'VYM', name: 'Vanguard High Dividend Yield', value: 12680, yield: 2.86, income: 362.65, color: '#31bb92' },
  { symbol: 'O', name: 'Realty Income Corp.', value: 7950, yield: 5.39, income: 428.51, color: '#f5a742' },
  { symbol: 'DGRO', name: 'iShares Core Dividend Growth', value: 6500, yield: 2.24, income: 145.60, color: '#4d9df2' },
];
const recommendations = [
  { symbol: 'VIG', name: 'Vanguard Dividend Appreciation', yield: '1.7%', growth: '10.2%', tag: 'Dividend growth', color: '#7a67fa' },
  { symbol: 'JEPI', name: 'JPMorgan Equity Premium Income', yield: '7.8%', growth: '4.1%', tag: 'High income', color: '#d18bff' },
  { symbol: 'XLV', name: 'Health Care Select Sector', yield: '1.4%', growth: '8.6%', tag: 'Healthcare', color: '#43c6a1' },
];

function DiscoverCards({ filter, setFilter, addHolding }) {
  const visible = recommendations.filter(r => filter === 'All' || (filter === 'High yield' && r.tag === 'High income') || (filter === 'Growth' && r.tag === 'Dividend growth') || (filter === 'Sectors' && r.tag === 'Healthcare'));
  return <section className="panel recommendations"><div className="panel-heading"><div><h2>Discover your next income investment</h2><p>Hand-picked to match your plan and preferences</p></div><div className="filter-group">{['All','High yield','Growth','Sectors'].map(f=><button key={f} className={filter===f?'selected':''} onClick={()=>setFilter(f)}>{f}</button>)}</div></div><div className="rec-grid">{visible.map(r=><article className="rec" key={r.symbol}><div className="rec-head"><div className="ticker" style={{background:r.color}}>{r.symbol.slice(0,2)}</div><button className="icon-button" onClick={addHolding}><Plus size={17}/></button></div><h3>{r.symbol}</h3><p>{r.name}</p><span className="tag">{r.tag}</span><div className="rec-stats"><div><span>Dividend yield</span><b>{r.yield}</b></div><div><span>5y div. growth</span><b>{r.growth}</b></div></div><button className="add-button" onClick={addHolding}>Add to simulation</button></article>)}</div></section>
}

function PortfolioScreen({ portfolio, totalValue, annualIncome, overallYield, removeHolding, addHolding }) {
  return <div className="screen-stack"><section className="stats-grid">{[['Portfolio value', `$${totalValue.toLocaleString()}`], ['Annual income', `$${annualIncome.toFixed(0)}`], ['Blended yield', `${overallYield.toFixed(2)}%`], ['Holdings', portfolio.length]].map(([label,value])=><div className="mini-stat" key={label}><span>{label}</span><b>{value}</b></div>)}</section><section className="panel holdings-panel"><div className="panel-heading"><div><h2>Income portfolio</h2><p>Model how each holding changes your income engine</p></div><button className="primary" onClick={addHolding}><Plus size={16}/>Add holding</button></div><div className="holdings-table"><div className="holding-row heading"><span>Investment</span><span>Market value</span><span>Yield</span><span>Annual income</span><span/></div>{portfolio.map(h=><div className="holding-row" key={h.symbol}><div className="investment"><div className="ticker" style={{background:h.color}}>{h.symbol.slice(0,2)}</div><span><b>{h.symbol}</b><em>{h.name}</em></span></div><span>${h.value.toLocaleString()}</span><span>{h.yield}%</span><strong>${h.income.toFixed(0)}</strong><button className="remove" onClick={()=>removeHolding(h.symbol)}>Remove</button></div>)}</div></section></div>
}

function IncomePlanScreen({ goal, setGoal, monthly, setMonthly, risk, setRisk, expenses, setExpenses, coverage, monthlyIncome }) {
  const [cadence, setCadence] = useState('Monthly');
  const annualYield = risk === 'Conservative' ? .032 : risk === 'Balanced' ? .041 : .048;
  const goalValue = cadence === 'Yearly' ? goal * 12 : cadence === 'Daily' ? goal / 30 : goal;
  const updateGoal = value => setGoal(cadence === 'Yearly' ? value / 12 : cadence === 'Daily' ? value * 30 : value);
  const years = Math.max(1, Math.ceil((goal * 12 * 10) / (monthly * 12 * annualYield + 1)) / 10);
  const forecast = [0, 1, 2, 3, 4].map(year => ({ year, income: monthlyIncome + monthly * year * annualYield * 1.35 }));
  const forecastMax = Math.max(goal, ...forecast.map(x => x.income));
  return <div className="screen-stack"><section className="plan-hero panel"><div><p className="eyebrow">BUILD YOUR ROADMAP</p><h2>Make your income goal actionable.</h2><p>Adjust your target and contribution to see the path ahead.</p></div><div className="plan-figure"><b>{years.toFixed(1)} yrs</b><span>to target</span></div></section><section className="plan-layout"><div className="panel form-panel"><h2>Your targets</h2><div className="cadence-tabs">{['Monthly','Yearly','Daily'].map(x=><button key={x} className={cadence===x?'selected':''} onClick={()=>setCadence(x)}>{x}</button>)}</div><label>{cadence} income goal <div className="input-prefix"><span>$</span><input type="number" value={Math.round(goalValue)} onChange={e=>updateGoal(Number(e.target.value))}/><em>/ {cadence.toLowerCase().replace('ly','')}</em></div></label><label>Monthly investment <div className="input-prefix"><span>$</span><input type="number" value={monthly} onChange={e=>setMonthly(Number(e.target.value))}/><em>/ month</em></div></label><label>Risk profile <div className="risk-options">{['Conservative','Balanced','Growth'].map(x=><button key={x} className={risk===x?'selected':''} onClick={()=>setRisk(x)}>{x}</button>)}</div></label></div><div className="panel expense-panel"><p className="eyebrow">EXPENSE COVERAGE</p><h2>Connect income to real life.</h2><p>Enter your monthly essentials to track financial independence.</p><label>Monthly expenses <div className="input-prefix"><span>$</span><input type="number" value={expenses} onChange={e=>setExpenses(Number(e.target.value))}/><em>/ month</em></div></label><div className="coverage-summary"><b>{coverage}%</b><span>${monthlyIncome.toFixed(0)} of ${expenses.toLocaleString()} covered</span></div></div></section><section className="panel forecast-panel"><div className="panel-heading"><div><p className="eyebrow">PROJECTED MONTHLY INCOME</p><h2>Your four-year income runway</h2></div><b className="forecast-yield">{(annualYield * 100).toFixed(1)}% target yield</b></div><div className="forecast-chart">{forecast.map(point=><div className="forecast-column" key={point.year}><div className="forecast-value">${point.income.toFixed(0)}</div><div className="forecast-bar-wrap"><i className="forecast-goal" style={{bottom:`${goal/forecastMax*100}%`}}/><div className="forecast-bar" style={{height:`${Math.max(8,point.income/forecastMax*100)}%`}}/></div><span>{point.year === 0 ? 'Today' : `Year ${point.year}`}</span></div>)}</div><p className="forecast-note"><i/> Target income: ${goal.toLocaleString()} / month</p></section></div>
}

function App() {
  const [active, setActive] = useState('Overview');
  const [goal, setGoal] = useState(1200);
  const [monthly, setMonthly] = useState(850);
  const [risk, setRisk] = useState('Balanced');
  const [filter, setFilter] = useState('All');
  const [showPlanner, setShowPlanner] = useState(false);
  const [portfolio, setPortfolio] = useState(holdings);
  const [expenses, setExpenses] = useState(2100);
  const totalValue = portfolio.reduce((sum, item) => sum + item.value, 0);
  const annualIncome = portfolio.reduce((sum, item) => sum + item.income, 0);
  const monthlyIncome = annualIncome / 12;
  const coverage = Math.min(100, Math.round((monthlyIncome / expenses) * 100));
  const overallYield = totalValue ? annualIncome / totalValue * 100 : 0;
  const allocation = portfolio.map(h => ({ ...h, share: h.value / totalValue * 100 }));
  const goalProgress = Math.min(100, monthlyIncome / goal * 100);
  const removeHolding = symbol => setPortfolio(p => p.filter(h => h.symbol !== symbol));
  const addHolding = () => setPortfolio(p => [...p, { symbol: 'HDV', name: 'iShares Core High Dividend', value: 4000, yield: 3.48, income: 139.2, color: '#ef789a' }]);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">d</span><span>divrion</span></div>
      <nav>
        {[['Overview', LayoutDashboard], ['Income plan', TrendingUp], ['Portfolio', Wallet], ['Discover', Compass]].map(([label, Icon]) => <button key={label} onClick={() => setActive(label)} className={active === label ? 'nav-item active' : 'nav-item'}><Icon size={19}/>{label}</button>)}
      </nav>
      <div className="sidebar-bottom"><button className="nav-item"><Settings size={19}/>Settings</button><div className="profile"><div className="avatar">AB</div><div><strong>Arie Bregman</strong><span>Free plan</span></div><ChevronDown size={16}/></div></div>
    </aside>
    <main>
      <header><div><p className="eyebrow">{active === 'Overview' ? 'WELCOME BACK, ARIE' : active.toUpperCase()}</p><h1>{active === 'Overview' ? 'Your income, at a glance.' : active}</h1></div><div className="header-actions"><button className="icon-button"><CircleHelp size={20}/></button><button className="icon-button notification"><Bell size={20}/><i/></button><button className="primary" onClick={() => setShowPlanner(true)}><Plus size={18}/>Build income plan</button></div></header>
      {active === 'Overview' && <><section className="hero-grid">
        <div className="income-card"><div className="card-label">MONTHLY PASSIVE INCOME <CircleHelp size={15}/></div><div className="income-top"><div><div className="big-number">${monthlyIncome.toFixed(0)}<small>/mo</small></div><p><span className="up">↑ 4.8%</span> vs. last month</p></div><div className="spark"><svg viewBox="0 0 130 55" preserveAspectRatio="none"><path d="M0 45 C12 38 18 43 28 31 S45 36 55 26 S69 33 78 19 S95 24 105 12 S118 19 130 3" fill="none" stroke="currentColor" strokeWidth="3"/></svg></div></div><div className="goal-line"><span>Income goal</span><strong>${goal.toLocaleString()} /mo</strong></div><div className="progress"><span style={{width: `${goalProgress}%`}}/></div><p className="muted">You’re {goalProgress.toFixed(0)}% of the way there. Keep building.</p></div>
        <div className="coverage-card"><div className="card-label">EXPENSE COVERAGE</div><div className="coverage-body"><div className="donut" style={{'--percent': `${coverage * 3.6}deg`}}><div><b>{coverage}%</b><span>covered</span></div></div><div><h3>${monthlyIncome.toFixed(0)} <span>of ${expenses.toLocaleString()}</span></h3><p>Your portfolio covers {coverage}% of monthly spending.</p><button className="text-button" onClick={() => setActive('Income plan')}>View expenses →</button></div></div></div>
      </section>
      <section className="two-col">
        <div className="panel allocation-panel"><div className="panel-heading"><div><h2>Portfolio allocation</h2><p>How your income portfolio is working</p></div><button className="ghost" onClick={() => setActive('Portfolio')}>View portfolio</button></div><div className="allocation-content"><div className="allocation-donut" style={{background: `conic-gradient(${allocation.map((a, i) => `${a.color} ${allocation.slice(0,i).reduce((s,x)=>s+x.share,0)}% ${allocation.slice(0,i+1).reduce((s,x)=>s+x.share,0)}%`).join(',')})`}}><div><strong>${(totalValue/1000).toFixed(1)}k</strong><span>invested</span></div></div><div className="legend">{allocation.map(x => <div key={x.symbol}><i style={{background:x.color}}/><span>{x.symbol}</span><b>{x.share.toFixed(0)}%</b></div>)}</div></div></div>
        <div className="panel activity"><div className="panel-heading"><div><h2>Income activity</h2><p>Recent dividends and distributions</p></div><button className="ghost">See all</button></div>{portfolio.slice(0,3).map((h,i)=><div className="activity-row" key={h.symbol}><div className="ticker" style={{background:h.color}}>{h.symbol.slice(0,2)}</div><div><strong>{h.symbol} dividend</strong><span>{i===0?'Today':i===1?'Aug 26':'Aug 22'}</span></div><b>+${(h.income/4).toFixed(2)}</b></div>)}</div>
      </section>
      <DiscoverCards filter={filter} setFilter={setFilter} addHolding={addHolding}/>
      <section className="panel goal-panel"><div><p className="eyebrow">YOUR NEXT MILESTONE</p><h2>Cover 50% of your monthly expenses</h2><p>At your current pace, you could get there by <strong>February 2028.</strong></p></div><button className="primary" onClick={()=>setShowPlanner(true)}>Explore plan <TrendingUp size={17}/></button></section>
      </>}
      {active === 'Portfolio' && <PortfolioScreen portfolio={portfolio} totalValue={totalValue} annualIncome={annualIncome} overallYield={overallYield} removeHolding={removeHolding} addHolding={addHolding}/>} 
      {active === 'Income plan' && <IncomePlanScreen goal={goal} setGoal={setGoal} monthly={monthly} setMonthly={setMonthly} risk={risk} setRisk={setRisk} expenses={expenses} setExpenses={setExpenses} coverage={coverage} monthlyIncome={monthlyIncome}/>} 
      {active === 'Discover' && <DiscoverCards filter={filter} setFilter={setFilter} addHolding={addHolding}/>} 
    </main>
    {showPlanner && <div className="modal-backdrop"><div className="modal"><button className="close" onClick={()=>setShowPlanner(false)}><X/></button><p className="eyebrow">INCOME PLAN</p><h2>Design your income engine</h2><p className="modal-intro">Tune the inputs and we’ll shape a portfolio path toward your goal.</p><label>Monthly passive-income goal <div className="input-prefix"><span>$</span><input type="number" value={goal} onChange={e=>setGoal(Number(e.target.value))}/><em>/ month</em></div></label><label>Monthly contribution <div className="input-prefix"><span>$</span><input type="number" value={monthly} onChange={e=>setMonthly(Number(e.target.value))}/><em>/ month</em></div></label><label>Risk preference <div className="risk-options">{['Conservative','Balanced','Growth'].map(x=><button key={x} className={risk===x?'selected':''} onClick={()=>setRisk(x)}>{x}</button>)}</div></label><div className="plan-result"><span>Suggested target yield</span><b>{risk==='Conservative'?'3.2%':risk==='Balanced'?'4.1%':'4.8%'}</b><span>Estimated time to goal</span><b>{risk==='Conservative'?'5 years':'3 years, 8 months'}</b></div><button className="primary full" onClick={()=>setShowPlanner(false)}>Save income plan</button></div></div>}
  </div>
}
createRoot(document.getElementById('root')).render(<App/>);
