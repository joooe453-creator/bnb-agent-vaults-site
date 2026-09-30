/* BNB Agent Vaults — shared data, shell and chart helpers (design prototype). */
(function () {
  "use strict";

  const TODAY = Date.UTC(2026, 8, 30);
  const DAY = 864e5;
  const SLOTS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)"];

  /* ------------------------------------------------------------------ */
  /* Registry                                                            */
  /* ------------------------------------------------------------------ */
  const ASSETS = {
    USDT: { address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18 },
    USDC: { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18 },
    WBNB: { address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", decimals: 18 },
    BTCB: { address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", decimals: 18 },
    ETH: { address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", decimals: 18 },
    slisBNB: { address: "0xB0b84D294e0C75A6abe60171b70edEb2EFd14A1B", decimals: 18 },
    CAKE: { address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", decimals: 18 },
  };

  const VENUES = [
    {
      id: "pancakeswap", name: "PancakeSwap", logo: "pancakeswap", kind: "DEX · Liquidity · Farms",
      status: "Registry & interface ready — adapter in development", ready: false,
      tracking: "Onchain — router, pool, token0/token1, fee tier, position NFT, farm PID",
      ops: ["Exact-input swap", "Exact-output swap", "V2 / StableSwap LP add", "V2 / StableSwap LP remove", "V3 / Infinity concentrated LP mint", "V3 / Infinity increase liquidity", "V3 / Infinity decrease liquidity", "Collect LP fees", "Farm stake / unstake / harvest", "CAKE stake / unstake / claim"],
    },
    {
      id: "lista", name: "Lista DAO", logo: "lista", kind: "Lending · CDP · Liquid staking",
      status: "ERC-4626 supply adapter — prototype complete", ready: true,
      tracking: "Onchain — market.asset(), collateral and debt positions",
      ops: ["Lending supply / withdraw", "Collateral deposit / withdraw", "Borrow / repay", "Leverage loop / deleverage", "lisUSD CDP deposit / borrow / repay / withdraw", "Liquid stake BNB", "Request / claim unstake"],
    },
    {
      id: "venus", name: "Venus", logo: "venus", kind: "Money market",
      status: "Supply / redeem adapter — prototype complete", ready: true,
      tracking: "Onchain — vToken.underlying(), balances, account liquidity",
      ops: ["Enter / exit collateral market", "Supply / redeem", "Borrow / repay", "Repay on behalf", "Liquidation", "Claim rewards", "Flux lend / withdraw", "XVS stake / unstake / claim"],
    },
    {
      id: "aster", name: "Aster", logo: "aster", kind: "Spot · Perpetuals · Earn (hybrid venue)",
      status: "Registry & interface ready — execution and reconciliation layer in development", ready: false,
      tracking: "Hybrid — onchain deposits/withdrawals reconciled with authenticated REST + user-data WebSocket ledger",
      ops: ["Spot market / limit / cancel", "Perpetual long / short / reduce", "TP-SL / cancel", "Isolated margin adjustment", "Leverage / margin mode", "Grid strategy", "Spot / perp transfers", "Earn deposit / withdraw", "Stake / unstake"],
    },
  ];

  const AGENT_STACK = [
    ["BNB Agent Studio", "Agent runtime, ERC-8004 identity, session authority"],
    ["BNB Chain MCP", "BSC state, transaction simulation, policy-approved submission"],
    ["Binance Agentic Wallet", "Optional MPC / session signer — never holds vault custody"],
    ["Official protocol Skills", "Market discovery and action construction"],
    ["Vault policy + Adapter", "Final authority over capital and execution boundaries"],
  ];

  /* ------------------------------------------------------------------ */
  /* Vaults (simulated)                                                  */
  /* ------------------------------------------------------------------ */
  const VAULTS = [
    {
      slug: "delta-neutral-bnb", name: "Delta Neutral BNB", manager: "Hedgeframe", agentId: 1187, symbol: "avDNB", asset: "USDT",
      strategy: "Market-neutral BNB carry with automated hedge rebalancing across approved venues.",
      runtimeDays: 184, returns: { "7D": 0.92, "30D": 3.84, "90D": 10.26, ALL: 18.4 }, maxDrawdown: { "7D": -0.48, "30D": -1.36, "90D": -3.82, ALL: -5.14 },
      tvl: 3420000, followers: 1248, risk: "Guarded", status: "Live", dataQuality: 99.8, lastSettled: "2h ago", settledEpochs: 184, sharePrice: 1.184,
      fees: { mgmt: 1.5, perf: 15, hurdle: 0, cryst: "Quarterly" }, lockup: "None", notice: "24 hours", minSub: 100, maxTvl: 10000000, benchmark: "BNB funding carry",
      cycle: { id: 14, state: "Live", day: 6, duration: 14, maxCapital: 3200000, against: 1.1 },
      allocation: [["Lista lending", 42], ["Perp hedge", 34], ["Cash buffer", 24]],
      legs: [
        { p: "Lista DAO", op: "Collateral deposit / borrow", loc: "slisBNB / USDT market", min: 30, tgt: 42, max: 50, lim: "Borrow LTV ≤ 60%", slip: 0.3, pos: "Debt position · HF 1.82" },
        { p: "Aster", op: "Perpetual short", loc: "BNBUSDT perp · subaccount #3", min: 25, tgt: 34, max: 40, lim: "Leverage ≤ 2.0×", slip: 0.2, pos: "Short 5,480 BNB · reconciled" },
        { p: "Venus", op: "Supply / redeem", loc: "vUSDT", min: 10, tgt: 24, max: 40, lim: "—", slip: 0.1, pos: "Accruing" },
      ],
    },
    {
      slug: "stable-yield-router", name: "Stable Yield Router", manager: "Orbit Agent", agentId: 942, symbol: "avSYR", asset: "USDT",
      strategy: "Routes USDT and USDC between audited BNB Chain lending pools as rates change.",
      runtimeDays: 128, returns: { "7D": 0.24, "30D": 1.02, "90D": 3.31, ALL: 4.76 }, maxDrawdown: { "7D": -0.03, "30D": -0.12, "90D": -0.38, ALL: -0.62 },
      tvl: 2860000, followers: 984, risk: "Guarded", status: "Live", dataQuality: 100, lastSettled: "42m ago", settledEpochs: 128, sharePrice: 1.0476,
      fees: { mgmt: 0.5, perf: 10, hurdle: 3, cryst: "Quarterly" }, lockup: "None", notice: "None", minSub: 50, maxTvl: 25000000, benchmark: "Venus USDT supply rate",
      cycle: { id: 9, state: "Veto window", closesIn: "31h", maxCapital: 2430000, against: 1.8 },
      allocation: [["USDT market", 48], ["USDC market", 37], ["Cash buffer", 15]],
      legs: [
        { p: "Venus", op: "Supply / redeem", loc: "vUSDT", min: 30, tgt: 48, max: 70, lim: "—", slip: 0.05, pos: "Accruing" },
        { p: "Lista DAO", op: "Lending supply / withdraw", loc: "USDC lending vault", min: 20, tgt: 37, max: 60, lim: "—", slip: 0.05, pos: "Accruing" },
        { p: "PancakeSwap", op: "Exact-input swap", loc: "USDT / USDC StableSwap", min: 0, tgt: 0, max: 60, lim: "Routing only", slip: 0.1, pos: "Policy bound" },
      ],
    },
    {
      slug: "bnb-bluechip-momentum", name: "Bluechip Momentum", manager: "Sable Quant", agentId: 1306, symbol: "avBCM", asset: "USDT",
      strategy: "Trend-following exposure across BNB, BTCB and ETH with volatility-aware position sizing.",
      runtimeDays: 73, returns: { "7D": 2.16, "30D": 6.42, "90D": null, ALL: 13.88 }, maxDrawdown: { "7D": -1.92, "30D": -4.74, "90D": null, ALL: -8.16 },
      tvl: 2170000, followers: 803, risk: "Balanced", status: "Live", dataQuality: 98.9, lastSettled: "3h ago", settledEpochs: 72, sharePrice: 1.1388,
      fees: { mgmt: 2, perf: 20, hurdle: 0, cryst: "Monthly" }, lockup: "7 days", notice: "24 hours", minSub: 250, maxTvl: 8000000, benchmark: "33/33/33 BNB · BTCB · ETH",
      cycle: { id: 22, state: "Live", day: 4, duration: 7, maxCapital: 2100000, against: 0.4 },
      allocation: [["BNB", 46], ["BTCB", 31], ["ETH", 23]],
      legs: [
        { p: "PancakeSwap", op: "Exact-input swap", loc: "WBNB / USDT · V3 0.05%", min: 0, tgt: 46, max: 60, lim: "—", slip: 0.5, pos: "Spot WBNB · policy bound" },
        { p: "PancakeSwap", op: "Exact-input swap", loc: "BTCB / USDT · V3 0.05%", min: 0, tgt: 31, max: 45, lim: "—", slip: 0.5, pos: "Spot BTCB · policy bound" },
        { p: "PancakeSwap", op: "Exact-input swap", loc: "ETH / USDT · V3 0.05%", min: 0, tgt: 23, max: 40, lim: "—", slip: 0.5, pos: "Spot ETH · policy bound" },
      ],
    },
    {
      slug: "liquid-staking-loop", name: "Liquid Staking Loop", manager: "Kepler AI", agentId: 1422, symbol: "avLSL", asset: "WBNB",
      strategy: "Conservative slisBNB leverage loop with health-factor guardrails and automated unwind.",
      runtimeDays: 41, returns: { "7D": 0.37, "30D": 1.86, "90D": null, ALL: 2.42 }, maxDrawdown: { "7D": -0.24, "30D": -1.08, "90D": null, ALL: -1.34 },
      tvl: 1940000, followers: 677, risk: "Balanced", status: "Live", dataQuality: 99.4, lastSettled: "1h ago", settledEpochs: 41, sharePrice: 1.0242,
      fees: { mgmt: 1, perf: 15, hurdle: 0, cryst: "Quarterly" }, lockup: "None", notice: "48 hours", minSub: 0.5, maxTvl: 6000000, benchmark: "slisBNB staking yield",
      cycle: { id: 5, state: "Live", day: 9, duration: 30, maxCapital: 2900, against: 0.2 },
      allocation: [["slisBNB", 69], ["Borrowed BNB", 21], ["Buffer", 10]],
      legs: [
        { p: "Lista DAO", op: "Liquid stake BNB", loc: "slisBNB staking manager", min: 60, tgt: 69, max: 80, lim: "—", slip: 0.2, pos: "Accruing" },
        { p: "Lista DAO", op: "Leverage loop / deleverage", loc: "slisBNB / WBNB market", min: 0, tgt: 21, max: 30, lim: "Borrow LTV ≤ 55%", slip: 0.3, pos: "HF 1.91" },
      ],
    },
    {
      slug: "pancake-lp-allocator", name: "Pancake LP Allocator", manager: "Gamma Scout", agentId: 1580, symbol: "avPLA", asset: "USDT",
      strategy: "Adaptive concentrated liquidity across high-volume PancakeSwap pools with fee harvesting.",
      runtimeDays: 18, returns: { "7D": 1.28, "30D": null, "90D": null, ALL: 2.91 }, maxDrawdown: { "7D": -2.18, "30D": null, "90D": null, ALL: -3.76 },
      tvl: 1530000, followers: 351, risk: "Aggressive", status: "Live", dataQuality: 97.6, lastSettled: "6h ago", settledEpochs: 18, sharePrice: 1.0291,
      fees: { mgmt: 2, perf: 20, hurdle: 0, cryst: "Monthly" }, lockup: "None", notice: "24 hours", minSub: 100, maxTvl: 4000000, benchmark: "50/50 WBNB · USDT hold",
      cycle: { id: 3, state: "Execution delay", closesIn: "9h", maxCapital: 1220000, against: 2.6 },
      allocation: [["BNB/USDT", 51], ["CAKE/BNB", 29], ["Idle", 20]],
      legs: [
        { p: "PancakeSwap", op: "V3 / Infinity concentrated LP mint", loc: "WBNB / USDT · 0.05% · NFT #78421", min: 30, tgt: 51, max: 60, lim: "Range ±6%", slip: 0.5, pos: "In range" },
        { p: "PancakeSwap", op: "V3 / Infinity concentrated LP mint", loc: "CAKE / WBNB · 0.25% · NFT #78455", min: 10, tgt: 29, max: 35, lim: "Range ±12%", slip: 0.8, pos: "In range" },
      ],
    },
    {
      slug: "venus-carry-agent", name: "Venus Carry Agent", manager: "Northstar", agentId: 1611, symbol: "avVCA", asset: "USDT",
      strategy: "Autonomous supply and borrow loops on Venus with strict caps and timelocked policy updates.",
      runtimeDays: 11, returns: { "7D": -0.31, "30D": null, "90D": null, ALL: 0.64 }, maxDrawdown: { "7D": -0.84, "30D": null, "90D": null, ALL: -0.84 },
      tvl: 920000, followers: 143, risk: "Guarded", status: "Paused", dataQuality: 94.2, lastSettled: "19h ago", settledEpochs: 10, sharePrice: 1.0064,
      fees: { mgmt: 1, perf: 10, hurdle: 0, cryst: "Quarterly" }, lockup: "None", notice: "24 hours", minSub: 100, maxTvl: 3000000, benchmark: "Venus USDT supply rate",
      cycle: { id: 2, state: "Paused", maxCapital: 850000, against: 0 },
      allocation: [["Supply", 74], ["Borrow", 18], ["Cash", 8]],
      legs: [
        { p: "Venus", op: "Supply / redeem", loc: "vUSDT", min: 60, tgt: 74, max: 90, lim: "—", slip: 0.05, pos: "Accruing" },
        { p: "Venus", op: "Borrow / repay", loc: "vUSDC", min: 0, tgt: 18, max: 25, lim: "Borrow LTV ≤ 50%", slip: 0.1, pos: "HF 2.04" },
      ],
    },
  ];

  /* ------------------------------------------------------------------ */
  /* Utilities                                                           */
  /* ------------------------------------------------------------------ */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const fmt = {
    usd(n, d = 2) {
      if (n >= 1e9) return "$" + (n / 1e9).toFixed(d) + "B";
      if (n >= 1e6) return "$" + (n / 1e6).toFixed(d) + "M";
      if (n >= 1e3) return "$" + (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + "K";
      return "$" + n.toFixed(0);
    },
    n(n, d = 0) { return Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); },
    pct(n, d = 2, sign = true) { if (n == null || !isFinite(n)) return "—"; return (sign && n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toFixed(d) + "%"; },
    cls(n) { return n == null ? "muted" : n > 0 ? "pos" : n < 0 ? "neg" : ""; },
    date(t) { return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }); },
    dateShort(t) { return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }); },
  };

  function periodDays(v, p) { return p === "7D" ? 7 : p === "30D" ? 30 : p === "90D" ? 90 : v.runtimeDays; }
  function perf(v, p, mode) {
    const r = v.returns[p];
    if (r == null) return null;
    if (mode !== "annualized") return r;
    if (v.runtimeDays < 30) return null;
    return (Math.pow(1 + r / 100, 365 / periodDays(v, p)) - 1) * 100;
  }
  function historyTag(v) {
    if (v.runtimeDays < 30) return "New · <30D";
    if (v.runtimeDays < 90) return "Early · <90D";
    return null;
  }
  function riskMeter(r) {
    const lvl = r === "Guarded" ? 1 : r === "Balanced" ? 2 : 3;
    return `<span class="risk"><i>${[1, 2, 3].map((i) => `<b class="${i <= lvl ? "on" : ""}"></b>`).join("")}</i>${r}</span>`;
  }
  function statusTag(v) {
    return v.status === "Paused"
      ? `<span class="tag paused"><span class="dot"></span>Paused</span>`
      : `<span class="tag"><span class="dot"></span>Live</span>`;
  }

  // Deterministic PRNG so every render of a vault looks identical
  function rng(seed) {
    let h = 2166136261;
    for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return function () {
      h += 0x6d2b79f5;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function hexAddr(seed) { const r = rng(seed); let s = "0x"; for (let i = 0; i < 40; i++) s += "0123456789abcdef"[Math.floor(r() * 16)]; return s; }
  const short = (a) => a.slice(0, 6) + "…" + a.slice(-4);

  // Settled NAV/share series, anchored so period returns match the published figures.
  const seriesCache = {};
  function navSeries(v) {
    if (seriesCache[v.slug]) return seriesCache[v.slug];
    const N = v.runtimeDays, r = rng(v.slug), end = v.sharePrice;
    const anchors = [[0, 1], [N, end]];
    [["90D", 90], ["30D", 30], ["7D", 7]].forEach(([k, d]) => {
      if (v.returns[k] != null && N - d > 0) anchors.push([N - d, end / (1 + v.returns[k] / 100)]);
    });
    anchors.sort((a, b) => a[0] - b[0]);
    const vol = (Math.abs(v.maxDrawdown.ALL || 1) / 100) * 0.16;
    const out = new Array(N + 1);
    for (let a = 0; a < anchors.length - 1; a++) {
      const [d0, p0] = anchors[a], [d1, p1] = anchors[a + 1], n = d1 - d0;
      if (n <= 0) continue;
      const w = [0];
      for (let i = 1; i <= n; i++) w.push(w[i - 1] + gauss(r) * vol);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        out[d0 + i] = Math.exp(Math.log(p0) + (Math.log(p1) - Math.log(p0)) * t + (w[i] - t * w[n]));
      }
    }
    return (seriesCache[v.slug] = out.map((p, i) => ({ t: TODAY - (N - i) * DAY, v: p })));
  }

  /* ------------------------------------------------------------------ */
  /* Graphics                                                            */
  /* ------------------------------------------------------------------ */
  const SEAL = `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18.6" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M20 8.5 31.5 20 20 31.5 8.5 20Z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M20 14.2 25.8 20 20 25.8 14.2 20Z" fill="#F0B90B"/></svg>`;

  function logo(key, cls = "") {
    const v = VENUES.find((x) => x.id === key || x.name === key);
    const file = v ? v.logo : key === "bnb" ? "bnbchain" : null;
    if (!file) return "";
    return `<img class="logo ${cls}" src="assets/logos/${file}.jpg" alt="${esc(v ? v.name : "BNB Chain")}">`;
  }

  // Agent portfolio-manager bust, in 240 × 290 units. Rendered live as a scan-line figure.
  const AGENT = {
    head: "M80 110C80 72 98 57 120 57C142 57 160 72 160 110C160 138 150 158 120 165C90 158 80 138 80 110Z",
    shade: "M134 58C158 70 166 106 159 132C151 152 138 162 121 165C141 150 150 128 148 104C146 84 141 68 134 58Z",
    visor: "M82 98C100 92 140 92 158 98L157 116C140 121 100 121 83 116Z",
    chin: "M84 116C100 122 140 122 156 116L152 134C140 139 100 139 88 134Z",
    neck: "M104 148H136V190H104Z",
    jacket: "M-40 300L-40 236C0 210 58 192 98 181L120 240L142 181C182 192 240 210 280 236L280 300Z",
    shirt: "M98 181C108 176 132 176 142 181L120 240Z",
    tie: "M115 186H125L127 197L122 238H118L113 197Z",
    lapL: "M98 181L120 240L108 248L79 202L88 190Z",
    lapR: "M142 181L120 240L132 248L161 202L152 190Z",
  };
  const EYES = [[98, 106], [126, 106]]; // top-left of each 16 × 3.2 eye slit

  // Brightness map of the bust: filled tones, lit edges, then blurred and sampled.
  function agentToneMap() {
    const S = 3, X0 = -40, Y0 = 30, W = 320, H = 270;
    const c = document.createElement("canvas");
    c.width = W * S; c.height = H * S;
    const g = c.getContext("2d");
    g.scale(S, S); g.translate(-X0, -Y0);
    const gray = (v) => { const n = Math.round(v * 255); return `rgb(${n},${n},${n})`; };
    const fill = (d, v) => { g.fillStyle = typeof v === "number" ? gray(v) : v; g.fill(new Path2D(d)); };
    g.fillStyle = "#000"; g.fillRect(X0, Y0, W, H);
    let rg = g.createRadialGradient(120, 112, 20, 120, 112, 125);
    rg.addColorStop(0, gray(0.16)); rg.addColorStop(1, gray(0));
    g.fillStyle = rg; g.fillRect(X0, Y0, W, H);
    fill(AGENT.neck, 0.4);
    const lg = g.createLinearGradient(-40, 0, 280, 0);
    lg.addColorStop(0, gray(0.52)); lg.addColorStop(1, gray(0.18));
    fill(AGENT.jacket, lg);
    fill(AGENT.shirt, 0.92);
    fill(AGENT.tie, 0.2);
    fill(AGENT.lapL, 0.7); fill(AGENT.lapR, 0.38);
    g.fillStyle = gray(0.62); g.beginPath(); g.arc(78, 112, 8, 0, 7); g.fill();
    g.fillStyle = gray(0.34); g.beginPath(); g.arc(162, 112, 8, 0, 7); g.fill();
    rg = g.createRadialGradient(102, 80, 4, 114, 104, 72);
    rg.addColorStop(0, gray(1)); rg.addColorStop(1, gray(0.4));
    fill(AGENT.head, rg);
    fill(AGENT.shade, 0.2);
    fill(AGENT.chin, "rgba(0,0,0,.35)");
    fill(AGENT.visor, 0.05);
    g.lineWidth = 1.2; g.strokeStyle = gray(0.9);
    [AGENT.head, AGENT.visor, AGENT.lapL, AGENT.lapR, AGENT.shirt].forEach((d) => g.stroke(new Path2D(d)));
    const c2 = document.createElement("canvas");
    c2.width = c.width; c2.height = c.height;
    const g2 = c2.getContext("2d");
    g2.filter = "blur(2px)";
    g2.drawImage(c, 0, 0);
    const data = g2.getImageData(0, 0, c2.width, c2.height).data, cw = c2.width, ch = c2.height;
    return {
      X0, Y0, W, H,
      at(u, v) {
        const px = ((u - X0) * S) | 0, py = ((v - Y0) * S) | 0;
        return px < 0 || py < 0 || px >= cw || py >= ch ? 0 : data[(py * cw + px) * 4] / 255;
      },
    };
  }

  // Live hero figure: brightness becomes line weight and relief; a gold scan sweeps the agent.
  function agentCanvas(cv) {
    const ctx = cv.getContext("2d");
    const map = agentToneMap();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const GAP = 5, STEP = 4;
    const BUCKETS = [[0.6, 0.16], [1, 0.36], [1.5, 0.6], [2.1, 0.9]];
    let W = 0, H = 0, dpr = 1, R, running = false, mx = 0, my = 0, tx = 0, ty = 0;

    const layout = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      const mobile = W < 960;
      const ph = mobile ? H * 0.6 : H * 0.95;
      const scale = ph / map.H, pw = map.W * scale;
      const cx = mobile ? W * 0.5 : W * 0.64;
      R = { x: cx - pw / 2, y: mobile ? H * 0.04 : H - ph, w: pw, h: ph, scale, alpha: mobile ? 0.5 : 1 };
    };

    const draw = (ms) => {
      const t = ms / 1000;
      tx += (mx - tx) * 0.05; ty += (my - ty) * 0.05;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const ox = R.x + tx * 16, oy = R.y + ty * 8, s = R.scale;
      const paths = BUCKETS.map(() => new Path2D()), gold = new Path2D();
      const scan = ((t * 0.085) % 1.35) - 0.18;
      for (let y = 0; y <= R.h; y += GAP) {
        const v = map.Y0 + y / s, vn = y / R.h;
        const hot = Math.exp(-((vn - scan) ** 2) / 0.0011) > 0.3;
        let pb = -1, px0 = 0, py0 = 0;
        for (let x = 0; x <= R.w; x += STEP) {
          const b = map.at(map.X0 + x / s, v);
          const px = ox + x;
          const py = oy + y - b * 3 * s + Math.sin(t * 1.3 + x * 0.02 + y * 0.05) * 1.2 * b;
          if (pb >= 0) {
            const bb = (b + pb) / 2;
            if (bb > 0.035) {
              const p = hot && bb > 0.12 ? gold : paths[bb < 0.18 ? 0 : bb < 0.4 ? 1 : bb < 0.7 ? 2 : 3];
              p.moveTo(px0, py0); p.lineTo(px, py);
            }
          }
          pb = b; px0 = px; py0 = py;
        }
      }
      ctx.lineCap = "round";
      BUCKETS.forEach(([w, a], i) => {
        ctx.lineWidth = w;
        ctx.strokeStyle = `rgba(242,240,235,${a * R.alpha})`;
        ctx.stroke(paths[i]);
      });
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = `rgba(240,185,11,${0.95 * R.alpha})`;
      ctx.shadowColor = "rgba(240,185,11,.8)"; ctx.shadowBlur = 10;
      ctx.stroke(gold);
      // Eyes: a soft gold glow that blinks every few seconds.
      const blink = t % 5.2 < 0.13 ? 0.15 : 1;
      ctx.fillStyle = "#FFD466"; ctx.shadowBlur = 22;
      EYES.forEach(([ex, ey]) => {
        const h = 3.2 * s * blink, w = 16 * s;
        const X = ox + (ex - map.X0) * s, Y = oy + (ey - map.Y0) * s - 0.1 * 3 * s + (3.2 * s - h) / 2;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(X, Y, w, h, h / 2) : ctx.rect(X, Y, w, h); ctx.fill();
      });
      ctx.shadowBlur = 0;
    };

    const loop = (ms) => { if (!running) return; draw(ms); requestAnimationFrame(loop); };
    const start = () => { if (running || reduce) return; running = true; requestAnimationFrame(loop); };
    layout();
    draw(1200);
    new ResizeObserver(() => { layout(); if (!running) draw(1200); }).observe(cv);
    new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) start(); else running = false; })).observe(cv);
    window.addEventListener("pointermove", (e) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; }, { passive: true });
  }

  function sparkline(pts, w = 120, h = 34) {
    const ys = pts.map((p) => p.v), lo = Math.min(...ys), hi = Math.max(...ys), span = hi - lo || 1;
    const d = pts.map((p, i) => (i ? "L" : "M") + ((i / (pts.length - 1)) * (w - 2) + 1).toFixed(1) + " " + (h - 3 - ((p.v - lo) / span) * (h - 6)).toFixed(1)).join("");
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="var(--ink-2)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
  }

  function niceTicks(lo, hi, n) {
    const span = hi - lo, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n) || 10 * mag;
    const out = [];
    for (let v = Math.floor(lo / step) * step; v <= hi + step * 0.001; v += step) out.push(+v.toFixed(10));
    return { ticks: out, step };
  }

  // NAV line chart with right-hand axis, last-value tag, crosshair + tooltip.
  function lineChart(el, pts, opts = {}) {
    const H = opts.height || 300;
    const draw = () => {
      const W = Math.max(el.clientWidth, 280);
      const m = { t: 18, r: 70, b: 30, l: opts.left ?? 24 };
      const ys = pts.map((p) => p.v);
      let lo = Math.min(...ys), hi = Math.max(...ys);
      const pad = (hi - lo) * 0.15 || hi * 0.004;
      lo -= pad; hi += pad;
      const { ticks, step } = niceTicks(lo, hi, 5);
      const dec = Math.max(2, Math.min(4, -Math.floor(Math.log10(step)) + 1));
      const x = (i) => m.l + ((W - m.l - m.r) * i) / (pts.length - 1);
      const y = (v) => m.t + (H - m.t - m.b) * (1 - (v - lo) / (hi - lo));
      let g = "";
      ticks.filter((t) => t >= lo && t <= hi).forEach((t) => {
        g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line-2)" stroke-width="1"/>`;
        g += `<text x="${W - m.r + 10}" y="${y(t) + 4}">${t.toFixed(dec)}</text>`;
      });
      const nx = Math.min(5, pts.length);
      for (let k = 0; k < nx; k++) {
        const i = Math.round((k * (pts.length - 1)) / (nx - 1));
        g += `<text x="${x(i)}" y="${H - 8}" text-anchor="${k === 0 ? "start" : k === nx - 1 ? "end" : "middle"}">${fmt.dateShort(pts[i].t)}</text>`;
      }
      const line = pts.map((p, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(p.v).toFixed(1)).join("");
      const area = line + `L${x(pts.length - 1)} ${H - m.b}L${x(0)} ${H - m.b}Z`;
      const last = pts[pts.length - 1];
      const ly = y(last.v);
      el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || "Chart")}">
        <line x1="${m.l}" x2="${W - m.r}" y1="${H - m.b}" y2="${H - m.b}" stroke="var(--line)" stroke-width="1"/>
        ${g}
        <defs><linearGradient id="navfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#F0B90B" stop-opacity=".16"/><stop offset="1" stop-color="#F0B90B" stop-opacity="0"/></linearGradient></defs>
        <path d="${area}" fill="url(#navfill)"/>
        <path d="${line}" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        <circle cx="${x(pts.length - 1)}" cy="${ly}" r="4" fill="var(--gold)" stroke="var(--card)" stroke-width="2"/>
        <rect x="${W - m.r + 4}" y="${ly - 10}" width="${m.r - 4}" height="20" rx="4" fill="var(--gold)"/>
        <text x="${W - m.r + 10}" y="${ly + 4}" style="fill:#0A0800;font-weight:600">${last.v.toFixed(dec)}</text>
        <g class="hover" style="display:none"><line y1="${m.t}" y2="${H - m.b}" stroke="var(--ink-2)" stroke-width="1"/><circle r="5" fill="var(--gold)" stroke="var(--card)" stroke-width="2"/></g>
        <rect x="${m.l}" y="0" width="${W - m.l - m.r}" height="${H}" fill="transparent" class="hit"/>
      </svg><div class="tip"></div>`;
      const hov = $(".hover", el), tip = $(".tip", el), hit = $(".hit", el);
      const move = (ev) => {
        const b = el.getBoundingClientRect();
        const cx = (ev.touches ? ev.touches[0].clientX : ev.clientX) - b.left;
        const i = Math.max(0, Math.min(pts.length - 1, Math.round(((cx - m.l) / (W - m.l - m.r)) * (pts.length - 1))));
        const px = x(i), py = y(pts[i].v);
        hov.style.display = "";
        $("line", hov).setAttribute("x1", px); $("line", hov).setAttribute("x2", px);
        $("circle", hov).setAttribute("cx", px); $("circle", hov).setAttribute("cy", py);
        const chg = (pts[i].v / pts[0].v - 1) * 100;
        tip.innerHTML = `<div class="d">${fmt.date(pts[i].t)}</div><b>${pts[i].v.toFixed(4)}</b> NAV / share &nbsp;<span style="color:#5E636C">${fmt.pct(chg)}</span>`;
        tip.style.left = Math.min(Math.max(px, 90), W - 90) + "px";
        tip.style.top = py + "px";
        tip.style.opacity = 1;
      };
      hit.addEventListener("mousemove", move);
      hit.addEventListener("touchmove", move, { passive: true });
      hit.addEventListener("mouseleave", () => { hov.style.display = "none"; tip.style.opacity = 0; });
    };
    draw();
    let tm;
    const ro = new ResizeObserver(() => { clearTimeout(tm); tm = setTimeout(draw, 60); });
    ro.observe(el);
  }

  /* ------------------------------------------------------------------ */
  /* Shell: notice strip, masthead, footer                               */
  /* ------------------------------------------------------------------ */
  function shell(active) {
    const nav = [["vaults.html", "Vaults"], ["portfolio.html", "Portfolio"], ["create.html", "Launch a Vault"], ["venues.html", "Venues"]];
    const top = document.createElement("div");
    top.innerHTML = `
      <div class="notice"><span><b>Prototype</b></span><span>Simulated performance</span><span>Contracts unaudited</span><span>No mainnet deployment</span></div>
      <header class="masthead">
        <div class="wrap">
          <a class="brand" href="index.html">${SEAL}<span class="brand-name">BNB Agent Vaults</span></a>
          <nav class="nav">${nav.map(([h, l]) => `<a href="${h}" class="${active === h ? "active" : ""}">${l}</a>`).join("")}</nav>
          <div class="head-right">
            <span class="chain"><img class="logo" src="assets/logos/bnbchain.jpg" alt="">BNB Smart Chain · 56</span>
            <button class="btn sm" data-wallet>Connect Wallet</button>
            <button class="menu-btn" aria-label="Menu"><span></span></button>
          </div>
        </div>
      </header>`;
    document.body.prepend(...top.children);
    const foot = document.createElement("div");
    foot.innerHTML = footerHTML();
    document.body.append(...foot.children);
    wireShell();
  }

  function footerHTML() {
    return `<footer class="footer"><div class="wrap">
      <div class="foot-grid">
        <div><a class="brand" href="index.html">${SEAL}<span class="brand-name">BNB Agent Vaults</span></a>
          <p>Non-custodial ERC-4626 vaults on BNB Chain, operated by AI agents inside a pre-committed mandate.</p></div>
        <div><h5>Product</h5><a href="vaults.html">Vault directory</a><a href="create.html">Launch a vault</a><a href="portfolio.html">Portfolio</a><a href="venues.html">Approved venues</a></div>
        <div><h5>Developers</h5><a href="create.html">Vault Manifest</a><a href="venues.html">Agent stack</a><a href="#">MCP validation endpoint</a><a href="#">Contracts (pending audit)</a></div>
        <div><h5>Governance</h5><a href="index.html#terms">Fee caps</a><a href="index.html#how">Execution cycles</a><a href="index.html#terms">Risk council</a><a href="#">Security model</a></div>
      </div>
      <div class="disclosure">
        <div class="label">Important information</div>
        <div>
          <p>BNB Agent Vaults is a prototype. Smart contracts have not been audited and are not deployed to BNB Smart Chain mainnet. All vaults, managers, balances and performance figures shown are simulated for design purposes and do not represent real assets or results.</p>
          <p>Mandate limits reduce, but do not eliminate, risk. Depositors remain exposed to market, liquidation, oracle, smart-contract, bridge, counterparty and liquidity risk, and may lose some or all of their capital. Annualized figures are a mathematical restatement of settled returns, not a forecast or APY. Nothing on this site is investment advice or an offer to sell any security.</p>
        </div>
      </div>
      <div class="foot-base"><span>© 2026 BNB Agent Vaults — design prototype</span><span>Chain ID 56 · ERC-4626 · ERC-8004</span></div>
    </div></footer>`;
  }

  function wireShell() {
    const mh = $(".masthead");
    const mb = $(".menu-btn");
    if (mb) mb.addEventListener("click", () => mh.classList.toggle("open"));
    $$("[data-wallet]").forEach((b) => b.addEventListener("click", () => {
      const on = b.dataset.connected === "1";
      b.dataset.connected = on ? "0" : "1";
      b.textContent = on ? "Connect Wallet" : "0x7a3F…c91E";
      b.classList.toggle("ghost", !on);
      toast(on ? "Wallet disconnected" : "Demo wallet connected — no transactions will be sent");
    }));
  }

  let toastEl, toastT;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; document.body.append(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove("on"), 2600);
  }

  window.BAV = {
    TODAY, DAY, SLOTS, ASSETS, VENUES, AGENT_STACK, VAULTS,
    $, $$, esc, fmt, perf, periodDays, historyTag, riskMeter, statusTag,
    rng, hexAddr, short, navSeries, sparkline, lineChart, logo, agentCanvas,
    shell, footerHTML, wireShell, toast, SEAL,
    vault: (slug) => VAULTS.find((v) => v.slug === slug),
  };
})();
