// public/js/app.js
// Investment App — Main Application Engine: Sector & Stock Valuation Radar

const SECTOR_METADATA = {
  'Technology': {
    name: 'Technology',
    etf: 'XLK',
    icon: '💻',
    stance: 'Selective • Multiple Divergence',
    stanceTone: 'caution', // 'bull' | 'caution' | 'bear'
    peForward: '31.2x',
    summary: 'Avoid speculative 80x+ sales hardware and foundry capex traps; accumulate monopoly semiconductor lithography, custom silicon ASICs, and enterprise cybersecurity.'
  },
  'Consumer Discretionary': {
    name: 'Consumer Discretionary',
    etf: 'XLY',
    icon: '🛍️',
    stance: 'Caution • Margin Compression Risk',
    stanceTone: 'bear',
    peForward: '28.4x',
    summary: 'High borrowing costs and EV price wars compress auto and retail margins; focus strictly on scale leaders with dominant cloud, logistics, and global travel moats.'
  },
  'Communication Services': {
    name: 'Communication Services',
    etf: 'XLC',
    icon: '📱',
    stance: 'Attractive • Mega-Cap Cash Engines',
    stanceTone: 'bull',
    peForward: '21.4x',
    summary: 'Digital ad duopolies and telecom 5G cash generators trade at reasonable forward multiples, while speculative social platforms face ad dilution and legacy cable bleeds subscribers.'
  },
  'Financials': {
    name: 'Financials',
    etf: 'XLF',
    icon: '🏦',
    stance: 'Overweight • Yield Curve Un-Inversion',
    stanceTone: 'bull',
    peForward: '16.2x',
    summary: 'Steepening yield curve expands net interest margins for tier-1 money center banks, while global payment rail tolls compound with zero balance sheet credit risk.'
  },
  'Healthcare': {
    name: 'Healthcare & Life Sciences',
    etf: 'XLV',
    icon: '🏥',
    stance: 'Leading • Secular GLP-1 Expansion',
    stanceTone: 'bull',
    peForward: '18.6x',
    summary: 'High-barrier GLP-1 obesity duopolies and oncology leaders offer strong pricing power and recession defense, while Medicare Advantage providers battle surging medical loss ratios.'
  },
  'Industrials': {
    name: 'Industrials & Machinery',
    etf: 'XLI',
    icon: '🏭',
    stance: 'Improving • Re-Shoring & Infrastructure',
    stanceTone: 'caution',
    peForward: '20.8x',
    summary: 'Defense backlogs, aerospace engine shop visits, and autonomous machinery benefit from multi-year capex cycles, while legacy planemakers struggle with execution debt.'
  },
  'Energy': {
    name: 'Energy',
    etf: 'XLE',
    icon: '⚡',
    stance: 'Value • Low-Cost Cash Generation',
    stanceTone: 'bull',
    peForward: '12.8x',
    summary: 'Consolidated Permian basin operators with breakevens below $35/bbl provide double-digit free cash flow yields and dividend protection against oil price volatility.'
  },
  'Consumer Staples': {
    name: 'Consumer Staples',
    etf: 'XLP',
    icon: '🛒',
    stance: 'Defensive Anchor • Pricing Power',
    stanceTone: 'bull',
    peForward: '22.5x',
    summary: 'Essential retail membership giants and household brand monopolies offer unbreakable recurring cash flows, protecting capital against late-cycle economic slowdowns.'
  },
  'Materials': {
    name: 'Materials & Chemicals',
    etf: 'XLB',
    icon: '⛏️',
    stance: 'Cyclical • Electrification & Infrastructure',
    stanceTone: 'caution',
    peForward: '19.4x',
    summary: 'Long-term contracts in industrial gases and structural copper deficits provide strong secular tailwinds, though housing-sensitive coatings face near-term volume drag.'
  },
  'Utilities': {
    name: 'Utilities & Power Infrastructure',
    etf: 'XLU',
    icon: '💡',
    stance: 'Leading • AI Datacenter Baseload Demand',
    stanceTone: 'bull',
    peForward: '18.1x',
    summary: 'Massive electricity demand from hyperscale AI datacenters is transforming regulated utilities and nuclear baseload generators into secular growth powerhouses.'
  },
  'Real Estate': {
    name: 'Real Estate & Infrastructure',
    etf: 'XLRE',
    icon: '🏢',
    stance: 'Selective • Digital & Logistics REITs',
    stanceTone: 'caution',
    peForward: '17.5x',
    summary: 'AI datacenter interconnection facilities and industrial supply chain hubs outperform, while interest-rate sensitive triple-net retail and office struggle.'
  }
};

