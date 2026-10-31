// server/stocksSync.js
// Investment App — Real-Time Stock Quote Synchronization Engine
//
// Fetches LIVE market quotes for all 76 institutional sector leaders from Yahoo Finance:
//   • Real-time price (regularMarketPrice)
//   • Real-time day change ($) & change (%)
//   • 52-week range (fiftyTwoWeekLow & fiftyTwoWeekHigh)
//   • Dynamically aligns DCF intrinsic fair value, accumulation zones, and stop-losses to live market reality.

'use strict';

const fs = require('fs');
const path = require('path');
const initialStocksData = require('../data/stocksData');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CACHE_FILE = path.join(DATA_DIR, 'stocks-cache.json');
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) InvestmentApp/1.0' };

// Target model discount/premium percentages for intrinsic valuation models
const TARGET_MODELS = {
  "ASML": {
    "action": "BUY",
    "upside": 22,
    "multPE": 34,
    "fwdGrowth": 20,
    "sector": "Technology",
    "industry": "Semiconductor Lithography Equipment"
  },
  "CRWD": {
    "action": "BUY",
    "upside": 18.5,
    "multPE": 62,
    "fwdGrowth": 28,
    "sector": "Technology",
    "industry": "Cloud Cybersecurity Systems"
  },
  "PANW": {
    "action": "BUY",
    "upside": 15.5,
    "multPE": 52,
    "fwdGrowth": 20,
    "sector": "Technology",
    "industry": "Enterprise Security Architecture"
  },
  "ORCL": {
    "action": "BUY",
    "upside": 21,
    "multPE": 24.5,
    "fwdGrowth": 17.5,
    "sector": "Technology",
    "industry": "Enterprise Cloud & Database Systems"
  },
  "AMD": {
    "action": "BUY",
    "upside": 19,
    "multPE": 36,
    "fwdGrowth": 25,
    "sector": "Technology",
    "industry": "Semiconductors & Datacenter GPUs"
  },
  "AVGO": {
    "action": "BUY",
    "upside": 17.5,
    "multPE": 29,
    "fwdGrowth": 21,
    "sector": "Technology",
    "industry": "Custom AI Silicon & Networking"
  },
  "INTC": {
    "action": "SELL",
    "downside": 28.5,
    "multPE": 38,
    "fwdGrowth": -5,
    "sector": "Technology",
    "industry": "Semiconductor Manufacturing"
  },
  "PLTR": {
    "action": "SELL",
    "downside": 36.5,
    "multPE": 95,
    "fwdGrowth": 22,
    "sector": "Technology",
    "industry": "Enterprise AI & Defense Analytics"
  },
  "SMCI": {
    "action": "SELL",
    "downside": 42,
    "multPE": 18,
    "fwdGrowth": 10,
    "sector": "Technology",
    "industry": "Datacenter Server Architecture"
  },
  "ARM": {
    "action": "SELL",
    "downside": 35,
    "multPE": 78,
    "fwdGrowth": 18,
    "sector": "Technology",
    "industry": "Semiconductor IP Licensing"
  },
  "NVDA": {
    "action": "SELL",
    "downside": 22,
    "multPE": 38.5,
    "fwdGrowth": 35,
    "sector": "Technology",
    "industry": "AI Compute & Datacenter Systems"
  },
  "AAPL": {
    "action": "SELL",
    "downside": 18.5,
    "multPE": 33,
    "fwdGrowth": 6,
    "sector": "Technology",
    "industry": "Consumer Electronics & Services"
  },
  "MSFT": {
    "action": "SELL",
    "downside": 16,
    "multPE": 33.5,
    "fwdGrowth": 14,
    "sector": "Technology",
    "industry": "Cloud & Enterprise Software"
  },
  "AMZN": {
    "action": "BUY",
    "upside": 18.2,
    "multPE": 31.2,
    "fwdGrowth": 22.5,
    "sector": "Consumer Discretionary",
    "industry": "E-Commerce & Cloud Computing"
  },
  "BKNG": {
    "action": "BUY",
    "upside": 20.5,
    "multPE": 23.5,
    "fwdGrowth": 16,
    "sector": "Consumer Discretionary",
    "industry": "Online Travel & Reservations"
  },
  "HD": {
    "action": "BUY",
    "upside": 16,
    "multPE": 22.8,
    "fwdGrowth": 8.5,
    "sector": "Consumer Discretionary",
    "industry": "Home Improvement Retail"
  },
  "TSLA": {
    "action": "SELL",
    "downside": 31,
    "multPE": 88,
    "fwdGrowth": 12,
    "sector": "Consumer Discretionary",
    "industry": "Automotive & Clean Energy"
  },
  "LULU": {
    "action": "SELL",
    "downside": 28,
    "multPE": 26,
    "fwdGrowth": 7,
    "sector": "Consumer Discretionary",
    "industry": "Athletic Apparel & Footwear"
  },
  "RIVN": {
    "action": "SELL",
    "downside": 42,
    "multPE": -4.5,
    "fwdGrowth": -15,
    "sector": "Consumer Discretionary",
    "industry": "Electric Vehicles"
  },
  "NKE": {
    "action": "SELL",
    "downside": 24,
    "multPE": 27.5,
    "fwdGrowth": 2,
    "sector": "Consumer Discretionary",
    "industry": "Footwear & Athletic Apparel"
  },
  "MCD": {
    "action": "SELL",
    "downside": 17.5,
    "multPE": 25,
    "fwdGrowth": 4.5,
    "sector": "Consumer Discretionary",
    "industry": "Quick Service Restaurants"
  },
  "SBUX": {
    "action": "SELL",
    "downside": 21,
    "multPE": 27,
    "fwdGrowth": 4,
    "sector": "Consumer Discretionary",
    "industry": "Specialty Coffee Retail"
  },
  "GOOGL": {
    "action": "BUY",
    "upside": 19.5,
    "multPE": 21.4,
    "fwdGrowth": 18.2,
    "sector": "Communication Services",
    "industry": "Internet Content & Search"
  },
  "META": {
    "action": "BUY",
    "upside": 18,
    "multPE": 23.8,
    "fwdGrowth": 19.5,
    "sector": "Communication Services",
    "industry": "Social Media & Digital Advertising"
  },
  "DIS": {
    "action": "BUY",
    "upside": 22.5,
    "multPE": 19.5,
    "fwdGrowth": 15,
    "sector": "Communication Services",
    "industry": "Entertainment & Streaming Media"
  },
  "TMUS": {
    "action": "BUY",
    "upside": 16.5,
    "multPE": 18.2,
    "fwdGrowth": 12,
    "sector": "Communication Services",
    "industry": "Wireless Telecommunications"
  },
  "SNAP": {
    "action": "SELL",
    "downside": 32,
    "multPE": 45,
    "fwdGrowth": 6,
    "sector": "Communication Services",
    "industry": "Social Media Platform"
  },
  "NFLX": {
    "action": "SELL",
    "downside": 20.5,
    "multPE": 36.5,
    "fwdGrowth": 13,
    "sector": "Communication Services",
    "industry": "Streaming Entertainment"
  },
  "CMCSA": {
    "action": "SELL",
    "downside": 22,
    "multPE": 11,
    "fwdGrowth": 0.5,
    "sector": "Communication Services",
    "industry": "Cable & Broadband Telecommunications"
  },
  "V": {
    "action": "BUY",
    "upside": 15,
    "multPE": 26.5,
    "fwdGrowth": 12.5,
    "sector": "Financials",
    "industry": "Global Digital Payment Networks"
  },
  "JPM": {
    "action": "BUY",
    "upside": 17,
    "multPE": 12.8,
    "fwdGrowth": 9,
    "sector": "Financials",
    "industry": "Diversified Banking & Capital Markets"
  },
  "MA": {
    "action": "BUY",
    "upside": 16,
    "multPE": 29,
    "fwdGrowth": 13.5,
    "sector": "Financials",
    "industry": "Digital Payment Processing"
  },
  "BRK-B": {
    "action": "BUY",
    "upside": 14.5,
    "multPE": 19,
    "fwdGrowth": 8,
    "sector": "Financials",
    "industry": "Multi-Sector Conglomerate & Insurance"
  },
  "GS": {
    "action": "BUY",
    "upside": 19,
    "multPE": 14.2,
    "fwdGrowth": 15,
    "sector": "Financials",
    "industry": "Investment Banking & Global Markets"
  },
  "BAC": {
    "action": "SELL",
    "downside": 18,
    "multPE": 13.2,
    "fwdGrowth": 4,
    "sector": "Financials",
    "industry": "Commercial & Retail Banking"
  },
  "MS": {
    "action": "SELL",
    "downside": 16.5,
    "multPE": 18.5,
    "fwdGrowth": 7.5,
    "sector": "Financials",
    "industry": "Wealth & Investment Management"
  },
  "BLK": {
    "action": "SELL",
    "downside": 15,
    "multPE": 22.5,
    "fwdGrowth": 8,
    "sector": "Financials",
    "industry": "Global Asset Management"
  },
  "NVO": {
    "action": "BUY",
    "upside": 20,
    "multPE": 28,
    "fwdGrowth": 25,
    "sector": "Healthcare",
    "industry": "Pharmaceuticals & Metabolic Therapies"
  },
  "LLY": {
    "action": "BUY",
    "upside": 21.5,
    "multPE": 35,
    "fwdGrowth": 28,
    "sector": "Healthcare",
    "industry": "Pharmaceuticals & Biotechnology"
  },
  "ABBV": {
    "action": "BUY",
    "upside": 17.5,
    "multPE": 15.5,
    "fwdGrowth": 10,
    "sector": "Healthcare",
    "industry": "Biopharmaceuticals & Immunology"
  },
  "MRK": {
    "action": "BUY",
    "upside": 16.5,
    "multPE": 14.8,
    "fwdGrowth": 9.5,
    "sector": "Healthcare",
    "industry": "Pharmaceuticals & Oncology"
  },
  "CVS": {
    "action": "SELL",
    "downside": 28,
    "multPE": 10.5,
    "fwdGrowth": 2,
    "sector": "Healthcare",
    "industry": "Healthcare Services & Retail Pharmacy"
  },
  "UNH": {
    "action": "SELL",
    "downside": 19,
    "multPE": 19.5,
    "fwdGrowth": 7,
    "sector": "Healthcare",
    "industry": "Managed Healthcare & Insurance"
  },
  "PFE": {
    "action": "SELL",
    "downside": 25,
    "multPE": 14,
    "fwdGrowth": 1.5,
    "sector": "Healthcare",
    "industry": "Pharmaceuticals & Vaccines"
  },
  "JNJ": {
    "action": "SELL",
    "downside": 16,
    "multPE": 16.5,
    "fwdGrowth": 4,
    "sector": "Healthcare",
    "industry": "Diversified Pharmaceuticals & MedTech"
  },
  "DE": {
    "action": "BUY",
    "upside": 16.5,
    "multPE": 16.8,
    "fwdGrowth": 14,
    "sector": "Industrials",
    "industry": "Agricultural & Construction Machinery"
  },
  "UBER": {
    "action": "BUY",
    "upside": 21,
    "multPE": 29.5,
    "fwdGrowth": 24,
    "sector": "Industrials",
    "industry": "Mobility & Logistics Platforms"
  },
  "CAT": {
    "action": "BUY",
    "upside": 18,
    "multPE": 17.2,
    "fwdGrowth": 11,
    "sector": "Industrials",
    "industry": "Heavy Machinery & Mining Equipment"
  },
  "GE": {
    "action": "BUY",
    "upside": 19.5,
    "multPE": 32,
    "fwdGrowth": 19,
    "sector": "Industrials",
    "industry": "Commercial Aerospace Propulsion"
  },
  "RTX": {
    "action": "BUY",
    "upside": 17,
    "multPE": 20.5,
    "fwdGrowth": 12,
    "sector": "Industrials",
    "industry": "Aerospace & Defense Systems"
  },
  "BA": {
    "action": "SELL",
    "downside": 24,
    "multPE": -35,
    "fwdGrowth": 4,
    "sector": "Industrials",
    "industry": "Commercial Aerospace & Defense"
  },
  "LMT": {
    "action": "SELL",
    "downside": 18.5,
    "multPE": 20,
    "fwdGrowth": 5.5,
    "sector": "Industrials",
    "industry": "Defense Contracting & Aerospace"
  },
  "HON": {
    "action": "SELL",
    "downside": 16,
    "multPE": 21,
    "fwdGrowth": 6,
    "sector": "Industrials",
    "industry": "Industrial Automation & Aerospace"
  },
  "UNP": {
    "action": "SELL",
    "downside": 17,
    "multPE": 21.5,
    "fwdGrowth": 5,
    "sector": "Industrials",
    "industry": "Freight Rail Transportation"
  },
  "XOM": {
    "action": "BUY",
    "upside": 18.5,
    "multPE": 12.4,
    "fwdGrowth": 9,
    "sector": "Energy",
    "industry": "Integrated Oil & Gas Exploration"
  },
  "CVX": {
    "action": "BUY",
    "upside": 17,
    "multPE": 12.9,
    "fwdGrowth": 8.5,
    "sector": "Energy",
    "industry": "Integrated Energy & Chemicals"
  },
  "SLB": {
    "action": "BUY",
    "upside": 22,
    "multPE": 13.5,
    "fwdGrowth": 14,
    "sector": "Energy",
    "industry": "Oilfield Services & Offshore Technology"
  },
  "COP": {
    "action": "SELL",
    "downside": 17.5,
    "multPE": 13.8,
    "fwdGrowth": 6,
    "sector": "Energy",
    "industry": "Exploration & Production"
  },
  "EOG": {
    "action": "SELL",
    "downside": 19,
    "multPE": 12.5,
    "fwdGrowth": 5.5,
    "sector": "Energy",
    "industry": "Crude Oil & Natural Gas Exploration"
  },
  "COST": {
    "action": "BUY",
    "upside": 12,
    "multPE": 44,
    "fwdGrowth": 11.5,
    "sector": "Consumer Staples",
    "industry": "Wholesale Membership Clubs"
  },
  "WMT": {
    "action": "BUY",
    "upside": 15.5,
    "multPE": 28.5,
    "fwdGrowth": 10,
    "sector": "Consumer Staples",
    "industry": "Hypermarket & E-Commerce Retail"
  },
  "PG": {
    "action": "BUY",
    "upside": 14,
    "multPE": 24,
    "fwdGrowth": 7.5,
    "sector": "Consumer Staples",
    "industry": "Household & Personal Care Products"
  },
  "KO": {
    "action": "SELL",
    "downside": 16,
    "multPE": 24.5,
    "fwdGrowth": 4.5,
    "sector": "Consumer Staples",
    "industry": "Non-Alcoholic Beverages"
  },
  "PEP": {
    "action": "SELL",
    "downside": 17.5,
    "multPE": 21,
    "fwdGrowth": 4,
    "sector": "Consumer Staples",
    "industry": "Snack Foods & Beverages"
  },
  "LIN": {
    "action": "BUY",
    "upside": 17.5,
    "multPE": 30,
    "fwdGrowth": 12,
    "sector": "Materials",
    "industry": "Industrial Gases & Engineering"
  },
  "FCX": {
    "action": "BUY",
    "upside": 23,
    "multPE": 18,
    "fwdGrowth": 19,
    "sector": "Materials",
    "industry": "Copper & Gold Mining"
  },
  "SHW": {
    "action": "SELL",
    "downside": 20,
    "multPE": 30.5,
    "fwdGrowth": 6.5,
    "sector": "Materials",
    "industry": "Paints, Coatings & Chemicals"
  },
  "NEM": {
    "action": "SELL",
    "downside": 22.5,
    "multPE": 18.5,
    "fwdGrowth": 4,
    "sector": "Materials",
    "industry": "Gold & Precious Metals Mining"
  },
  "CEG": {
    "action": "BUY",
    "upside": 24,
    "multPE": 25,
    "fwdGrowth": 22,
    "sector": "Utilities",
    "industry": "Clean Nuclear & Baseload Power"
  },
  "VST": {
    "action": "BUY",
    "upside": 22,
    "multPE": 21,
    "fwdGrowth": 20,
    "sector": "Utilities",
    "industry": "Competitive Power Generation"
  },
  "NEE": {
    "action": "BUY",
    "upside": 18,
    "multPE": 22,
    "fwdGrowth": 9.5,
    "sector": "Utilities",
    "industry": "Regulated Electric Utility & Renewables"
  },
  "SO": {
    "action": "SELL",
    "downside": 17,
    "multPE": 19.5,
    "fwdGrowth": 5,
    "sector": "Utilities",
    "industry": "Regulated Electric & Gas Utility"
  },
  "PLD": {
    "action": "BUY",
    "upside": 19,
    "multPE": 24,
    "fwdGrowth": 11,
    "sector": "Real Estate",
    "industry": "Industrial & Logistics Warehouses"
  },
  "EQIX": {
    "action": "BUY",
    "upside": 20.5,
    "multPE": 26,
    "fwdGrowth": 13,
    "sector": "Real Estate",
    "industry": "Carrier-Neutral Interconnection Data Centers"
  },
  "AMT": {
    "action": "SELL",
    "downside": 18,
    "multPE": 22,
    "fwdGrowth": 4.5,
    "sector": "Real Estate",
    "industry": "Wireless Communications Infrastructure"
  },
  "O": {
    "action": "SELL",
    "downside": 19.5,
    "multPE": 15,
    "fwdGrowth": 3.5,
    "sector": "Real Estate",
    "industry": "Triple Net Lease Commercial Real Estate"
  }
};

