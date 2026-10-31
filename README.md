# ⚡ Investment App — Follow the Smart Money, Market Cycle & Daily Stock Intelligence

> **Track where smart money is rotating across asset classes and stock market sectors, monitor Fed money printing & interest rates, see where we are in the market cycle, and read 5-minute plain-English analyses on 10 Buy & 10 Sell stocks daily.**

---

## 🎯 Overview
**Investment App** combines a live **Macro & Smart Money Flow Dashboard (Home Page)** with a **Daily Sector Valuation Radar (76 Top Sector Leaders)**. It pulls live data daily at **8:00 PM ET** (and on-demand via the Refresh button) from the **Federal Reserve (FRED)**, **Yahoo Finance**, and **Google News RSS** to show:
1. **Direction of Money Across Asset Classes & Stock Sectors**
2. **Fed Money Printing, Net Liquidity & Interest Rate Cycle**
3. **Where We Are in the Market Cycle (4-Phase Investment Clock)**
4. **31 Live Macro Metrics with 5-Year Historical Charts & Future Outcomes**
5. **Wars, Geopolitics, Elections, Tariffs & Financial News Radar**
6. **Follow-the-Smart-Money Top Investment Ideas + 10 Stocks to Buy & 10 Stocks to Sell**

---

## ✨ Core Features

### 1. 🧭 Smart Money & Macro Dashboard (New Home Page)
- **⚡ The 1-Minute Macro Story Standard**: Top executive briefing connecting all 12 institutional indicators into a 60-second read. Written in plain English with cited live numbers across two distinct sections: **The Big Picture** and **👉 Your Actionable Playbook**. *(See [`docs/MACRO_STORY_FORMAT.md`](file:///c:/Users/vpsap/OneDrive/Documents/Daily%20Alpha/docs/MACRO_STORY_FORMAT.md) for the locked format specification).*
- **12 Institutional Indicator Power Gauges**:
  - *Part 1: Core Cycle & Direction of Money*: Overall Trend Speedometer, Business Cycle Clock (Phase 3 Overheat), Fed Net Liquidity Meters ($5.75T & 3.88%), Cross-Asset Class Flows, Sector Rotation Board, Recession Tripwires Radar (6/6 safe).
  - *Part 2: Institutional Power Gauges*: Dr. Copper/Gold Growth Ratio (1.66), Buffett Indicator Heatmap (194.5% vs 115%), Options Put-to-Call Sentiment (0.84), U.S. Dollar Tide Meter (104.3 DXY), Corporate Insider Buy/Sell Bar (0.32), Yield Curve 10Y-2Y Un-Inversion Tracker (+0.38%).
- **Overall Market Regime & Trend Score (-100 to +100)**: Weighs 7 macro pillars and 31 live indicators to classify the market as Bullish (Risk-On), Neutral/Transition, or Bearish (Risk-Off).
- **Business Cycle Compass (Investment Clock)**: Places the economy into **Early-Cycle Recovery**, **Late-Cycle Overheat**, **Stagflation**, or **Slowdown / Reflation** using real-time growth and inflation indicators, and highlights which asset classes and sectors historically lead in that phase.
- **Fed Money Printing & Liquidity Verdict ("Will Next Money Enter or Leave?")**: Tracks Net Liquidity (`Fed Balance Sheet − Treasury TGA − Reverse Repo`), Fed Balance Sheet (`WALCL`), M2 Money Supply YoY growth, Reverse Repo buffer, Fed Funds Rate, Market-Implied Fed Path (`2Y − Fed Funds`), 10-Year Yield, 10-Year Real Yield, and `10Y−2Y` / `10Y−3M` Yield Curves.
- **Follow the Smart Money — Best Investment Ideas**: Combines cycle history + real-time price momentum + 200-day trend structure to rank top **Overweight** and **Underweight/Avoid** ideas across both **Asset Classes** and **S&P 500 Sectors**.
- **Cross-Asset Flow Table & S&P 500 Sector Relative Rotation Graph (RRG)**:
  - Tracks 15 major asset classes (`SPY`, `QQQ`, `IWM`, `EFA`, `EEM`, `TLT`, `IEF`, `LQD`, `HYG`, `BIL`, `GLD`, `DBC`, `USO`, `UUP`, `BTC-USD`) against the risk-free cash hurdle.
  - Plots all 11 S&P 500 sectors (`XLK`, `XLC`, `XLY`, `XLF`, `XLI`, `XLB`, `XLE`, `XLV`, `XLP`, `XLU`, `XLRE`) on a 4-quadrant Relative Rotation Graph (**Leading**, **Weakening**, **Lagging**, **Improving**).
- **31 Live Macro Indicators with Interactive 5-Year Historical Charts**: Filter by pillar (`Liquidity`, `Fed Policy & Rates`, `Growth & Jobs`, `Inflation`, `Credit & Stress`, `Market Trend & Breadth`, `Geopolitics & News`). Every card includes a hoverable historical chart and plain-English explanations of *What it is*, *Right now*, and *Future impact*.
- **3–6 Month Probability Scenarios & Early-Warning Tripwires**: Dynamic Bull, Base, and Bear cases plus 6 watched danger lines (S&P 500 200-day, High-Yield Spread 5%, VIX 25, Sahm Rule 0.50, 10Y Yield 5%, Net Liquidity -2%).
- **Geopolitics, Wars, Elections & Financial News Radar + Catalyst Calendar**: Live headlines across 6 channels with tone scoring, Geopolitical Headline Risk Index (0–100), and countdowns to US Elections, FOMC meetings, and Jobs Reports.

### 2. 🏢 Sector Stocks & Valuation Radar (Unified Valuation Map)
- **Sector-by-Sector Visual Tiles**: Screen 20 top stocks grouped by their primary sector (`Technology`, `Consumer Discretionary`, `Communication Services`, `Healthcare`, `Financials`, `Industrials`, `Consumer Staples`).
- **Dual Sector-Wise & Stock-Wise Valuation**:
  - *Sector-Wise*: See each sector's overall cycle stance, Forward P/E ratio, ETF ticker, and whether the sector overall is an attractive accumulation zone or high-multiple caution area.
  - *Stock-Wise*: Every stock is clearly badged as **🟢 UNDERVALUED** (Margin of Safety / Upside Discount) or **🔴 OVERVALUED** (Downside Risk / Valuation Bubble) with interactive Price vs. Fair Value meters and Forward P/E multiples.
- **Valuation & Sector Toggles**: Instant 1-click filters for *All Stocks (20)*, *🟢 Undervalued / Buys (10)*, or *🔴 Overvalued / Sells (10)*, plus quick sector pills and search.
- **5-Minute Deep-Dive Institutional Analysis**: Clicking any stock tile opens the comprehensive institutional breakdown (Executive Thesis, DCF Valuation & Fair Value, Financial Health & Free Cash Flow, Market Catalysts, Risks, Actionable Accumulation Zone, and Audio Briefing).

---

## 🚀 How to Run Locally

Double-click [`start-app.bat`](file:///c:/Users/vpsap/OneDrive/Documents/Daily%20Alpha/start-app.bat) or run:
```powershell
cd "c:\Users\vpsap\OneDrive\Documents\Daily Alpha"
npm start
```
Then open **`http://localhost:3456`** in your browser.