function getStockSectorKey(stock) {
  if (stock.sector && SECTOR_METADATA[stock.sector]) {
    return stock.sector;
  }
  const s = ((stock.sector || '') + ' ' + (stock.industry || '')).toLowerCase();
  if (s.includes('tech') || s.includes('semi') || s.includes('software')) return 'Technology';
  if (s.includes('discretionary') || s.includes('retail') || s.includes('auto') || s.includes('apparel')) return 'Consumer Discretionary';
  if (s.includes('comm') || s.includes('media') || s.includes('telecom') || s.includes('entertainment')) return 'Communication Services';
  if (s.includes('finan') || s.includes('bank') || s.includes('payment') || s.includes('insurance')) return 'Financials';
  if (s.includes('health') || s.includes('pharma') || s.includes('biotech')) return 'Healthcare';
  if (s.includes('indust') || s.includes('aerospace') || s.includes('machin') || s.includes('mobility')) return 'Industrials';
  if (s.includes('energy') || s.includes('oil') || s.includes('gas') || s.includes('petroleum')) return 'Energy';
  if (s.includes('staple') || s.includes('beverage') || s.includes('food')) return 'Consumer Staples';
  if (s.includes('material') || s.includes('chemical') || s.includes('mining') || s.includes('copper')) return 'Materials';
  if (s.includes('utilit') || s.includes('power') || s.includes('nuclear') || s.includes('electric')) return 'Utilities';
  if (s.includes('real estate') || s.includes('reit') || s.includes('property')) return 'Real Estate';
  return 'Technology';
}