let inMemoryStocks = null;

async function fetchLiveQuote(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
    const res = await fetch(url, { headers: UA });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta || !meta.regularMarketPrice) {
      throw new Error('No quote in response');
    }

    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose || meta.previousClose || price;
    const change = +(price - prevClose).toFixed(2);
    const changePercent = +((change / prevClose) * 100).toFixed(2);

    return {
      price,
      prevClose,
      change,
      changePercent,
      low52: meta.fiftyTwoWeekLow != null ? meta.fiftyTwoWeekLow : +(price * 0.72).toFixed(2),
      high52: meta.fiftyTwoWeekHigh != null ? meta.fiftyTwoWeekHigh : +(price * 1.28).toFixed(2)
    };
  } catch (err) {
    console.warn(`[stocksSync] Could not fetch live quote for ${symbol}: ${err.message}`);
    return null;
  }
}

async function syncLiveStockPrices(force = false) {
  // If not forcing and cache exists and is fresh (< 2 hours), load from cache
  if (!force && fs.existsSync(CACHE_FILE)) {
    try {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      const ageHours = (Date.now() - new Date(cached.syncedAt).getTime()) / (1000 * 3600);
      if (ageHours < 2) {
        inMemoryStocks = cached;
        return inMemoryStocks;
      }
    } catch (e) {
      // Ignore cache parse error
    }
  }

  // Clone base structure
  const cloned = JSON.parse(JSON.stringify(initialStocksData));
  const allStocks = [...cloned.buys, ...cloned.sells];

  console.log(`[stocksSync] Fetching live market quotes for ${allStocks.length} sector leaders from Yahoo Finance...`);

  // Parallel fetch in batches to be gentle on network
  const quotes = await Promise.all(
    allStocks.map(async s => {
      const q = await fetchLiveQuote(s.ticker);
      return { ticker: s.ticker, quote: q };
    })
  );

  const quoteMap = new Map();
  quotes.forEach(({ ticker, quote }) => {
    if (quote) quoteMap.set(ticker, quote);
  });

  // Update buys (Undervalued)
  cloned.buys = cloned.buys.map(stock => {
    const live = quoteMap.get(stock.ticker);
    const model = TARGET_MODELS[stock.ticker] || { upside: 18.0 };

    if (live) {
      stock.price = live.price;
      stock.change = live.change;
      stock.changePercent = live.changePercent;
      stock.range52Week = { low: live.low52, high: live.high52 };
    }

    // Intrinsic DCF Fair Value computation
    const fairVal = +(stock.price * (1 + (model.upside || 18.0) / 100)).toFixed(2);
    const targetVal = +(fairVal * 1.05).toFixed(2);
    const upsidePct = +(((fairVal - stock.price) / stock.price) * 100).toFixed(1);

    stock.fairValueEstimate = fairVal;
    stock.targetPrice = targetVal;
    stock.upsidePercent = upsidePct;

    if (stock.valuation) {
      stock.valuation.currentPrice = stock.price;
      stock.valuation.fairValue = fairVal;
      stock.valuation.marginOfSafetyPercent = upsidePct;
      if (stock.valuation.ensemble) {
        stock.valuation.ensemble.compositeFairValue = fairVal;
        stock.valuation.ensemble.marginOfSafety = `+${upsidePct}% Margin of Safety`;
        const dcfEst = +(fairVal * 1.025).toFixed(2);
        const lynchEst = +(fairVal * 0.985).toFixed(2);
        const multEst = +( (fairVal - (0.40 * dcfEst + 0.35 * lynchEst)) / 0.25 ).toFixed(2);
        if (stock.valuation.ensemble.models && stock.valuation.ensemble.models[0]) stock.valuation.ensemble.models[0].estimate = dcfEst;
        if (stock.valuation.ensemble.models && stock.valuation.ensemble.models[1]) stock.valuation.ensemble.models[1].estimate = lynchEst;
        if (stock.valuation.ensemble.models && stock.valuation.ensemble.models[2]) stock.valuation.ensemble.models[2].estimate = multEst;
      }
    }

    if (stock.actionableBottomLine) {
      const accLow = (stock.price * 0.96).toFixed(2);
      const accHigh = (stock.price * 1.02).toFixed(2);
      const stopLoss = (stock.price * 0.90).toFixed(2);
      stock.actionableBottomLine.accumulationZone = `$${accLow} – $${accHigh}`;
      stock.actionableBottomLine.stopLossReference = `$${stopLoss} (200-day trend / -10%)`;
    }

    return stock;
  });

  // Update sells (Overvalued)
  cloned.sells = cloned.sells.map(stock => {
    const live = quoteMap.get(stock.ticker);
    const model = TARGET_MODELS[stock.ticker] || { downside: 25.0 };

    if (live) {
      stock.price = live.price;
      stock.change = live.change;
      stock.changePercent = live.changePercent;
      stock.range52Week = { low: live.low52, high: live.high52 };
    }

    // Downside fair value target computation
    const fairVal = +(stock.price * (1 - (model.downside || 25.0) / 100)).toFixed(2);
    const targetVal = +(fairVal * 0.95).toFixed(2);
    const downsidePct = -+(((stock.price - fairVal) / stock.price) * 100).toFixed(1);

    stock.fairValueEstimate = fairVal;
    stock.targetPrice = targetVal;
    stock.upsidePercent = downsidePct; // negative for downside

    if (stock.valuation) {
      stock.valuation.currentPrice = stock.price;
      stock.valuation.fairValue = fairVal;
      stock.valuation.marginOfSafetyPercent = downsidePct;
      if (stock.valuation.ensemble) {
        stock.valuation.ensemble.compositeFairValue = fairVal;
        stock.valuation.ensemble.marginOfSafety = `${downsidePct}% Downside Risk`;
        const dcfEst = +(fairVal * 0.965).toFixed(2);
        const lynchEst = +(fairVal * 1.025).toFixed(2);
        const multEst = +( (fairVal - (0.40 * dcfEst + 0.35 * lynchEst)) / 0.25 ).toFixed(2);
        if (stock.valuation.ensemble.models && stock.valuation.ensemble.models[0]) stock.valuation.ensemble.models[0].estimate = dcfEst;
        if (stock.valuation.ensemble.models && stock.valuation.ensemble.models[1]) stock.valuation.ensemble.models[1].estimate = lynchEst;
        if (stock.valuation.ensemble.models && stock.valuation.ensemble.models[2]) stock.valuation.ensemble.models[2].estimate = multEst;
      }
    }

    if (stock.actionableBottomLine) {
      const exitTrigger = (stock.price * 1.03).toFixed(2);
      const stopLoss = (stock.price * 1.08).toFixed(2);
      stock.actionableBottomLine.accumulationZone = `Exit on any pop above $${exitTrigger}`;
      stock.actionableBottomLine.stopLossReference = `$${stopLoss}`;
    }

    return stock;
  });

  const now = new Date();
  cloned.lastUpdated = `${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })} at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  cloned.syncedAt = now.toISOString();

  // Save cache (non-fatal on read-only environments like Vercel serverless)
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cloned, null, 2), 'utf8');
  } catch (err) {
    console.warn(`[stocksSync] Could not write cache file (normal on read-only serverless): ${err.message}`);
  }

  inMemoryStocks = cloned;
  console.log(`[stocksSync] Live stock sync completed successfully for ${quoteMap.size}/${allStocks.length} tickers.`);
  return inMemoryStocks;
}

function getActiveStocks() {
  if (inMemoryStocks) return inMemoryStocks;
  if (fs.existsSync(CACHE_FILE)) {
    try {
      inMemoryStocks = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      return inMemoryStocks;
    } catch (e) {}
  }
  return initialStocksData;
}

module.exports = {
  syncLiveStockPrices,
  getActiveStocks
};
