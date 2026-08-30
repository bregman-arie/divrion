# Divrion

> A calmer way to build your income-investing future.

Divrion is a responsive, dark-mode-first dashboard for planning dividend income, modelling a portfolio, discovering income investments, and seeing how much of your monthly life is already covered.

## Product preview

### Income overview

![Divrion income overview](images/overview.jpg)

Track passive income, expense coverage, allocation, activity, and your next goal in one focused view.

### Portfolio modelling

![Divrion portfolio](images/protfolio.jpg)

Model holdings, distinguish simulated positions, and review the income impact of allocation changes.

### What-if simulation

![Divrion simulation](images/simulation.jpg)

Try an investment amount before acting and see how it changes expected income.

## What you can do

| Workspace | Purpose |
| --- | --- |
| **Overview** | See passive-income progress, expense coverage, allocation, activity, and timely ideas in one place. |
| **Income plan** | Set daily, monthly, or yearly income goals; tune your monthly contribution and risk profile; follow an interactive four-year forecast. |
| **Portfolio** | Inspect value, blended yield, and income at a holding level. Add or remove simulated holdings to see the impact. |
| **Discover** | Filter ideas by high yield, dividend growth, or sector, and add them to your simulation. |

## Quick start

**Prerequisites:** Node.js 20+ and npm.

```bash
git clone git@github.com:bregman-arie/divrion.git
cd divrion
npm install
npm run dev
```

Vite will print the local address (normally `http://localhost:5173`). Open it in your browser.

## Demo mode

Divrion starts with an empty portfolio by default. To load the illustrative portfolios and sample income data, open the app with the `demo` query flag:

```text
http://localhost:5173/?demo
```

You can also enable this behavior at build time with `VITE_DEMO=true`.

## Other commands

```bash
# Build an optimized production bundle
npm run build

# Preview the production bundle locally
npm run preview
```

## Design notes

The interface uses a high-contrast graphite palette with violet income data and lime actions. It is designed to work from desktop down to a compact mobile navigation layout, while keeping the most useful portfolio figures visible.

## Current state

This is an interactive product prototype using illustrative market and portfolio data only. It does not provide financial advice, execute trades, or use live market prices.

## Stack

- React
- Vite
- Lucide icons
- Plain CSS with responsive breakpoints