const App = {
  currentTab: 'dashboard', // 'dashboard' | 'sectors'
  valuationFilter: 'all',  // 'all' | 'undervalued' | 'overvalued'
  currentSector: 'all',
  searchQuery: '',
  sortBy: 'conviction',
  stocksData: { buys: [], sells: [] },
  activeStock: null,

  init() {
    this.cacheDOMElements();
    this.bindEvents();
    this.initTooltips();
    window.SpeechEngine.init();
    this.fetchStocks();
    if (window.MacroDashboard) {
      window.MacroDashboard.load(false);
    }
  },

  cacheDOMElements() {
    // Header
    this.editionDate = document.getElementById('editionDate');
    this.marketEdgeText = document.getElementById('marketEdgeText');
    this.avgBuyUpside = document.getElementById('avgBuyUpside');
    this.avgSellDownside = document.getElementById('avgSellDownside');
    this.marketVibe = document.getElementById('marketVibe');
    this.refreshBtn = document.getElementById('refreshBtn');
    this.globalAudioBtn = document.getElementById('globalAudioBtn');

    // Controls
    this.dashboardTabBtn = document.getElementById('dashboardTabBtn');
    this.sectorTabBtn = document.getElementById('sectorTabBtn');
    this.sectorStocksCount = document.getElementById('sectorStocksCount');
    this.macroDashboardSection = document.getElementById('macroDashboardSection');
    this.stocksViewWrapper = document.getElementById('stocksViewWrapper');
    this.valuationTogglePills = document.getElementById('valuationTogglePills');
    this.valPillAll = document.getElementById('valPillAll');
    this.valPillBuy = document.getElementById('valPillBuy');
    this.valPillSell = document.getElementById('valPillSell');
    this.searchInput = document.getElementById('searchInput');
    this.clearSearchBtn = document.getElementById('clearSearchBtn');
    this.sectorPills = document.getElementById('sectorPills');
    this.sortSelect = document.getElementById('sortSelect');

    // View Header & Grid
    this.viewTitle = document.getElementById('viewTitle');
    this.viewSubtitle = document.getElementById('viewSubtitle');
    this.stocksGrid = document.getElementById('stocksGrid');

    // Deep Dive Modal
    this.modal = document.getElementById('deepDiveModal');
    this.modalCloseBtn = document.getElementById('modalCloseBtn');
    this.modalCloseFooterBtn = document.getElementById('modalCloseFooterBtn');
    this.modalAudioBtn = document.getElementById('modalAudioBtn');
    this.modalActionPill = document.getElementById('modalActionPill');
    this.modalVerdictPill = document.getElementById('modalVerdictPill');
    this.modalTicker = document.getElementById('modalTicker');
    this.modalName = document.getElementById('modalName');
    this.modalSector = document.getElementById('modalSector');
    this.modalPrice = document.getElementById('modalPrice');
    this.modalChange = document.getElementById('modalChange');
    this.modalReadTime = document.getElementById('modalReadTime');
    this.modalThesisList = document.getElementById('modalThesisList');
    this.modalFairValue = document.getElementById('modalFairValue');
    this.modalMarginPill = document.getElementById('modalMarginPill');
    this.modalFairValueBar = document.getElementById('modalFairValueBar');
    this.modalBarCurrentPrice = document.getElementById('modalBarCurrentPrice');
    this.modalBarTargetPrice = document.getElementById('modalBarTargetPrice');
    this.modalForwardPE = document.getElementById('modalForwardPE');
    this.modalIndustryPE = document.getElementById('modalIndustryPE');
    this.modalPEGRatio = document.getElementById('modalPEGRatio');
    this.modalPEVerdict = document.getElementById('modalPEVerdict');
    this.modalValuationSummary = document.getElementById('modalValuationSummary');
    this.modalRevGrowth = document.getElementById('modalRevGrowth');
    this.modalOpMargin = document.getElementById('modalOpMargin');
    this.modalFCFStatus = document.getElementById('modalFCFStatus');
    this.modalDebtRatio = document.getElementById('modalDebtRatio');
    this.modalCashVsDebt = document.getElementById('modalCashVsDebt');
    this.modalFinancialSummary = document.getElementById('modalFinancialSummary');
    this.modalConsensusRating = document.getElementById('modalConsensusRating');
    this.modalConsensusCounts = document.getElementById('modalConsensusCounts');
    this.modalLowTarget = document.getElementById('modalLowTarget');
    this.modalAvgTarget = document.getElementById('modalAvgTarget');
    this.modalHighTarget = document.getElementById('modalHighTarget');
    this.modalCatalystsList = document.getElementById('modalCatalystsList');
    this.modalRisksList = document.getElementById('modalRisksList');
    this.modalZoneLabel = document.getElementById('modalZoneLabel');
    this.modalZoneVal = document.getElementById('modalZoneVal');
    this.modalStopLoss = document.getElementById('modalStopLoss');
    this.modalBottomConviction = document.getElementById('modalBottomConviction');
    this.modalPlainEnglishTakeaway = document.getElementById('modalPlainEnglishTakeaway');
  },

  bindEvents() {
    // Tab switching: Dashboard vs Sector Stocks & Valuation
    if (this.dashboardTabBtn) {
      this.dashboardTabBtn.addEventListener('click', () => this.switchTab('dashboard'));
    }
    if (this.sectorTabBtn) {
      this.sectorTabBtn.addEventListener('click', () => this.switchTab('sectors'));
    }

    // Valuation Mode Filter Pills (All, Undervalued, Overvalued)
    if (this.valuationTogglePills) {
      this.valuationTogglePills.addEventListener('click', (e) => {
        const btn = e.target.closest('.val-pill');
        if (!btn) return;
        document.querySelectorAll('.val-pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        this.valuationFilter = btn.getAttribute('data-val') || 'all';
        this.render();
      });
    }

    // Search
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        if (this.clearSearchBtn) {
          this.clearSearchBtn.style.display = this.searchQuery ? 'block' : 'none';
        }
        this.render();
      });
    }

    if (this.clearSearchBtn) {
      this.clearSearchBtn.addEventListener('click', () => {
        this.searchInput.value = '';
        this.searchQuery = '';
        this.clearSearchBtn.style.display = 'none';
        this.render();
      });
    }

    // Sector Filter Pills
    if (this.sectorPills) {
      this.sectorPills.addEventListener('click', (e) => {
        const btn = e.target.closest('.sector-pill');
        if (!btn) return;

        document.querySelectorAll('.sector-pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        this.currentSector = btn.getAttribute('data-sector') || 'all';
        this.render();
      });
    }

    // Sort
    if (this.sortSelect) {
      this.sortSelect.addEventListener('change', (e) => {
        this.sortBy = e.target.value;
        this.render();
      });
    }

    // Refresh Data
    if (this.refreshBtn) {
      this.refreshBtn.addEventListener('click', () => this.refreshData());
    }

    // Global Audio Brief
    if (this.globalAudioBtn) {
      this.globalAudioBtn.addEventListener('click', () => this.playGlobalBriefing());
    }

    // Modal Close
    if (this.modalCloseBtn) this.modalCloseBtn.addEventListener('click', () => this.closeModal());
    if (this.modalCloseFooterBtn) this.modalCloseFooterBtn.addEventListener('click', () => this.closeModal());
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.closeModal();
      });
    }

    // Modal Audio
    if (this.modalAudioBtn) {
      this.modalAudioBtn.addEventListener('click', () => this.playStockAudio());
    }

    // Keyboard ESC to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && this.modal.style.display === 'flex') {
        this.closeModal();
      }
    });
  },

  async fetchStocks() {
    try {
      if (this.stocksGrid) {
        this.stocksGrid.innerHTML = `
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Evaluating sector models, valuation metrics &amp; intrinsic fair value...</p>
          </div>
        `;
      }

      const response = await fetch('/api/stocks');
      const data = await response.json();

      if (data.success) {
        this.stocksData = {
          buys: data.buys || [],
          sells: data.sells || []
        };

        // Render header and meta if macro hasn't already populated it
        if (!window.MacroDashboard || !window.MacroDashboard.data) {
          if (this.editionDate) this.editionDate.textContent = data.lastUpdated;
          if (data.marketSummary && this.marketEdgeText) {
            this.marketEdgeText.textContent = data.marketSummary.edgeOfDay;
          }
        }

        // Render counts
        const totalCount = this.stocksData.buys.length + this.stocksData.sells.length;
        if (this.sectorStocksCount) {
          this.sectorStocksCount.textContent = `${totalCount} STOCKS`;
        }
        if (this.valPillAll) {
          this.valPillAll.textContent = `All Stocks (${totalCount})`;
        }
        if (this.valPillBuy) {
          this.valPillBuy.textContent = `🟢 Undervalued / Buys (${this.stocksData.buys.length})`;
        }
        if (this.valPillSell) {
          this.valPillSell.textContent = `🔴 Overvalued / Sells (${this.stocksData.sells.length})`;
        }

        // Compute average metrics for header
        if (this.avgBuyUpside && this.stocksData.buys.length) {
          const avgBuy = this.stocksData.buys.reduce((acc, s) => acc + (s.upsidePercent || 0), 0) / this.stocksData.buys.length;
          this.avgBuyUpside.textContent = `+${avgBuy.toFixed(1)}%`;
        }
        if (this.avgSellDownside && this.stocksData.sells.length) {
          const avgSell = this.stocksData.sells.reduce((acc, s) => acc + (s.upsidePercent || 0), 0) / this.stocksData.sells.length;
          this.avgSellDownside.textContent = `${avgSell.toFixed(1)}%`;
        }

        if (this.currentTab !== 'dashboard') {
          this.render();
        }
      }
    } catch (err) {
      if (this.stocksGrid) {
        this.stocksGrid.innerHTML = `
          <div class="empty-state">
            <p>⚠️ Unable to connect to Investment App backend: ${err.message}</p>
            <button class="btn btn-secondary" onclick="window.App.fetchStocks()">Try Again</button>
          </div>
        `;
      }
    }
  },

  async refreshData() {
    if (this.refreshBtn) this.refreshBtn.classList.add('rotating');
    const labelEl = this.refreshBtn ? this.refreshBtn.querySelector('.btn-label') : null;
    if (labelEl) labelEl.textContent = 'Refreshing...';
    try {
      const response = await fetch('/api/refresh', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        await Promise.all([
          this.fetchStocks(),
          window.MacroDashboard ? window.MacroDashboard.load(false) : Promise.resolve()
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (this.refreshBtn) this.refreshBtn.classList.remove('rotating');
      if (labelEl) labelEl.textContent = 'Refresh';
    }
  },

  switchTab(tab) {
    this.currentTab = tab;
    
    // Update button states
    if (this.dashboardTabBtn) {
      this.dashboardTabBtn.classList.toggle('active', tab === 'dashboard');
    }
    if (this.sectorTabBtn) {
      this.sectorTabBtn.classList.toggle('active', tab === 'sectors');
    }

    if (tab === 'dashboard') {
      if (this.macroDashboardSection) this.macroDashboardSection.style.display = 'flex';
      if (this.stocksViewWrapper) this.stocksViewWrapper.style.display = 'none';
      if (window.MacroDashboard && !window.MacroDashboard.data) {
        window.MacroDashboard.load(false);
      } else if (window.MacroDashboard) {
        window.MacroDashboard.render();
      }
      return;
    }

    // Switch to Sector Stocks & Valuation Tab
    if (this.macroDashboardSection) this.macroDashboardSection.style.display = 'none';
    if (this.stocksViewWrapper) this.stocksViewWrapper.style.display = 'block';

    if (this.viewTitle) {
      this.viewTitle.textContent = "Sector & Stock Valuation Radar";
    }
    if (this.viewSubtitle) {
      this.viewSubtitle.textContent = "Top stocks grouped by sector. Compare sector-level cycle health alongside individual stock valuation to spot undervalued bargains and overvalued risks.";
    }

    this.render();
  },

  render() {
    if (!this.stocksGrid) return;

    // Combine all 20 stocks with explicit action & sector tagging
    const allStocks = [
      ...this.stocksData.buys.map(s => ({ ...s, isBuy: true, statusLabel: 'UNDERVALUED' })),
      ...this.stocksData.sells.map(s => ({ ...s, isBuy: false, statusLabel: 'OVERVALUED' }))
    ];

    // 1. Valuation filter (All, Undervalued Only, Overvalued Only)
    let filtered = allStocks;
    if (this.valuationFilter === 'undervalued') {
      filtered = filtered.filter(s => s.isBuy);
    } else if (this.valuationFilter === 'overvalued') {
      filtered = filtered.filter(s => !s.isBuy);
    }

    // 2. Search query filter
    if (this.searchQuery) {
      filtered = filtered.filter(s => 
        s.ticker.toLowerCase().includes(this.searchQuery) ||
        s.name.toLowerCase().includes(this.searchQuery) ||
        (s.sector && s.sector.toLowerCase().includes(this.searchQuery)) ||
        (s.industry && s.industry.toLowerCase().includes(this.searchQuery)) ||
        (s.verdictPill && s.verdictPill.toLowerCase().includes(this.searchQuery)) ||
        (s.executiveThesis && s.executiveThesis.some(t => t.toLowerCase().includes(this.searchQuery)))
      );
    }

    // 3. Group by canonical sectors
    const sectorOrder = [
      'Technology',
      'Consumer Discretionary',
      'Communication Services',
      'Financials',
      'Healthcare',
      'Industrials',
      'Energy',
      'Consumer Staples',
      'Materials',
      'Utilities',
      'Real Estate'
    ];

    const grouped = {};
    sectorOrder.forEach(secKey => {
      grouped[secKey] = [];
    });

    filtered.forEach(stock => {
      const secKey = getStockSectorKey(stock);
      if (!grouped[secKey]) grouped[secKey] = [];
      grouped[secKey].push(stock);
    });

    // 4. Sector filter (Single sector selection)
    let activeSectors = sectorOrder;
    if (this.currentSector !== 'all') {
      activeSectors = sectorOrder.filter(secKey => {
        return secKey.toLowerCase().includes(this.currentSector.toLowerCase()) ||
               this.currentSector.toLowerCase().includes(secKey.toLowerCase());
      });
    }

    // Check if any sector has matching stocks
    const totalMatchingStocks = activeSectors.reduce((acc, secKey) => acc + (grouped[secKey]?.length || 0), 0);

    if (totalMatchingStocks === 0) {
      this.stocksGrid.innerHTML = `
        <div class="empty-state">
          <p>🔍 No stocks matched your search/filter criteria.</p>
          <button class="btn btn-secondary" onclick="window.App.resetFilters()">Reset All Filters</button>
        </div>
      `;
      return;
    }

    // 5. Render Sector Blocks
    const html = activeSectors.map(secKey => {
      const stocksInSector = grouped[secKey] || [];
      if (stocksInSector.length === 0) return ''; // Skip empty sectors when filtering

      const meta = SECTOR_METADATA[secKey] || {
        name: secKey,
        etf: 'ETF',
        icon: '📊',
        stance: 'Sector Overview',
        stanceTone: 'caution',
        peForward: '22.0x',
        summary: 'Institutional sector analysis.'
      };

      // Sort stocks within sector
      stocksInSector.sort((a, b) => {
        if (this.sortBy === 'conviction') {
          return (b.convictionScore || 0) - (a.convictionScore || 0);
        } else if (this.sortBy === 'upside') {
          return Math.abs(b.upsidePercent || 0) - Math.abs(a.upsidePercent || 0);
        } else if (this.sortBy === 'change') {
          return (b.changePercent || 0) - (a.changePercent || 0);
        } else if (this.sortBy === 'marketCap') {
          const parseCap = (c) => parseFloat(String(c).replace(/[^0-9.]/g, '')) * (String(c).includes('T') ? 1000 : 1);
          return parseCap(b.marketCap || '0') - parseCap(a.marketCap || '0');
        }
        return 0;
      });

      // Sector statistics
      const buyCount = stocksInSector.filter(s => s.isBuy).length;
      const sellCount = stocksInSector.filter(s => !s.isBuy).length;
      const avgDiscount = stocksInSector.filter(s => s.isBuy).reduce((acc, s) => acc + s.upsidePercent, 0) / (buyCount || 1);

      return `
        <!-- SECTOR TILE / HUB: ${meta.name} -->
        <div class="sector-block" data-sector="${secKey}">
          <div class="sector-block-header">
            <div class="sb-header-top">
              <div class="sb-identity">
                <span class="sb-icon">${meta.icon}</span>
                <span class="sb-name">${meta.name}</span>
                <span class="sb-etf">${meta.etf}</span>
              </div>
              <div class="sb-badges">
                <span class="sb-stance-badge tone-${meta.stanceTone}">
                  ${meta.stance}
                </span>
                <span class="sb-stat-pill">Forward P/E: <strong>${meta.peForward}</strong></span>
                <span class="sb-stat-pill">
                  <strong>${buyCount}</strong> Undervalued • <strong>${sellCount}</strong> Overvalued
                </span>
              </div>
            </div>
            <p class="sb-summary-text">
              <strong>Sector Takeaway:</strong> ${meta.summary}
            </p>
          </div>

          <!-- Stock Tiles in this Sector -->
          <div class="sector-stocks-grid">
            ${stocksInSector.map(stock => this.renderStockTileHTML(stock)).join('')}
          </div>
        </div>
      `;
    }).join('');

    this.stocksGrid.innerHTML = html;

    // Attach click handlers to open modal on any stock tile
    document.querySelectorAll('.stock-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const ticker = tile.getAttribute('data-ticker');
        this.openDeepDive(ticker);
      });
    });
  },

  renderStockTileHTML(stock) {
    const isBuy = stock.isBuy;
    const isPositiveChange = stock.change >= 0;
    const changeSign = isPositiveChange ? '+' : '';
    const changeColorClass = isPositiveChange ? 'color-buy' : 'color-sell';

    const upsideSign = stock.upsidePercent > 0 ? '+' : '';
    const upsideVal = Math.abs(stock.upsidePercent || 0);
    const barWidth = Math.min(Math.max(upsideVal * 2, 10), 100);

    const fwdPE = stock.valuation?.peForward ? `${stock.valuation.peForward}x` : '—';
    const indPE = stock.valuation?.industryPE ? `${stock.valuation.industryPE}x` : '—';
    const peg = stock.valuation?.pegRatio || '—';
    const thesisOneLiner = stock.executiveThesis && stock.executiveThesis[0] ? stock.executiveThesis[0] : (stock.verdictPill || '');

    return `
      <div class="stock-tile ${isBuy ? 'is-undervalued' : 'is-overvalued'}" data-ticker="${stock.ticker}">
        <!-- Top Row: Ticker, Name, Status Badge -->
        <div class="st-header">
          <div>
            <div class="st-ticker-row">
              <span class="st-ticker">${stock.ticker}</span>
              <span class="st-price-mini">$${stock.price.toFixed(2)}</span>
            </div>
            <div class="st-name" title="${stock.name}">${stock.name}</div>
          </div>
          <span class="st-val-badge ${isBuy ? 'val-buy' : 'val-sell'}">
            ${isBuy ? '🟢 UNDERVALUED' : '🔴 OVERVALUED'}
          </span>
        </div>

        <!-- Comparative Price vs Fair Value Box -->
        <div class="st-compare-box">
          <div class="st-compare-row">
            <span class="st-cur-price-lbl">Current Market Price:</span>
            <span class="st-cur-price-val">$${stock.price.toFixed(2)} <span class="${changeColorClass}">(${changeSign}${stock.changePercent.toFixed(2)}%)</span></span>
          </div>
          <div class="st-compare-row">
            <span class="st-fair-price-lbl">Intrinsic Fair Value:</span>
            <span class="st-fair-price-val ${isBuy ? 'color-buy' : 'color-sell'}">$${stock.fairValueEstimate.toFixed(2)}</span>
          </div>

          <!-- Disconnect Visual Bar -->
          <div class="st-meter-track">
            <div class="st-meter-fill ${isBuy ? 'fill-buy' : 'fill-sell'}" style="width: ${barWidth}%;"></div>
          </div>
          <div class="st-meter-labels">
            <span class="${isBuy ? 'color-buy' : 'color-sell'}">
              ${isBuy ? `▲ +${stock.upsidePercent}% Margin of Safety` : `▼ ${stock.upsidePercent}% Downside Risk`}
            </span>
            <span style="color: #64748B;">Target: $${stock.targetPrice.toFixed(2)}</span>
          </div>
        </div>

        <!-- Multiples Row -->
        <div class="st-multiples-row">
          <span class="st-mult-pill">Fwd P/E: <strong>${fwdPE}</strong> (Ind: ${indPE})</span>
          <span class="st-mult-pill">PEG: <strong>${peg}</strong></span>
          <span class="st-mult-pill">Cap: <strong>${stock.marketCap}</strong></span>
        </div>

        <!-- Plain English 1-Line Thesis -->
        <p class="st-thesis-text">
          <strong>Takeaway:</strong> ${thesisOneLiner}
        </p>

        <!-- Bottom Action CTA -->
        <div class="st-action-row">
          <span class="st-conviction">Conviction: <strong>${stock.convictionScore}/10</strong></span>
          <span class="st-deep-dive-btn">
            📖 5-Min Deep Dive &amp; Audio →
          </span>
        </div>
      </div>
    `;
  },

  resetFilters() {
    this.searchQuery = '';
    if (this.searchInput) this.searchInput.value = '';
    if (this.clearSearchBtn) this.clearSearchBtn.style.display = 'none';
    this.currentSector = 'all';
    this.valuationFilter = 'all';

    document.querySelectorAll('.val-pill').forEach((p, idx) => {
      p.classList.toggle('active', idx === 0);
    });
    document.querySelectorAll('.sector-pill').forEach((p, idx) => {
      p.classList.toggle('active', idx === 0);
    });

    this.render();
  },

  openDeepDive(ticker) {
    const all = [...this.stocksData.buys, ...this.stocksData.sells];
    const stock = all.find(s => s.ticker === ticker);
    if (!stock) return;

    this.activeStock = stock;
    const isBuy = stock.action === 'BUY';

    // Populate Modal Header
    this.modalActionPill.textContent = isBuy ? 'UNDERVALUED (BUY)' : 'OVERVALUED (SELL)';
    this.modalActionPill.className = `modal-action-pill ${isBuy ? 'buy' : 'sell'}`;
    this.modalActionPill.style.backgroundColor = isBuy ? 'var(--color-buy-bg)' : 'var(--color-sell-bg)';
    this.modalActionPill.style.color = isBuy ? 'var(--color-buy)' : 'var(--color-sell)';
    this.modalActionPill.style.border = `1px solid ${isBuy ? 'var(--color-buy-border)' : 'var(--color-sell-border)'}`;

    this.modalVerdictPill.textContent = stock.verdictPill;

    this.modalTicker.textContent = stock.ticker;
    this.modalName.textContent = stock.name;
    this.modalSector.textContent = `${stock.sector} • ${stock.industry}`;
    this.modalPrice.textContent = `$${stock.price.toFixed(2)}`;

    const changeSign = stock.change >= 0 ? '+' : '';
    this.modalChange.textContent = `${changeSign}${stock.changePercent.toFixed(2)}% (${changeSign}$${stock.change.toFixed(2)})`;
    this.modalChange.style.color = stock.change >= 0 ? 'var(--color-buy)' : 'var(--color-sell)';

    this.modalReadTime.textContent = `${stock.readTimeMinutes}-minute plain-English read`;

    // 1. Executive Thesis
    this.modalThesisList.innerHTML = stock.executiveThesis.map(t => `<li>${t}</li>`).join('');

    // 2. Valuation & Fair Value
    this.modalFairValue.textContent = `$${stock.fairValueEstimate.toFixed(2)}`;
    const upsideSign = stock.upsidePercent > 0 ? '+' : '';
    this.modalMarginPill.textContent = `${upsideSign}${stock.upsidePercent}% ${isBuy ? 'Upside' : 'Downside'}`;
    this.modalMarginPill.style.backgroundColor = isBuy ? 'var(--color-buy-bg)' : 'var(--color-sell-bg)';
    this.modalMarginPill.style.color = isBuy ? 'var(--color-buy)' : 'var(--color-sell)';

    this.modalFairValueBar.style.backgroundColor = isBuy ? 'var(--color-buy)' : 'var(--color-sell)';
    this.modalFairValueBar.style.width = `${Math.min(Math.abs(stock.upsidePercent) * 2.5, 100)}%`;

    this.modalBarCurrentPrice.textContent = `$${stock.price.toFixed(2)}`;
    this.modalBarTargetPrice.textContent = `$${stock.targetPrice.toFixed(2)}`;

    this.modalForwardPE.textContent = `${stock.valuation.peForward}x`;
    this.modalIndustryPE.textContent = `${stock.valuation.industryPE}x`;
    this.modalPEGRatio.textContent = `${stock.valuation.pegRatio}`;
    this.modalPEVerdict.textContent = stock.valuation.peVerdict;
    this.modalValuationSummary.textContent = stock.valuation.summary;

    // 3. Financial Health
    this.modalRevGrowth.textContent = stock.financialHealth.revenueGrowthYoY;
    this.modalOpMargin.textContent = stock.financialHealth.operatingMargin;
    this.modalFCFStatus.textContent = stock.financialHealth.cashFlowStatus;
    this.modalDebtRatio.textContent = stock.financialHealth.debtToEquity;
    this.modalCashVsDebt.textContent = stock.financialHealth.cashVsDebt;
    this.modalFinancialSummary.textContent = stock.financialHealth.summary;

    // 4. Market Expectations
    this.modalConsensusRating.textContent = stock.marketExpectations.wallStreetConsensus.consensusRating;
    this.modalConsensusCounts.textContent = `${stock.marketExpectations.wallStreetConsensus.buy} Buys, ${stock.marketExpectations.wallStreetConsensus.hold} Holds, ${stock.marketExpectations.wallStreetConsensus.sell} Sells`;
    this.modalLowTarget.textContent = `$${stock.marketExpectations.lowTarget.toFixed(2)}`;
    this.modalAvgTarget.textContent = `$${stock.marketExpectations.averagePriceTarget.toFixed(2)}`;
    this.modalHighTarget.textContent = `$${stock.marketExpectations.highTarget.toFixed(2)}`;
    this.modalCatalystsList.innerHTML = stock.marketExpectations.upcomingCatalysts.map(c => `<li>${c}</li>`).join('');

    // 5. Risks
    this.modalRisksList.innerHTML = stock.risks.map(r => `<li>${r}</li>`).join('');

    // 6. Actionable Bottom Line
    this.modalZoneLabel.textContent = isBuy ? "Accumulation Zone" : "Liquidation Zone";
    this.modalZoneVal.textContent = stock.actionableBottomLine.accumulationZone;
    this.modalStopLoss.textContent = stock.actionableBottomLine.stopLossReference;
    this.modalBottomConviction.textContent = `${stock.actionableBottomLine.convictionScore} / 10`;
    this.modalPlainEnglishTakeaway.textContent = stock.actionableBottomLine.plainEnglishTakeaway;

    // Show Modal
    this.modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  },

  closeModal() {
    this.modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    this.activeStock = null;
    window.SpeechEngine.stop();
  },

  playStockAudio() {
    if (!this.activeStock) return;
    const s = this.activeStock;
    const text = `
      Investment App Intelligence Report for ${s.name}, ticker ${s.ticker}.
      Valuation status is ${s.action === 'BUY' ? 'Undervalued Bargain' : 'Overvalued Risk'}, with a conviction score of ${s.convictionScore} out of 10.
      Executive thesis: ${s.executiveThesis.join('. ')}.
      Fair value estimate is $${s.fairValueEstimate}, representing ${s.upsidePercent} percent disconnect to current price.
      Bottom line verdict: ${s.actionableBottomLine.plainEnglishTakeaway}
    `;
    window.SpeechEngine.speak(text, `${s.ticker} 90s Briefing`);
  },

  playGlobalBriefing() {
    const macroSpeech = window.MacroDashboard ? window.MacroDashboard.getSpokenSummary() : '';
    const totalCount = (this.stocksData.buys.length || 40) + (this.stocksData.sells.length || 36);
    const buyCount = this.stocksData.buys.length || 40;
    const sellCount = this.stocksData.sells.length || 36;
    const text = macroSpeech ? `${macroSpeech} Additionally, in our Sector Valuation radar, we screen all ${totalCount} top sector leaders across 11 S&P sectors, identifying ${buyCount} undervalued bargains led by ASML, Alphabet, Amazon, and Uber, alongside ${sellCount} overvalued bubble risks to avoid led by Intel, Tesla, and Palantir.` : `
      Welcome to today's Investment App briefing for ${this.editionDate ? this.editionDate.textContent : 'today'}.
      Today's market regime: ${this.marketEdgeText ? this.marketEdgeText.textContent : 'Institutional Quality Rotation'}.
      Our quant models identify ${buyCount} high-conviction undervalued buys with an average fair value upside of 18 percent, led by ASML, Alphabet, Amazon, and Uber.
      Meanwhile, ${sellCount} stocks are flagged as overvalued risks with significant downside, led by Intel, Tesla, and Palantir.
    `;
    window.SpeechEngine.speak(text, "Investment App Daily Briefing");
  },

  initTooltips() {
    const tooltip = document.getElementById('appTooltip');
    if (!tooltip) return;

    const terms = {
      'P/E': 'Price-to-Earnings: How much you pay for $1 of current company profit. Lower indicates better value.',
      'Forward P/E': 'Valuation based on projected profits over the next 12 months.',
      'PEG': 'Price/Earnings-to-Growth: A PEG around 1.0 means you are paying a fair price for projected company growth.',
      'Free Cash Flow': 'Actual cash left over after paying all operating expenses and equipment upgrades.',
      'DCF': 'Discounted Cash Flow: Calculating what a company is worth today based on all its future cash generation.',
      'Operating Margin': 'The percentage of revenue left after paying for variable costs of production.',
      'Gross Margin': 'Percentage of total sales revenue that the company retains after incurring the direct costs.',
      'Debt-to-Equity': 'Total liabilities divided by shareholder equity. Under 1.0 indicates conservative leverage.',
      'Conviction': 'Algorithmically weighted institutional confidence score out of 10 based on margin of safety.'
    };

    document.querySelectorAll('[data-tooltip]').forEach(el => {
      el.addEventListener('mouseenter', (e) => {
        const term = el.getAttribute('data-tooltip');
        if (terms[term]) {
          tooltip.textContent = terms[term];
          tooltip.style.display = 'block';
          const rect = el.getBoundingClientRect();
          tooltip.style.left = `${rect.left + window.scrollX}px`;
          tooltip.style.top = `${rect.bottom + window.scrollY + 6}px`;
        }
      });

      el.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });
    });
  }
};

window.App = App;

// Initialize App when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
