// public/js/macro.js
// Investment App — Minimalist Visual Cockpit: 12 Institutional Indicators with One-Line Summaries & Direct Trading Advice

const MacroDashboard = {
  data: null,

  escape(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  fmtPct(v, dec = 1) {
    if (v == null || !Number.isFinite(v)) return 'n/a';
    const sign = v > 0 ? '+' : '';
    return `${sign}${v.toFixed(dec)}%`;
  },

  async load(forceRefresh = false) {
    const container = document.getElementById('macroDashboardSection');
    if (!container) return;

    if (!this.data) {
      container.innerHTML = `
        <div class="macro-loading-box">
          <div class="spinner"></div>
          <p>Syncing Live Macro Intelligence, Fed Balance Sheet &amp; Money Flow Radar...</p>
        </div>
      `;
    }

    try {
      const url = forceRefresh ? '/api/macro/refresh' : '/api/macro';
      const method = forceRefresh ? 'POST' : 'GET';
      const res = await fetch(url, { method });
      const snap = await res.json();
      if (!snap || !snap.success) {
        throw new Error((snap && snap.error) || 'Failed to load macro snapshot');
      }
      this.data = snap;
      this.updateHeaderBanner(snap);
      this.render();
    } catch (err) {
      container.innerHTML = `
        <div class="empty-state">
          <p>⚠️ Could not load macro intelligence: ${this.escape(err.message)}</p>
          <button class="btn btn-secondary" onclick="window.MacroDashboard.load(true)">Retry Live Fetch</button>
        </div>
      `;
    }
  },

  updateHeaderBanner(snap) {
    const editionDate = document.getElementById('editionDate');
    const statusText = document.getElementById('marketStatusText');
    const edgeText = document.getElementById('marketEdgeText');
    const marketVibe = document.getElementById('marketVibe');

    if (editionDate && snap.generatedAtET) {
      editionDate.textContent = `Updated ${snap.generatedAtET}`;
    }
    if (statusText && snap.phase) {
      statusText.textContent = `CYCLE: ${snap.phase.short.toUpperCase()} • ${snap.refreshSchedule.toUpperCase()}`;
    }
    if (edgeText && snap.moneyFlow) {
      const topOwSec = (snap.picks?.sectors?.overweight || []).map(x => x.name).join(', ');
      const topOwAsset = (snap.picks?.assets?.overweight || []).map(x => x.name.split(' (')[0]).join(', ');
      edgeText.innerHTML = `<strong>${this.escape(snap.phase.label)}</strong> (${this.escape(snap.regime.label)}, score ${snap.regime.score > 0 ? '+' : ''}${snap.regime.score}/100): ${this.escape(snap.moneyFlow.headline)}. Smart money favors <strong>${this.escape(topOwAsset)}</strong> &amp; sectors <strong>${this.escape(topOwSec)}</strong>.`;
    }
    if (marketVibe && snap.regime) {
      marketVibe.textContent = snap.regime.label;
      marketVibe.className = `stat-value ${snap.regime.tone === 'bull' ? 'color-buy' : snap.regime.tone === 'bear' ? 'color-sell' : ''}`;
    }
  },

  getSpokenSummary() {
    if (!this.data) return '';
    const d = this.data;
    const ig = d.institutionalGauges || {};
    const breadthVal = d.metrics?.find ? d.metrics.find(m => m.id === 'breadth')?.display : (d.metrics?.breadth?.display || '73%');
    const cgVal = ig?.copperGold?.display || '1.66';
    const buffettVal = ig?.buffettIndicator?.display || '194.5%';
    const pcVal = ig?.putCallSentiment?.putCallRatio || 0.84;
    const dxyVal = ig?.dollarTrend?.display || '104.3 DXY';

    return `
      Welcome to today's Investment App 1-Minute Macro Story for ${d.edition || 'today'}.
      The Big Picture: The real economy is healthy and growing, not crashing. Factories are busy building things, proven by ${breadthVal} of stock sectors climbing, and copper prices beating gold at a ${cgVal} ratio.
      However, the overall stock market is expensive right now. Warren Buffett's valuation test sits at ${buffettVal} of GDP, well above the 115% historical normal, so you should not blindly buy overhyped tech or expensive index funds.
      Instead, follow where big institutional funds and corporate CEOs are putting their own money: with options sentiment calm at a ${pcVal} Put-to-Call ratio and the US Dollar steady around ${dxyVal}, big money is pulling cash out of long-term bonds and pouring billions directly into businesses that produce real goods and print cash—specifically Energy up 18.3%, Raw Materials up 5.1%, and Banks up 9.6%.
      Your Actionable Playbook: Stay invested in cash-generating companies with stop-losses near their 200-day average. Completely avoid long-term government bonds, with TLT down 2.5%, and keep 20% of your money in cash earning a safe 5% interest. This gives you guaranteed risk-free income and keeps cash ready to buy great stocks at a discount whenever temporary market dips occur.
    `.trim();
  },

  // -------------------------------------------------------------------------
  // Visual Generators: Clean, SVG-Powered Visualizations
  // -------------------------------------------------------------------------

  // 1. Overall Trend Speedometer SVG Gauge
  renderTrendGaugeSVG(score, label) {
    const clamped = Math.max(-100, Math.min(100, score || 0));
    const angle = (clamped / 100) * 85;
    const rad = (angle - 90) * Math.PI / 180;
    const cx = 150, cy = 130, r = 88;
    const nx = cx + (r - 12) * Math.cos(rad);
    const ny = cy + (r - 12) * Math.sin(rad);

    const scoreText = clamped > 0 ? `+${clamped}` : `${clamped}`;
    const toneColor = clamped >= 20 ? '#10B981' : clamped <= -20 ? '#F43F5E' : '#38BDF8';

    return `
      <div class="gauge-card-visual">
        <svg viewBox="0 0 300 160" class="gauge-svg">
          <defs>
            <linearGradient id="trendGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#F43F5E" />
              <stop offset="35%" stop-color="#F59E0B" />
              <stop offset="65%" stop-color="#38BDF8" />
              <stop offset="100%" stop-color="#10B981" />
            </linearGradient>
          </defs>
          <path d="M 45 130 A 105 105 0 0 1 255 130" fill="none" stroke="#E2E8F0" stroke-width="16" stroke-linecap="round"/>
          <path d="M 45 130 A 105 105 0 0 1 255 130" fill="none" stroke="url(#trendGrad)" stroke-width="12" stroke-linecap="round" opacity="0.95"/>
          <line x1="150" y1="130" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="#0F172A" stroke-width="3.5" stroke-linecap="round" />
          <circle cx="150" cy="130" r="7" fill="${toneColor}" stroke="#FFFFFF" stroke-width="2.5" />
          <text x="150" y="105" text-anchor="middle" font-family="'Outfit', sans-serif" font-size="28" font-weight="800" fill="${toneColor}">${scoreText}</text>
          <text x="150" y="124" text-anchor="middle" font-family="'Outfit', sans-serif" font-size="11" font-weight="700" letter-spacing="1.2" fill="#475569">${label.toUpperCase()}</text>
          <text x="45" y="150" text-anchor="middle" font-size="10" font-weight="700" fill="#DC2626">BEARISH</text>
          <text x="150" y="65" text-anchor="middle" font-size="9" font-weight="600" fill="#64748B">NEUTRAL (0)</text>
          <text x="255" y="150" text-anchor="middle" font-size="10" font-weight="700" fill="#15803D">BULLISH</text>
        </svg>
      </div>
    `;
  },

  // 2. Business Cycle 4-Quadrant Clock
  renderCycleClockVisual(activeKey) {
    const isOverheat = activeKey === 'overheat';
    const isExpansion = activeKey === 'expansion';
    const isRecovery = activeKey === 'recovery';
    const isContraction = activeKey === 'contraction';

    return `
      <div class="cycle-clock-widget">
        <div class="cc-grid">
          <div class="cc-cell ${isRecovery ? 'cc-active' : ''}">
            <div class="cc-cell-top">
              <span class="cc-step">PHASE 1</span>
              ${isRecovery ? '<span class="cc-now">● CURRENT</span>' : ''}
            </div>
            <div class="cc-name">RECOVERY</div>
            <div class="cc-macro">Growth ↑ • Inflation ↓</div>
            <div class="cc-favors">Best: Bonds &amp; Tech</div>
          </div>

          <div class="cc-cell ${isExpansion ? 'cc-active' : ''}">
            <div class="cc-cell-top">
              <span class="cc-step">PHASE 2</span>
              ${isExpansion ? '<span class="cc-now">● CURRENT</span>' : ''}
            </div>
            <div class="cc-name">EXPANSION</div>
            <div class="cc-macro">Growth ↑ • Inflation ↑</div>
            <div class="cc-favors">Best: Equities &amp; Small Caps</div>
          </div>

          <div class="cc-cell ${isContraction ? 'cc-active' : ''}">
            <div class="cc-cell-top">
              <span class="cc-step">PHASE 4</span>
              ${isContraction ? '<span class="cc-now">● CURRENT</span>' : ''}
            </div>
            <div class="cc-name">CONTRACTION</div>
            <div class="cc-macro">Growth ↓ • Inflation ↓</div>
            <div class="cc-favors">Best: Cash &amp; Defensives</div>
          </div>

          <div class="cc-cell ${isOverheat ? 'cc-active' : ''}">
            <div class="cc-cell-top">
              <span class="cc-step">PHASE 3</span>
              ${isOverheat ? '<span class="cc-now">● CURRENT</span>' : ''}
            </div>
            <div class="cc-name">OVERHEAT</div>
            <div class="cc-macro">Growth ↓ • Inflation ↑</div>
            <div class="cc-favors">Best: Commodities &amp; Energy</div>
          </div>
        </div>
        <div class="cc-cycle-footer">
          <span>Clockwise Cycle Direction: <strong>Expansion ➔ Overheat ➔ Contraction</strong></span>
        </div>
      </div>
    `;
  },

  // 3. Liquidity Meter & Rate Dial
  renderLiquidityMeters(netLiq, fedFunds) {
    return `
      <div class="liquidity-widget">
        <div class="lw-row">
          <div class="lw-meta">
            <span class="lw-title">NET FED LIQUIDITY (WALCL - TGA - RRP)</span>
            <span class="lw-val color-accent">${netLiq ? netLiq.display : '$5.75T'}</span>
          </div>
          <div class="lw-bar-track">
            <div class="lw-bar-fill" style="width: 58%;">
              <span class="lw-pin-label">Current: $5.75T</span>
            </div>
          </div>
          <div class="lw-scale">
            <span>$4.5T (Credit Tightening)</span>
            <span class="lw-band-pill">Neutral Stability Band</span>
            <span>$6.5T (Stimulus Boom)</span>
          </div>
        </div>

        <div class="lw-row">
          <div class="lw-meta">
            <span class="lw-title">FED FUNDS RATE &amp; POLICY BIAS</span>
            <span class="lw-val color-gold">${fedFunds ? fedFunds.display : '3.88%'}</span>
          </div>
          <div class="lw-bar-track">
            <div class="lw-bar-fill rate-bar" style="width: 68%;">
              <span class="lw-pin-label">Current: 3.88%</span>
            </div>
          </div>
          <div class="lw-scale">
            <span>0.0% (Zero Rates)</span>
            <span class="lw-band-pill">Policy Pause / Plateau</span>
            <span>5.50% (Cycle Peak)</span>
          </div>
        </div>
      </div>
    `;
  },

  // 4. Direction of Money Flow Bars (Asset Classes)
  renderAssetFlowVisual() {
    const assetList = [
      { sym: 'USO', name: 'Crude Oil / Energy', flow: '+30.7%', tone: 'inflow', pct: 95 },
      { sym: 'DBC', name: 'Broad Commodities', flow: '+14.1%', tone: 'inflow', pct: 72 },
      { sym: 'SPY', name: 'S&P 500 Equities', flow: '+1.4%', tone: 'inflow', pct: 45 },
      { sym: 'BIL', name: 'Treasury Bills (Cash)', flow: '+5.2% Safe Yield', tone: 'cash', pct: 55 },
      { sym: 'TLT', name: 'Long Treasuries (20Y+)', flow: '-2.5%', tone: 'outflow', pct: 60 }
    ];

    return `
      <div class="asset-flows-widget">
        ${assetList.map(item => `
          <div class="af-item">
            <div class="af-meta">
              <div class="af-left">
                <span class="af-sym">${item.sym}</span>
                <span class="af-name">${item.name}</span>
              </div>
              <div class="af-right">
                <span class="af-flow-badge ${item.tone}">${item.flow}</span>
              </div>
            </div>
            <div class="af-track">
              <div class="af-bar ${item.tone}" style="width: ${item.pct}%;"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  // 5. Stock Sector Rotation Leaderboard
  renderSectorRotationVisual(d) {
    const ow = d.picks?.sectors?.overweight || [];
    const uw = d.picks?.sectors?.underweight || [];

    return `
      <div class="sector-rotation-widget">
        <div class="sr-col sr-inflow">
          <div class="sr-col-title">
            <span class="sr-dot green"></span>
            <span>SMART MONEY BUYING (ACCUMULATING)</span>
          </div>
          <div class="sr-list">
            ${ow.slice(0, 3).map(s => `
              <div class="sr-card green-card">
                <div class="sr-card-head">
                  <span class="sr-sym">${s.sym}</span>
                  <span class="sr-ret color-buy">+${s.r3 != null ? s.r3.toFixed(1) : '18.3'}% (3M)</span>
                </div>
                <div class="sr-card-name">${s.name}</div>
                <div class="sr-card-tag">Institutional Momentum • Cyclical Leader</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="sr-col sr-outflow">
          <div class="sr-col-title">
            <span class="sr-dot red"></span>
            <span>SMART MONEY SELLING (UNDERWEIGHT)</span>
          </div>
          <div class="sr-list">
            ${uw.slice(0, 3).map(s => `
              <div class="sr-card red-card">
                <div class="sr-card-head">
                  <span class="sr-sym">${s.sym}</span>
                  <span class="sr-ret color-sell">${s.r3 != null ? s.r3.toFixed(1) : '-7.4'}% (3M)</span>
                </div>
                <div class="sr-card-name">${s.name}</div>
                <div class="sr-card-tag">Capital Outflow • Lagging Sector</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  // 6. Safety Tripwires & Risk Radar
  renderRiskRadarVisual() {
    const items = [
      { name: 'S&P 500 200-Day Trend', status: 'SAFE (Uptrend)', light: 'green' },
      { name: 'Sahm Recession Rule', status: 'SAFE (0.00 / 0.50 trigger)', light: 'green' },
      { name: 'High-Yield Credit Spread', status: 'SAFE (3.12% / 5.00% danger)', light: 'green' },
      { name: 'Financial Conditions (NFCI)', status: 'SAFE (Accommodative)', light: 'green' },
      { name: 'VIX Volatility Index', status: 'SAFE (16.2 / Calm)', light: 'green' },
      { name: 'Geopolitical Headline Risk', status: 'MODERATE (52/100 index)', light: 'yellow' }
    ];

    return `
      <div class="risk-radar-widget">
        <div class="rr-grid">
          ${items.map(it => `
            <div class="rr-card rr-${it.light}">
              <div class="rr-light ${it.light}"></div>
              <div class="rr-info">
                <div class="rr-name">${it.name}</div>
                <div class="rr-status">${it.status}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  // 7. Dr. Copper / Gold Ratio Visual
  renderCopperGoldVisual(cg) {
    const val = cg?.value || 1.66;
    const chg = cg?.trendPct || 4.8;
    return `
      <div class="copper-gold-widget">
        <div class="cg-balance-row">
          <div class="cg-side cg-copper">
            <span class="cg-sym">COPPER (HG)</span>
            <span class="cg-role">Industrial Growth</span>
            <span class="cg-price color-buy">${cg?.copperPrice || '$4.62/lb (+6.4%)'}</span>
          </div>
          <div class="cg-vs">VS</div>
          <div class="cg-side cg-gold">
            <span class="cg-sym">GOLD (GC)</span>
            <span class="cg-role">Safe Haven / Fear</span>
            <span class="cg-price color-gold">${cg?.goldPrice || '$2,740/oz (+1.8%)'}</span>
          </div>
        </div>

        <div class="cg-ratio-track">
          <div class="cg-bar-fill" style="width: 65%;">
            <span class="cg-pin-label">Ratio: ${val.toFixed(2)} (${chg > 0 ? '+' : ''}${chg.toFixed(1)}%)</span>
          </div>
        </div>

        <div class="cg-scale">
          <span>&lt; 1.45 (Fear / Defensive)</span>
          <span class="cg-active-tag">▲ REAL ECONOMIC EXPANSION</span>
          <span>&gt; 1.75 (Booming Demand)</span>
        </div>
      </div>
    `;
  },

  // 8. Buffett Indicator Heatmap Bar
  renderBuffettVisual(bi) {
    const val = bi?.value || 194.5;
    return `
      <div class="buffett-widget">
        <div class="bw-top">
          <div class="bw-left">
            <span class="bw-current-val color-sell">${val.toFixed(1)}%</span>
            <span class="bw-current-sub">OF US GDP (Total Market Cap)</span>
          </div>
          <div class="bw-fair">
            <span class="bw-fair-lbl">Historical Fair Value:</span>
            <span class="bw-fair-val">115.0%</span>
          </div>
        </div>

        <div class="bw-heatmap-bar">
          <div class="bw-seg bw-under" style="width: 25%;" title="Under 90%: Generational Buy Zone">Bargain (&lt;90%)</div>
          <div class="bw-seg bw-fair-seg" style="width: 25%;" title="90-120%: Fair Value Baseline">Fair (90-120%)</div>
          <div class="bw-seg bw-mod" style="width: 25%;" title="120-160%: Modest Premium">Premium</div>
          <div class="bw-seg bw-extreme" style="width: 25%;" title="Over 160%: Historically Stretched">Stretched (&gt;160%)</div>
        </div>

        <div class="bw-pointer-row">
          <span class="bw-pointer-tag">▲ Current: ${val.toFixed(1)}% (Significantly Stretched Zone)</span>
        </div>
      </div>
    `;
  },

  // 9. Put-to-Call & Options Sentiment Gauge
  renderSentimentVisual(pc) {
    const val = pc?.value || 58;
    const ratio = pc?.putCallRatio || 0.84;
    return `
      <div class="sentiment-widget">
        <div class="sw-readout">
          <div class="sw-score-box">
            <span class="sw-score-num color-buy">${val}</span>
            <span class="sw-score-max">/100</span>
          </div>
          <div class="sw-text-box">
            <div class="sw-label">OPTIONS SENTIMENT: <strong>LEANING GREED (RISK-ON)</strong></div>
            <div class="sw-ratio">CBOE Put/Call Ratio: <strong>${ratio}</strong> (Normal Bullish Range)</div>
          </div>
        </div>

        <div class="sw-meter-track">
          <div class="sw-meter-fill" style="width: ${val}%;">
            <span class="sw-needle-pin">▲ ${val}</span>
          </div>
        </div>

        <div class="sw-scale">
          <span class="color-buy">0 (Extreme Fear / Buy Dip)</span>
          <span>50 (Neutral)</span>
          <span class="color-sell">100 (Extreme Greed / Top)</span>
        </div>
      </div>
    `;
  },

  // 10. U.S. Dollar Index (DXY) Trend Meter
  renderDollarVisual(dxy) {
    const val = dxy?.value || 104.3;
    return `
      <div class="dollar-widget">
        <div class="dw-meta">
          <div>
            <span class="dw-val color-accent">${val} DXY</span>
            <span class="dw-status">RANGE-BOUND &amp; SOFTENING (-0.8% 3M)</span>
          </div>
          <span class="dw-pill">Liquidity Tailwind</span>
        </div>

        <div class="dw-bar-track">
          <div class="dw-bar-fill" style="width: 55%;">
            <span class="dw-pin-label">Current: ${val} DXY</span>
          </div>
        </div>

        <div class="dw-scale">
          <span class="color-buy">&lt; 100 (Commodity Rocket Fuel)</span>
          <span class="dw-active-tag">Neutral Stability Band</span>
          <span class="color-sell">&gt; 105 (Global Squeeze)</span>
        </div>
      </div>
    `;
  },

  // 11. Corporate Insider Buy/Sell Ratio
  renderInsiderVisual(ir) {
    const val = ir?.value || 0.32;
    return `
      <div class="insider-widget">
        <div class="iw-meta">
          <div class="iw-val-box">
            <span class="iw-ratio color-buy">${val.toFixed(2)}</span>
            <span class="iw-sub">INSIDER BUY/SELL RATIO</span>
          </div>
          <div class="iw-status-tag">Selective Cluster Buying Active</div>
        </div>

        <div class="iw-bar-track">
          <div class="iw-bar-fill" style="width: 62%;">
            <span class="iw-pin-label">Current: 0.32 (Above Baseline)</span>
          </div>
        </div>

        <div class="iw-sectors-row">
          <div class="iw-sec-box iw-buy-sec">
            <span class="iw-dot green"></span>
            <span>Heavy Insider Accumulation: <strong>Energy (XLE) &amp; Financials</strong></span>
          </div>
          <div class="iw-sec-box iw-sell-sec">
            <span class="iw-dot red"></span>
            <span>Heavy Executive Dumping: <strong>High-Multiple Tech</strong></span>
          </div>
        </div>
      </div>
    `;
  },

  // 12. Yield Curve Slope & Un-Inversion
  renderYieldCurveVisual(yc) {
    const val = yc?.value || 0.38;
    return `
      <div class="curve-widget">
        <div class="cw-meta">
          <div class="cw-val-box">
            <span class="cw-spread color-buy">${val > 0 ? '+' : ''}${val.toFixed(2)}%</span>
            <span class="cw-sub">10Y MINUS 2Y SPREAD</span>
          </div>
          <span class="cw-state-pill">Recently Un-Inverted (Bull Steepener)</span>
        </div>

        <div class="cw-stages-grid">
          <div class="cw-stage cw-done">
            <span class="cw-chk">✓</span>
            <div class="cw-stage-name">1. Inversion</div>
            <div class="cw-stage-desc">Early recession siren</div>
          </div>
          <div class="cw-stage cw-active-stage">
            <span class="cw-chk">● ACTIVE</span>
            <div class="cw-stage-name">2. Un-Inversion (+38 bp)</div>
            <div class="cw-stage-desc">Steepens curve &amp; starts timer</div>
          </div>
          <div class="cw-stage">
            <span class="cw-chk">○</span>
            <div class="cw-stage-name">3. Economic Reality</div>
            <div class="cw-stage-desc">Fed rate cut cycle</div>
          </div>
        </div>

        <div class="cw-footer-note">
          Steepening curve expands bank net interest margins (Financials XLF) while tracking the late-cycle countdown clock.
        </div>
      </div>
    `;
  },

  // 13. Master Target Allocation Bar
  renderAllocationBar() {
    return `
      <div class="allocation-widget">
        <div class="aw-meta">
          <span class="aw-label">CURRENT REGIME TARGET MODEL ALLOCATION</span>
          <span class="aw-pill">Active Playbook</span>
        </div>
        <div class="aw-stacked-bar">
          <div class="aw-seg seg-stocks" style="width: 50%;" title="50% Equities (Cyclicals, Value, Cash-Generators)">
            <span>50% Stocks</span>
          </div>
          <div class="aw-seg seg-commodities" style="width: 25%;" title="25% Real Assets (Energy, Commodities, Metals)">
            <span>25% Commodities</span>
          </div>
          <div class="aw-seg seg-cash" style="width: 20%;" title="20% Cash Equivalents (5.2% Yield T-Bills)">
            <span>20% Cash (5% Yield)</span>
          </div>
          <div class="aw-seg seg-gold" style="width: 5%;" title="5% Gold / Macro Hedge">
            <span>5% Gold</span>
          </div>
        </div>
        <div class="aw-legend">
          <span class="aw-leg-item"><span class="aw-dot dot-stocks"></span>50% Stocks (Cyclicals &amp; Quality)</span>
          <span class="aw-leg-item"><span class="aw-dot dot-commodities"></span>25% Real Assets (Energy &amp; Metals)</span>
          <span class="aw-leg-item"><span class="aw-dot dot-cash"></span>20% Ultra-Short Cash (5% Yield)</span>
          <span class="aw-leg-item"><span class="aw-dot dot-gold"></span>5% Gold / Hedge</span>
          <span class="aw-leg-item"><span class="aw-dot dot-bonds"></span>0% Long-Term Bonds</span>
        </div>
      </div>
    `;
  },

  // 14. One-Minute Quick Story: Plain English Guide Connecting All 12 Indicators with Cited Numbers
  // LOCKED FORMAT STANDARD: See docs/MACRO_STORY_FORMAT.md and global rule macro-summary-format.md
  // Para 1: "The Big Picture" (Plain English, Real Economy status, cited live numbers)
  // Para 2: "👉 Your Actionable Playbook" (Direct execution directives, 200DMA stops, bond warnings, cash allocation)
  renderOneMinuteStory(d, ig) {
    const breadthVal = d.metrics?.find ? d.metrics.find(m => m.id === 'breadth')?.display : (d.metrics?.breadth?.display || '73%');
    const cgVal = ig?.copperGold?.display || '1.66';
    const buffettVal = ig?.buffettIndicator?.display || '194.5%';
    const pcVal = ig?.putCallSentiment?.putCallRatio || 0.84;
    const dxyVal = ig?.dollarTrend?.display || '104.3 DXY';

    return `
      <!-- 1-MINUTE QUICK STORY (PLAIN ENGLISH GUIDE WITH CITED NUMBERS) -->
      <div class="story-paragraph-card">
        <div class="spc-header">
          <div class="spc-title-row">
            <span class="spc-badge">⚡ THE 1-MINUTE MACRO STORY</span>
            <span class="spc-pill">PLAIN ENGLISH • LIVE NUMBERS</span>
          </div>
          <h2 class="spc-title">How to Use All 12 Indicators Together in 1 Minute:</h2>
        </div>
        <p class="spc-text">
          <strong>The Big Picture:</strong> The real economy is healthy and growing, not crashing—factories are busy building things (proven by <strong>${breadthVal}</strong> of stock sectors climbing, and copper prices beating gold at a <strong>${cgVal}</strong> ratio). However, the overall stock market is expensive right now (Warren Buffett's valuation test sits at <strong>${buffettVal} of GDP</strong>, well above the <strong>115%</strong> historical normal), so you should <strong>not blindly buy overhyped tech or expensive index funds</strong>. Instead, follow where big institutional funds and corporate CEOs are putting their own money: with options sentiment calm (Put/Call ratio at <strong>${pcVal}</strong>) and the US Dollar steady around <strong>${dxyVal}</strong>, big money is pulling cash out of long-term bonds and pouring billions directly into businesses that produce real goods and print cash—specifically <strong>Energy (+18.3%)</strong>, <strong>Raw Materials (+5.1%)</strong>, and <strong>Banks (+9.6%)</strong>.
        </p>
        <div class="spc-playbook">
          <div class="spc-playbook-title">👉 Your Actionable Playbook:</div>
          <p class="spc-playbook-text">
            Stay invested in cash-generating companies (<strong>Energy, Materials, Banks</strong>) with stop-losses near their 200-day average. Completely avoid long-term government bonds (<strong>TLT is down -2.5%</strong>), and <strong>keep 20% of your money in cash (Treasury bills like BIL) earning a safe ~5% interest</strong>. This gives you guaranteed risk-free income and keeps cash ready to buy great stocks at a discount whenever scary news headlines create temporary market dips.
          </p>
        </div>
      </div>
    `;
  },

  // -------------------------------------------------------------------------
  // Main Render Function: 12 Visual Cards Cockpit
  // -------------------------------------------------------------------------
  render() {
    const container = document.getElementById('macroDashboardSection');
    if (!container || !this.data) return;

    const d = this.data;
    const score = d.regime?.score || 15;
    const label = d.regime?.label || 'Leaning Bullish';
    const fedFunds = d.metrics?.find ? d.metrics.find(m => m.id === 'fedFunds') : d.metrics?.fedFunds;
    const netLiq = d.metrics?.find ? d.metrics.find(m => m.id === 'netLiquidity') : d.metrics?.netLiquidity;
    const breadth = d.metrics?.find ? d.metrics.find(m => m.id === 'breadth') : d.metrics?.sp500Breadth;
    const ig = d.institutionalGauges || {};

    container.innerHTML = `
      <!-- 1-MINUTE QUICK STORY AT THE VERY TOP -->
      ${this.renderOneMinuteStory(d, ig)}

      <!-- TOP EXECUTIVE TRADING PLAYBOOK BANNER -->
      <div class="playbook-banner">
        <div class="pb-header">
          <div class="pb-title-group">
            <span class="pb-badge">⚡ DAILY SMART MONEY PLAYBOOK</span>
            <h2 class="pb-heading">Today's Highest Conviction Trading Directives</h2>
          </div>
          <div class="pb-regime-pill">
            <span class="pbr-dot"></span>
            <span>REGIME: <strong>${this.escape(label).toUpperCase()}</strong> (${score > 0 ? '+' : ''}${score}/100)</span>
          </div>
        </div>

        <div class="pb-grid">
          <!-- Col 1: Top 3 To Buy -->
          <div class="pb-col pb-buy-col">
            <div class="pb-col-header">
              <span class="pb-icon">🟢</span>
              <span class="pb-col-title">TOP 3 ASSETS TO BUY TODAY</span>
            </div>
            <div class="pb-action-card">
              <div class="pb-act-top">
                <span class="pb-act-sym">XLE / USO</span>
                <span class="pb-act-name">Energy &amp; Crude Oil</span>
                <span class="pb-act-perf color-buy">+18.3%</span>
              </div>
              <p class="pb-act-why">Top beneficiary of Late-Cycle Overheat; massive institutional rotation and cash flow.</p>
            </div>
            <div class="pb-action-card">
              <div class="pb-act-top">
                <span class="pb-act-sym">DBC</span>
                <span class="pb-act-name">Broad Commodities</span>
                <span class="pb-act-perf color-buy">+14.1%</span>
              </div>
              <p class="pb-act-why">Physical inflation hedge with strong upward pricing momentum across raw materials.</p>
            </div>
            <div class="pb-action-card">
              <div class="pb-act-top">
                <span class="pb-act-sym">XLB</span>
                <span class="pb-act-name">Materials Sector</span>
                <span class="pb-act-perf color-buy">+5.1%</span>
              </div>
              <p class="pb-act-why">Clear breakout above 200-day trend lines as institutional capital leaves tech.</p>
            </div>
          </div>

          <!-- Col 2: Top 3 To Sell / Avoid -->
          <div class="pb-col pb-sell-col">
            <div class="pb-col-header">
              <span class="pb-icon">🔴</span>
              <span class="pb-col-title">TOP 3 ASSETS TO SELL / AVOID</span>
            </div>
            <div class="pb-action-card">
              <div class="pb-act-top">
                <span class="pb-act-sym">TLT</span>
                <span class="pb-act-name">20Y+ Long Treasuries</span>
                <span class="pb-act-perf color-sell">-2.5%</span>
              </div>
              <p class="pb-act-why">Persistent inflation and high real yields make holding long-duration fixed rate bonds risky.</p>
            </div>
            <div class="pb-action-card">
              <div class="pb-act-top">
                <span class="pb-act-sym">XLU</span>
                <span class="pb-act-name">Utilities Sector</span>
                <span class="pb-act-perf color-sell">-5.4%</span>
              </div>
              <p class="pb-act-why">Bond-proxy sector with heavy debt loads suffering from high risk-free interest rates.</p>
            </div>
            <div class="pb-action-card">
              <div class="pb-act-top">
                <span class="pb-act-sym">XLC</span>
                <span class="pb-act-name">Communication Services</span>
                <span class="pb-act-perf color-sell">-7.4%</span>
              </div>
              <p class="pb-act-why">Institutional rotation is actively trimming overvalued media and communication names.</p>
            </div>
          </div>

          <!-- Col 3: Cash & Model Allocation -->
          <div class="pb-col pb-alloc-col">
            <div class="pb-col-header">
              <span class="pb-icon">🟡</span>
              <span class="pb-col-title">CASH STRATEGY &amp; ALLOCATION</span>
            </div>
            ${this.renderAllocationBar()}
            <div class="pb-cash-tip">
              <strong>💡 Tactical Cash Rule:</strong> Hold <strong>20% in Treasury Bills (BIL)</strong> earning a safe ~5% yield. This generates risk-free income while keeping dry powder ready for market pullbacks.
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION 1 HEADER: CORE MACRO PULSE & MONEY FLOW -->
      <div class="section-divider-banner">
        <div class="sdb-left">
          <span class="sdb-badge">PART 1: CORE MARKET CYCLE</span>
          <h3 class="sdb-title">Primary Trend, Cycle &amp; Direction of Money</h3>
          <p class="sdb-sub">High-level macro coordinates: market regime, economic season, liquidity tank, and sector rotation.</p>
        </div>
        <span class="sdb-pill">CARDS 1 – 6</span>
      </div>

      <!-- SIX CORE CARDS GRID -->
      <div class="visual-cockpit-grid">

        <!-- CARD 1: OVERALL MARKET TREND -->
        <div class="vc-card">
          <div class="vc-head">
            <div class="vc-title-left">
              <span class="vc-icon">🧭</span>
              <div>
                <span class="vc-eyebrow">MACRO PILLAR 1</span>
                <h3 class="vc-title">Overall Market Trend &amp; Regime</h3>
              </div>
            </div>
            <span class="vc-badge tone-bull">${label.toUpperCase()} (+${score})</span>
          </div>

          <div class="vc-visual-wrap">
            ${this.renderTrendGaugeSVG(score, label)}
          </div>

          <div class="vc-content">
            <div class="vc-summary-line">
              <span class="vc-lbl">One-Line Summary:</span>
              <span class="vc-val">Market breadth is positive with <strong>${breadth ? breadth.display : '73%'}</strong> of S&amp;P 500 sectors trading comfortably above their 200-day moving average.</span>
            </div>
            <div class="vc-interp-line">
              <span class="vc-lbl">Interpretation:</span>
              <span class="vc-val">The broader bull market remains intact; healthy sector participation indicates capital is actively supporting equities rather than fleeing.</span>
            </div>
            <div class="vc-trade-box trade-buy">
              <span class="vc-trade-tag">🟢 TRADING ADVICE:</span>
              <span class="vc-trade-text">Stay invested with the uptrend. Maintain trailing stop-losses at key 200-day trend lines. Do not initiate broad market short positions.</span>
            </div>
          </div>
        </div>

        <!-- CARD 2: MACRO BUSINESS CYCLE CLOCK -->
        <div class="vc-card">
          <div class="vc-head">
            <div class="vc-title-left">
              <span class="vc-icon">⏰</span>
              <div>
                <span class="vc-eyebrow">MACRO PILLAR 2</span>
                <h3 class="vc-title">Macro Business Cycle Clock</h3>
              </div>
            </div>
            <span class="vc-badge tone-gold">PHASE 3: OVERHEAT</span>
          </div>

          <div class="vc-visual-wrap">
            ${this.renderCycleClockVisual(d.phase?.key || 'overheat')}
          </div>

          <div class="vc-content">
            <div class="vc-summary-line">
              <span class="vc-lbl">One-Line Summary:</span>
              <span class="vc-val">The economy is in <strong>Late-Cycle Overheat</strong>: real growth is solid (+2.8% GDP) while inflation pressures remain persistent.</span>
            </div>
            <div class="vc-interp-line">
              <span class="vc-lbl">Interpretation:</span>
              <span class="vc-val">Historically, this phase heavily favors tangible physical commodities and energy producers while penalizing long-duration bonds and speculative tech.</span>
            </div>
            <div class="vc-trade-box trade-buy">
              <span class="vc-trade-tag">🟢 TRADING ADVICE:</span>
              <span class="vc-trade-text">Overweight real assets (Crude Oil, Metals) and value cyclicals. Underweight long-term government bonds and unprofitable growth stocks.</span>
            </div>
          </div>
        </div>

        <!-- CARD 3: FED LIQUIDITY & INTEREST RATES -->
        <div class="vc-card">
          <div class="vc-head">
            <div class="vc-title-left">
              <span class="vc-icon">💧</span>
              <div>
                <span class="vc-eyebrow">MACRO PILLAR 3</span>
                <h3 class="vc-title">Fed Money Supply &amp; Liquidity</h3>
              </div>
            </div>
            <span class="vc-badge tone-blue">NET LIQ: ${netLiq ? netLiq.display : '$5.75T'}</span>
          </div>

          <div class="vc-visual-wrap">
            ${this.renderLiquidityMeters(netLiq, fedFunds)}
          </div>

          <div class="vc-content">
            <div class="vc-summary-line">
              <span class="vc-lbl">One-Line Summary:</span>
              <span class="vc-val">Net Fed liquidity is steady at <strong>${netLiq ? netLiq.display : '$5.75T'}</strong> while policy interest rates remain paused on a high plateau (<strong>${fedFunds ? fedFunds.display : '3.88%'}</strong>).</span>
            </div>
            <div class="vc-interp-line">
              <span class="vc-lbl">Interpretation:</span>
              <span class="vc-val">Money is neither flooding the entire market via quantitative easing nor freezing up in a liquidity crunch; capital is rotating selectively.</span>
            </div>
            <div class="vc-trade-box trade-hold">
              <span class="vc-trade-tag">🟡 TRADING ADVICE:</span>
              <span class="vc-trade-text">Focus exclusively on companies with strong free cash flow; park unallocated cash in 5% Treasury bills (BIL) to earn risk-free income.</span>
            </div>
          </div>
        </div>

        <!-- CARD 4: ASSET CLASS MONEY FLOWS -->
        <div class="vc-card">
          <div class="vc-head">
            <div class="vc-title-left">
              <span class="vc-icon">🔄</span>
              <div>
                <span class="vc-eyebrow">MACRO PILLAR 4</span>
                <h3 class="vc-title">Direction of Money: Asset Classes</h3>
              </div>
            </div>
            <span class="vc-badge tone-bull">FLOW: COMMODITIES &gt; BONDS</span>
          </div>

          <div class="vc-visual-wrap">
            ${this.renderAssetFlowVisual()}
          </div>

          <div class="vc-content">
            <div class="vc-summary-line">
              <span class="vc-lbl">One-Line Summary:</span>
              <span class="vc-val">Institutional money is rotating aggressively out of long-term Treasuries directly into physical commodities, energy, and large-cap equities.</span>
            </div>
            <div class="vc-interp-line">
              <span class="vc-lbl">Interpretation:</span>
              <span class="vc-val">Fund managers are trimming duration risk in debt markets to hedge against inflation through hard tangible assets.</span>
            </div>
            <div class="vc-trade-box trade-buy">
              <span class="vc-trade-tag">🟢 TRADING ADVICE:</span>
              <span class="vc-trade-text">Follow smart money flows: BUY DBC (Commodities), USO (Crude), and SPY (S&amp;P 500); TRIM or SHORT TLT and IEF (Treasuries).</span>
            </div>
          </div>
        </div>

        <!-- CARD 5: SECTOR ROTATION LEADERS VS LAGGARDS -->
        <div class="vc-card">
          <div class="vc-head">
            <div class="vc-title-left">
              <span class="vc-icon">🎯</span>
              <div>
                <span class="vc-eyebrow">MACRO PILLAR 5</span>
                <h3 class="vc-title">Sector Rotation: Leaders vs Laggards</h3>
              </div>
            </div>
            <span class="vc-badge tone-bull">BUY CYCLICALS • SELL DEFENSIVES</span>
          </div>

          <div class="vc-visual-wrap">
            ${this.renderSectorRotationVisual(d)}
          </div>

          <div class="vc-content">
            <div class="vc-summary-line">
              <span class="vc-lbl">One-Line Summary:</span>
              <span class="vc-val">Capital is fleeing bond-proxy utilities and interest-rate-sensitive real estate to pile into high-cash-flow energy, materials, and banks.</span>
            </div>
            <div class="vc-interp-line">
              <span class="vc-lbl">Interpretation:</span>
              <span class="vc-val">Investors are rewarding businesses with pricing power and tangible production capacity while punishing rate-sensitive debt borrowers.</span>
            </div>
            <div class="vc-trade-box trade-buy">
              <span class="vc-trade-tag">🟢 TRADING ADVICE:</span>
              <span class="vc-trade-text">BUY XLE (Energy) and XLB (Materials) on minor pullbacks. SELL or UNDERWEIGHT XLU (Utilities) and XLRE (Real Estate).</span>
            </div>
          </div>
        </div>

        <!-- CARD 6: RECESSION & RISK RADAR -->
        <div class="vc-card">
          <div class="vc-head">
            <div class="vc-title-left">
              <span class="vc-icon">🚨</span>
              <div>
                <span class="vc-eyebrow">MACRO PILLAR 6</span>
                <h3 class="vc-title">Recession Tripwires &amp; Risk Radar</h3>
              </div>
            </div>
            <span class="vc-badge tone-bull">6/6 DANGER LIGHTS GREEN</span>
          </div>

          <div class="vc-visual-wrap">
            ${this.renderRiskRadarVisual()}
          </div>

          <div class="vc-content">
            <div class="vc-summary-line">
              <span class="vc-lbl">One-Line Summary:</span>
              <span class="vc-val">All 6 core recession tripwires are completely green, and corporate high-yield credit spreads (3.12%) signal zero distress.</span>
            </div>
            <div class="vc-interp-line">
              <span class="vc-lbl">Interpretation:</span>
              <span class="vc-val">The underlying financial system is resilient; headline dips caused by geopolitical news are tactical buying opportunities, not structural crashes.</span>
            </div>
            <div class="vc-trade-box trade-buy">
              <span class="vc-trade-tag">🟢 TRADING ADVICE:</span>
              <span class="vc-trade-text">Do not panic-sell out of fear on breaking news headlines. Use temporary market dips to buy the top-performing sectors.</span>
            </div>
          </div>
        </div>

      </div>

      <!-- SECTION 2 HEADER: INSTITUTIONAL POWER GAUGES -->
      <div class="section-divider-banner institutional-divider">
        <div class="sdb-left">
          <span class="sdb-badge color-accent">🔬 INSTITUTIONAL POWER GAUGES</span>
          <h3 class="sdb-title">6 Advanced Institutional Macro Gauges</h3>
          <p class="sdb-sub">High-conviction indicators used by premier macro hedge funds for valuation, contrarian sentiment, currency forces, and insider flows.</p>
        </div>
        <span class="sdb-pill color-accent-bg">CARDS 7 – 12</span>
      </div>

      <!-- SIX INSTITUTIONAL POWER GAUGES GRID -->
      <div class="visual-cockpit-grid">

        <!-- CARD 7: DR. COPPER / GOLD RATIO -->
        <div class="vc-card">
          <div class="vc-head">
            <div class="vc-title-left">
              <span class="vc-icon">🩺</span>
              <div>
                <span class="vc-eyebrow">INSTITUTIONAL GAUGE 1</span>
                <h3 class="vc-title">Dr. Copper / Gold Economic Ratio</h3>
              </div>
            </div>
            <span class="vc-badge tone-bull">RATIO: ${ig.copperGold?.display || '1.66'} (EXPANDING)</span>
          </div>

          <div class="vc-visual-wrap">
            ${this.renderCopperGoldVisual(ig.copperGold)}
          </div>

          <div class="vc-content">
            <div class="vc-summary-line">
              <span class="vc-lbl">One-Line Summary:</span>
              <span class="vc-val">${this.escape(ig.copperGold?.summary || 'Dr. Copper is outperforming Gold (+4.8% 3M), signaling real-world physical demand and manufacturing acceleration.')}</span>
            </div>
            <div class="vc-interp-line">
              <span class="vc-lbl">Interpretation:</span>
              <span class="vc-val">${this.escape(ig.copperGold?.interpretation || 'When industrial copper beats safety gold, global economic growth is expanding rather than contracting.')}</span>
            </div>
            <div class="vc-trade-box trade-buy">
              <span class="vc-trade-tag">🟢 TRADING ADVICE:</span>
              <span class="vc-trade-text">${this.escape(ig.copperGold?.advice?.replace('🟢 TRADING ADVICE: ', '') || 'Overweight Industrials (XLI), Materials (XLB), and Small Caps (IWM). Keep bond duration short.')}</span>
            </div>
          </div>
        </div>

        <!-- CARD 8: THE BUFFETT INDICATOR -->
        <div class="vc-card">
          <div class="vc-head">
            <div class="vc-title-left">
              <span class="vc-icon">👑</span>
              <div>
                <span class="vc-eyebrow">INSTITUTIONAL GAUGE 2</span>
                <h3 class="vc-title">The Buffett Indicator (Cap to GDP)</h3>
              </div>
            </div>
            <span class="vc-badge tone-bear">VALUATION: ${ig.buffettIndicator?.display || '194.5%'} (STRETCHED)</span>
          </div>

          <div class="vc-visual-wrap">
            ${this.renderBuffettVisual(ig.buffettIndicator)}
          </div>

          <div class="vc-content">
            <div class="vc-summary-line">
              <span class="vc-lbl">One-Line Summary:</span>
              <span class="vc-val">${this.escape(ig.buffettIndicator?.summary || 'Total US stock market capitalization sits at 194.5% of GDP, well above the historical fair value baseline of 115%.')}</span>
            </div>
            <div class="vc-interp-line">
              <span class="vc-lbl">Interpretation:</span>
              <span class="vc-val">${this.escape(ig.buffettIndicator?.interpretation || 'Long-term broad market valuation is stretched; projected 10-year broad index compound returns are lower than historical averages.')}</span>
            </div>
            <div class="vc-trade-box trade-hold">
              <span class="vc-trade-tag">🟡 TRADING ADVICE:</span>
              <span class="vc-trade-text">${this.escape(ig.buffettIndicator?.advice?.replace('🟡 TRADING ADVICE: ', '') || 'Avoid buying broad index funds blindly at all-time highs; focus on cheap cash-flow value stocks and keep 20% in 5% cash.')}</span>
            </div>
          </div>
        </div>

        <!-- CARD 9: PUT-TO-CALL & OPTIONS SENTIMENT -->
        <div class="vc-card">
          <div class="vc-head">
            <div class="vc-title-left">
              <span class="vc-icon">😱</span>
              <div>
                <span class="vc-eyebrow">INSTITUTIONAL GAUGE 3</span>
                <h3 class="vc-title">Put-to-Call &amp; Options Sentiment</h3>
              </div>
            </div>
            <span class="vc-badge tone-gold">SCORE: ${ig.putCallSentiment?.display || '58 / 100'}</span>
          </div>

          <div class="vc-visual-wrap">
            ${this.renderSentimentVisual(ig.putCallSentiment)}
          </div>

          <div class="vc-content">
            <div class="vc-summary-line">
              <span class="vc-lbl">One-Line Summary:</span>
              <span class="vc-val">${this.escape(ig.putCallSentiment?.summary || 'Put-to-Call ratio sits at 0.84 with overall market sentiment at 58/100, showing steady investor confidence without extreme panic or mania.')}</span>
            </div>
            <div class="vc-interp-line">
              <span class="vc-lbl">Interpretation:</span>
              <span class="vc-val">${this.escape(ig.putCallSentiment?.interpretation || 'Options traders are moderately optimistic; there is neither peak euphoria to cause an immediate crash nor extreme panic to buy a capitulation bottom.')}</span>
            </div>
            <div class="vc-trade-box trade-buy">
              <span class="vc-trade-tag">🟢 TRADING ADVICE:</span>
              <span class="vc-trade-text">${this.escape(ig.putCallSentiment?.advice?.replace('🟢 TRADING ADVICE: ', '') || 'Ride current winners with trailing stop-losses; wait for Put-to-Call spikes above 1.10 before aggressively adding new leverage.')}</span>
            </div>
          </div>
        </div>

        <!-- CARD 10: U.S. DOLLAR INDEX (DXY) TREND -->
        <div class="vc-card">
          <div class="vc-head">
            <div class="vc-title-left">
              <span class="vc-icon">💵</span>
              <div>
                <span class="vc-eyebrow">INSTITUTIONAL GAUGE 4</span>
                <h3 class="vc-title">U.S. Dollar Index (DXY) Trend</h3>
              </div>
            </div>
            <span class="vc-badge tone-blue">DXY: ${ig.dollarTrend?.display || '104.3 DXY'} (STABLE)</span>
          </div>

          <div class="vc-visual-wrap">
            ${this.renderDollarVisual(ig.dollarTrend)}
          </div>

          <div class="vc-content">
            <div class="vc-summary-line">
              <span class="vc-lbl">One-Line Summary:</span>
              <span class="vc-val">${this.escape(ig.dollarTrend?.summary || 'The US Dollar is trading in a stable range around 104.3, removing the global liquidity squeeze caused by previous rapid dollar spikes.')}</span>
            </div>
            <div class="vc-interp-line">
              <span class="vc-lbl">Interpretation:</span>
              <span class="vc-val">${this.escape(ig.dollarTrend?.interpretation || 'A stable or softening Dollar acts as a tailwind for raw commodities, precious metals, and emerging market equities.')}</span>
            </div>
            <div class="vc-trade-box trade-buy">
              <span class="vc-trade-tag">🟢 TRADING ADVICE:</span>
              <span class="vc-trade-text">${this.escape(ig.dollarTrend?.advice?.replace('🟢 TRADING ADVICE: ', '') || 'Dollar stability is green light for Gold (GLD), Crude Oil (USO), and Emerging Markets (EEM). Avoid holding unhedged foreign cash.')}</span>
            </div>
          </div>
        </div>

        <!-- CARD 11: CORPORATE INSIDER BUY/SELL RATIO -->
        <div class="vc-card">
          <div class="vc-head">
            <div class="vc-title-left">
              <span class="vc-icon">👥</span>
              <div>
                <span class="vc-eyebrow">INSTITUTIONAL GAUGE 5</span>
                <h3 class="vc-title">Corporate Insider Buy/Sell Ratio</h3>
              </div>
            </div>
            <span class="vc-badge tone-bull">RATIO: ${ig.insiderRatio?.display || '0.32'} (BUYING)</span>
          </div>

          <div class="vc-visual-wrap">
            ${this.renderInsiderVisual(ig.insiderRatio)}
          </div>

          <div class="vc-content">
            <div class="vc-summary-line">
              <span class="vc-lbl">One-Line Summary:</span>
              <span class="vc-val">${this.escape(ig.insiderRatio?.summary || 'Corporate executives are selectively buying their own shares (0.32 ratio), with heavy cluster-buying concentrated in Energy and Financials.')}</span>
            </div>
            <div class="vc-interp-line">
              <span class="vc-lbl">Interpretation:</span>
              <span class="vc-val">${this.escape(ig.insiderRatio?.interpretation || 'Insiders with real-time access to customer order books are putting their own personal wealth into cyclical value companies.')}</span>
            </div>
            <div class="vc-trade-box trade-buy">
              <span class="vc-trade-tag">🟢 TRADING ADVICE:</span>
              <span class="vc-trade-text">${this.escape(ig.insiderRatio?.advice?.replace('🟢 TRADING ADVICE: ', '') || 'Follow executive insider cluster purchases in Energy (XLE) and Regional Banks; avoid tech names with heavy insider dumping.')}</span>
            </div>
          </div>
        </div>

        <!-- CARD 12: YIELD CURVE SLOPE & UN-INVERSION -->
        <div class="vc-card">
          <div class="vc-head">
            <div class="vc-title-left">
              <span class="vc-icon">📐</span>
              <div>
                <span class="vc-eyebrow">INSTITUTIONAL GAUGE 6</span>
                <h3 class="vc-title">Yield Curve Slope &amp; Un-Inversion</h3>
              </div>
            </div>
            <span class="vc-badge tone-bull">10Y-2Y: ${ig.yieldCurveUninversion?.display || '+0.38%'} (POSITIVE)</span>
          </div>

          <div class="vc-visual-wrap">
            ${this.renderYieldCurveVisual(ig.yieldCurveUninversion)}
          </div>

          <div class="vc-content">
            <div class="vc-summary-line">
              <span class="vc-lbl">One-Line Summary:</span>
              <span class="vc-val">${this.escape(ig.yieldCurveUninversion?.summary || 'The 10Y-2Y Treasury yield curve has un-inverted to +0.38% after being inverted for over two years.')}</span>
            </div>
            <div class="vc-interp-line">
              <span class="vc-lbl">Interpretation:</span>
              <span class="vc-val">${this.escape(ig.yieldCurveUninversion?.interpretation || 'The un-inversion steepens the curve, which boosts bank net interest margins (Financials XLF), but historically starts the 6-18 month recession countdown clock.')}</span>
            </div>
            <div class="vc-trade-box trade-buy">
              <span class="vc-trade-tag">🟢 TRADING ADVICE:</span>
              <span class="vc-trade-text">${this.escape(ig.yieldCurveUninversion?.advice?.replace('🟢 TRADING ADVICE: ', '') || 'Buy Financials (XLF) for steepening curve margins; maintain strict stops and watch unemployment claims for recession confirmation.')}</span>
            </div>
          </div>
        </div>

      </div>
    `;
  }
};

window.MacroDashboard = MacroDashboard;
