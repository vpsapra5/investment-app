# ⚡ Specification: The 1-Minute Macro Story Format

> **Standard for the top executive narrative on the Investment App Home Dashboard.**

---

## 🎯 Purpose
To distill all **12 Macro, Cycle, Liquidity & Institutional Power Gauges** into a **single 60-second read** that any investor can understand in plain English while maintaining institutional rigor through **explicit numerical citations**.

---

## 📐 Structural Layout

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ⚡ THE 1-MINUTE MACRO STORY                                 PLAIN ENGLISH • LIVE NUMBERS │
│ How to Use All 12 Indicators Together in 1 Minute:                                     │
│                                                                                        │
│ The Big Picture: The real economy is healthy and growing, not crashing—factories       │
│ are busy building things (proven by [BREADTH]% of stock sectors climbing, and copper   │
│ prices beating gold at a [COPPER/GOLD] ratio). However, the overall stock market is   │
│ expensive right now (Warren Buffett's valuation test sits at [BUFFETT]% of GDP, well   │
│ above the 115% historical normal), so you should not blindly buy overhyped tech or    │
│ expensive index funds. Instead, follow where big institutional funds and corporate     │
│ CEOs are putting their own money: with options sentiment calm (Put/Call ratio at       │
│ [PUT/CALL]) and the US Dollar steady around [DXY] DXY, big money is pulling cash out   │
│ of long-term bonds and pouring billions directly into businesses that produce real     │
│ goods and print cash—specifically Energy (+18.3%), Raw Materials (+5.1%), and          │
│ Banks (+9.6%).                                                                         │
│                                                                                        │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ 👉 YOUR ACTIONABLE PLAYBOOK:                                                       │ │
│ │ Stay invested in cash-generating companies (Energy, Materials, Banks) with         │ │
│ │ stop-losses near their 200-day average. Completely avoid long-term government      │ │
│ │ bonds (TLT is down -2.5%), and keep 20% of your money in cash (Treasury bills like │ │
│ │ BIL) earning a safe ~5% interest. This gives you guaranteed risk-free income and   │ │
│ │ keeps cash ready to buy great stocks at a discount whenever scary news headlines   │ │
│ │ create temporary market dips.                                                      │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔢 Required Data Points (Dynamic Live Citations)

| Metric | Source Indicator | Meaning in Simple English | Fallback Baseline |
|---|---|---|---|
| **Sector Breadth** | Indicator 1 (Core Trend) | % of stock sectors trending upward | `73%` |
| **Copper/Gold Ratio** | Indicator 7 (Dr. Copper/Gold) | Factories working vs panic hoarding | `1.66` |
| **Buffett Indicator** | Indicator 8 (Market Cap to GDP) | Total US stock prices vs GDP | `194.5% of GDP` vs `115%` baseline |
| **Put/Call Ratio** | Indicator 9 (Derivatives Sentiment) | Fear/Greed in options market | `0.84` |
| **U.S. Dollar Index** | Indicator 10 (DXY Currency Tide) | Global liquidity pressure | `104.3 DXY` |
| **Winning Sectors** | Indicator 5 (Sector Rotation) | Leading cash-generative sectors | `Energy (+18.3%)`, `Materials (+5.1%)`, `Banks (+9.6%)` |
| **Long Bond Return** | Indicator 4 (Asset Class Flows) | Trailing loss in long Treasuries | `TLT is down -2.5%` |
| **Cash Target & Yield** | Indicator 3 (Fed Net Liquidity / Yield) | Risk-free dry powder reserve | `20% in cash (BIL) earning ~5%` |

---

## 🎨 Design & CSS Elements

- **Card Container**: `.story-paragraph-card`
- **Top Badge**: `.spc-badge` (`#38BDF8` background with dark text)
- **Top Pill**: `.spc-pill` (subtle border, uppercase typography)
- **Title**: `.spc-title` (`20px`, bold, white)
- **Paragraph 1**: `.spc-text` (`#CBD5E1` color, `1.72` line-height, bolded highlights)
- **Paragraph 2 Callout Box**: `.spc-playbook` (tinted blue `#38BDF8` background, `3px` left accent border)
- **Playbook Heading**: `.spc-playbook-title` (`#38BDF8`, uppercase display font)
- **Playbook Body**: `.spc-playbook-text` (`#E2E8F0`, clear directives)

