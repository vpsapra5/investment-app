// server.js
// Investment App — Express Server, Macro Money-Flow Engine & Daily Stock Intelligence API

const express = require('express');
const cors = require('cors');
const path = require('path');
const initialStocksData = require('./data/stocksData');
const macroEngine = require('./server/macro');
const stocksSync = require('./server/stocksSync');

const app = express();
const PORT = process.env.PORT || 3456;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Start daily 6:00 AM ET scheduler for macro & money flow data
macroEngine.startScheduler();

// Immediately sync live stock prices from Yahoo Finance on startup
stocksSync.syncLiveStockPrices().catch(err => {
  console.warn('[stocksSync] Initial live stock price sync notice:', err.message);
});

// Utility to normalize tickers
function cleanTicker(t) {
  return t ? t.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '') : '';
}

// GET /api/macro - Full Macro, Money Flow, Cycle, Asset/Sector Rotation & News Dashboard
app.get('/api/macro', async (req, res) => {
  try {
    const snapshot = await macroEngine.getSnapshot();
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/macro/refresh - Force live refresh of all FRED, Yahoo Finance & News feeds
app.post('/api/macro/refresh', async (req, res) => {
  try {
    const snapshot = await macroEngine.refresh('manual-api');
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/stocks - Full list of 10 Buys and 10 Sells with LIVE Yahoo Finance Quotes
app.get('/api/stocks', (req, res) => {
  try {
    const active = stocksSync.getActiveStocks();
    res.json({
      success: true,
      lastUpdated: active.lastUpdated,
      marketSummary: active.marketSummary,
      buys: active.buys,
      sells: active.sells
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/stocks/:ticker - Individual deep dive with LIVE quotes
app.get('/api/stocks/:ticker', (req, res) => {
  const ticker = cleanTicker(req.params.ticker);
  const active = stocksSync.getActiveStocks();
  const allStocks = [...active.buys, ...active.sells];
  const stock = allStocks.find(s => cleanTicker(s.ticker) === ticker);

  if (!stock) {
    return res.status(404).json({ success: false, message: `Stock ${ticker} not found in today's watchlist.` });
  }

  res.json({
    success: true,
    data: stock
  });
});

// GET /api/cron - Automated Cloud Cron (Vercel Cron triggers GET at 6:00 AM ET)
app.get('/api/cron', async (req, res) => {
  try {
    console.log('[cron] Automated 6:00 AM ET cloud refresh triggered');
    const [macroSnapshot, active] = await Promise.all([
      macroEngine.refresh('vercel-daily-cron'),
      stocksSync.syncLiveStockPrices(true)
    ]);

    res.json({
      success: true,
      message: "Daily 6:00 AM ET cloud refresh completed successfully.",
      edition: macroSnapshot.edition,
      lastUpdated: active.lastUpdated
    });
  } catch (error) {
    console.error('[cron] Refresh failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET & POST /api/refresh - Trigger daily macro & live stock screener refresh
const handleRefresh = async (req, res) => {
  try {
    const [macroSnapshot, active] = await Promise.all([
      macroEngine.refresh('manual-refresh-all'),
      stocksSync.syncLiveStockPrices(true)
    ]);

    res.json({
      success: true,
      message: "Investment App macro engine & real-time stock intelligence refreshed.",
      lastUpdated: active.lastUpdated,
      macroEdition: macroSnapshot.edition,
      macroGeneratedAt: macroSnapshot.generatedAtET
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
app.post('/api/refresh', handleRefresh);
app.get('/api/refresh', handleRefresh);

// Fallback to index.html for client routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Local runner (only listens if executed directly via node server.js)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`⚡ INVESTMENT APP — Smart Money & Stock Intelligence is LIVE!`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🕒 Mode: Daily Macro Cycle, Money Flow & Live 76-Stock Screener across 11 Sectors`);
    console.log(`=================================================`);
  });
}

module.exports = app;
