// public/js/charts.js
// Investment App — tiny dependency-free SVG chart helpers with hover tooltips.

const Charts = (() => {
  const registry = new Map();
  let seq = 0;

  const fmtValue = (v, unit, dec = 2) => {
    if (v == null || !Number.isFinite(v)) return '—';
    switch (unit) {
      case '%': return `${v.toFixed(dec)}%`;
      case '$T': return `$${v.toFixed(2)}T`;
      case '$B': return `$${v.toFixed(0)}B`;
      case '$': return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'K': return `${v.toFixed(0)}K`;
      case 'x': return v.toFixed(3);
      default: return v.toFixed(dec);
    }
  };

  const fmtDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00Z');
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  };

  function bounds(points, refLines) {
    let min = Infinity, max = -Infinity;
    points.forEach(([, v]) => { if (v < min) min = v; if (v > max) max = v; });
    (refLines || []).forEach((r) => {
      // Only include reference lines that are reasonably near the data range
      const span = max - min || Math.abs(max) || 1;
      if (r.value >= min - span * 0.6 && r.value <= max + span * 0.6) {
        if (r.value < min) min = r.value;
        if (r.value > max) max = r.value;
      }
    });
    if (min === max) { min -= 1; max += 1; }
    const pad = (max - min) * 0.08;
    return { min: min - pad, max: max + pad };
  }

  function pathFor(points, W, H, b) {
    const n = points.length;
    return points.map(([, v], i) => {
      const x = n === 1 ? W / 2 : (i / (n - 1)) * W;
      const y = H - ((v - b.min) / (b.max - b.min)) * H;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  // Full chart with axis labels, reference lines and hover tooltip.
  function line(points, opts = {}) {
    if (!points || points.length < 2) {
      return `<div class="chart chart-empty">${opts.emptyText || 'History builds one point per day.'}</div>`;
    }
    const id = `ch${++seq}`;
    const W = 600, H = opts.height || 140;
    const b = bounds(points, opts.refLines);
    const color = opts.color || '#38BDF8';
    const d = pathFor(points, W, H, b);
    const area = `${d} L${W},${H} L0,${H} Z`;
    const refs = (opts.refLines || []).filter((r) => r.value >= b.min && r.value <= b.max).map((r) => {
      const y = H - ((r.value - b.min) / (b.max - b.min)) * H;
      return `<line x1="0" x2="${W}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" class="chart-ref" vector-effect="non-scaling-stroke"/>`;
    }).join('');
    const refLabels = (opts.refLines || []).filter((r) => r.value >= b.min && r.value <= b.max).map((r) => {
      const top = (1 - (r.value - b.min) / (b.max - b.min)) * 100;
      return `<span class="chart-ref-label" style="top:${top.toFixed(1)}%">${r.label}</span>`;
    }).join('');

    registry.set(id, { points, unit: opts.unit, dec: opts.decimals != null ? opts.decimals : 2, b });

    return `
      <div class="chart" data-chart="${id}" style="--chart-h:${H}px">
        <div class="chart-plot">
          <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
            <defs><linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${color}" stop-opacity="0.28"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/>
            </linearGradient></defs>
            ${refs}
            <path d="${area}" fill="url(#g${id})" stroke="none"/>
            <path d="${d}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
          </svg>
          ${refLabels}
          <span class="chart-axis chart-max">${fmtValue(b.max, opts.unit, opts.decimals)}</span>
          <span class="chart-axis chart-min">${fmtValue(b.min, opts.unit, opts.decimals)}</span>
          <div class="chart-cursor"><span class="chart-dot"></span></div>
          <div class="chart-tip"></div>
        </div>
        <div class="chart-dates"><span>${fmtDate(points[0][0])}</span><span>${fmtDate(points[points.length - 1][0])}</span></div>
      </div>`;
  }

  // Tiny inline sparkline (no axes).
  function spark(points, opts = {}) {
    if (!points || points.length < 2) return '<span class="spark-empty">—</span>';
    const W = opts.width || 110, H = opts.height || 30;
    const b = bounds(points);
    const up = points[points.length - 1][1] >= points[0][1];
    const color = opts.color || (up ? '#10B981' : '#F43F5E');
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="none" aria-hidden="true">
      <path d="${pathFor(points, W, H, b)}" fill="none" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
  }

  function bind(root) {
    root.querySelectorAll('.chart[data-chart]').forEach((el) => {
      const meta = registry.get(el.dataset.chart);
      if (!meta || el.dataset.bound) return;
      el.dataset.bound = '1';
      const plot = el.querySelector('.chart-plot');
      const cursor = el.querySelector('.chart-cursor');
      const dot = el.querySelector('.chart-dot');
      const tip = el.querySelector('.chart-tip');
      const { points, b } = meta;
      plot.addEventListener('mousemove', (e) => {
        const r = plot.getBoundingClientRect();
        const frac = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
        const i = Math.round(frac * (points.length - 1));
        const [d, v] = points[i];
        const x = (i / (points.length - 1)) * 100;
        const y = (1 - (v - b.min) / (b.max - b.min)) * 100;
        cursor.style.display = 'block';
        cursor.style.left = `${x}%`;
        dot.style.top = `${y}%`;
        tip.style.display = 'block';
        tip.innerHTML = `<strong>${fmtValue(v, meta.unit, meta.dec)}</strong><span>${new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</span>`;
        tip.style.left = x > 70 ? 'auto' : `calc(${x}% + 10px)`;
        tip.style.right = x > 70 ? `calc(${100 - x}% + 10px)` : 'auto';
      });
      plot.addEventListener('mouseleave', () => { cursor.style.display = 'none'; tip.style.display = 'none'; });
    });
  }

  function reset() { registry.clear(); }

  return { line, spark, bind, reset, fmtValue };
})();

window.Charts = Charts;

