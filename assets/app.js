/* BNB Agent Vaults — shared data, shell and chart helpers (design prototype). */
(function () {
  "use strict";

  const TODAY = Date.UTC(2026, 8, 30);
  const DAY = 864e5;
  const SLOTS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)"];
  const BASE_PATH = window.__BAV_BASE_PATH__ || "";
  const route = (target = "") => `${BASE_PATH}/${String(target).replace(/^\/+|\/+$/g, "")}${target && !String(target).includes("#") ? "/" : ""}`;

  /* ------------------------------------------------------------------ */
  /* Registry                                                            */
  /* ------------------------------------------------------------------ */
  const ASSETS = {
    USDT: { address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18 },
    USDC: { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18 },
    WBNB: { address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", decimals: 18 },
    BNB: { address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", decimals: 18 },
    BTCB: { address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", decimals: 18 },
    ETH: { address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", decimals: 18 },
    slisBNB: { address: "0xB0b84D294e0C75A6abe60171b70edEb2EFd14A1B", decimals: 18 },
    CAKE: { address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", decimals: 18 },
  };

  const VENUES = [
    { id: "pancakeswap", name: "PancakeSwap", logo: "pancakeswap" },
    { id: "lista", name: "Lista DAO", logo: "lista" },
    { id: "venus", name: "Venus", logo: "venus" },
  ];

  // The single list of operations an agent can be allowed, grouped into building blocks.
  // A vault switches blocks on; creators can untick operations inside a block but never add new ones.
  const BLOCKS = {
    stable: "Stablecoin lending", spot: "Spot trading", work: "Put holdings to work", borrow: "Borrow against holdings", loop: "Loops",
  };
  const OPS = [
    { id: "supply-stable", block: "stable", venues: ["venus"], group: "Earn", verb: "Supply / redeem stablecoins", scope: "USDT 3.34% · USDC 3.81% · USD1 1.90% · U 2.36%" },
    { id: "vault-stable", block: "stable", venues: ["lista"], group: "Earn", verb: "Deposit / withdraw lending vaults", scope: "USDT 2.5–5.0% · USD1 1.09% · U 1.45%" },
    { id: "swap-stable", block: "stable", venues: ["pancakeswap"], group: "Trade", verb: "Swap between stablecoins", scope: "USDT, USDC, USD1, U · FDUSD excluded" },
    { id: "swap", block: "spot", venues: ["pancakeswap"], group: "Trade", verb: "Buy and sell against USDT", scope: "Majors and bStocks with a DEX pool, routed across DEXs", locked: true },
    { id: "supply", block: "work", venues: ["venus"], group: "Earn", verb: "Supply / redeem holdings", scope: "BNB, BTCB, ETH, NVDAB, TSLAB, SPCXB, SKHYB", phrase: "supply them on Venus" },
    { id: "collateral", block: "work", venues: ["lista"], group: "Earn", verb: "Deposit / withdraw as collateral", scope: "BNB, BTCB, ETH and bStocks markets", phrase: "post them as collateral on Lista" },
    { id: "lp", block: "work", venues: ["pancakeswap"], group: "Earn", verb: "Add / remove liquidity, collect fees", scope: "V3 pools for majors and bStock / USDT · valued by oracle", phrase: "provide PancakeSwap liquidity" },
    { id: "borrow", block: "borrow", venues: ["venus", "lista"], group: "Borrow", verb: "Borrow / repay against holdings", scope: "USDT, USD1, U · up to your LTV cap", locked: true },
    { id: "stake-bnb", block: "loop", venues: ["lista"], group: "Loop", verb: "Stake BNB into slisBNB", scope: "for slisBNB pairs", locked: true },
    { id: "loop", block: "loop", venues: ["lista", "venus"], group: "Loop", verb: "Post collateral, borrow, flash-loan lever and unwind", scope: "allowed pairs, within each pair's LTV cap", locked: true },
    { id: "swap-unwind", block: "loop", venues: ["pancakeswap"], group: "Trade", verb: "Swap between collateral and borrowed asset", scope: "PancakeSwap and Lista DEX, capped against oracle price", locked: true },
  ];
  const opScope = (op) => op.scope;

  const TEMPLATES = {
    fund: { name: "Fund manager", risk: "High", benchmark: "Venus USDT supply rate" },
    stable: { name: "Stablecoin lending", risk: "Low", benchmark: "Venus USDT supply rate" },
    loop: { name: "Looping", risk: "Medium", benchmark: "Hold slisBNB" },
    bluechip: { name: "Blue-chip spot", risk: "High", benchmark: "Equal-weight BNB / BTCB / ETH" },
    stocks: { name: "Tokenized stocks", risk: "High", benchmark: "Hold SPYB" },
  };

  /* ------------------------------------------------------------------ */
  /* Vaults (simulated)                                                  */
  /* ------------------------------------------------------------------ */
  const VAULTS = [
    {
      slug: "northstar-multi", name: "Northstar Multi-Strategy", manager: "Northstar", agentId: 1611, agentVaults: 2, symbol: "avNMS", asset: "USDT", template: "fund",
      ops: ["supply-stable", "vault-stable", "swap", "supply", "lp", "stake-bnb", "loop", "swap-unwind"],
      strategy: "Keeps a stablecoin core on Venus, runs a slisBNB loop, and rotates a sleeve of majors and bStocks.",
      runtimeDays: 96, returns: { "7D": 0.61, "30D": 2.44, "90D": 7.12, ALL: 7.9 }, maxDrawdown: { "7D": -0.42, "30D": -1.88, "90D": -3.9, ALL: -3.9 },
      tvl: 3050000, followers: 1102, status: "Live", sharePrice: 1.079, fees: { perf: 15, mgmt: 0, platform: 5 }, cap: null, exitCost: "0.1–0.9% by position",
      limits: { nonUsdt: 50, idle: 8, loopCeil: 80 }, venues: ["venus", "lista", "pancakeswap"],
      allocation: [["Stablecoin lending", 44], ["slisBNB loop", 24], ["Majors + bStocks", 24], ["Idle USDT", 8]],
      positions: [
        { p: "Venus", loc: "vUSDT", w: 30, by: "vToken × exchange rate", st: "Supplying · 3.34%" },
        { p: "Lista DAO", loc: "USDT lending vault", w: 14, by: "Vault shares", st: "Supplying · 2.84%" },
        { p: "Lista DAO", loc: "slisBNB / BNB · fixed-term", w: 24, by: "Staking rate × BNB − debt", st: "LTV 76.0% · 4.2×" },
        { p: "PancakeSwap", loc: "BTCB · NVDAB · SPYB", w: 24, by: "Oracle · Atlas / APRO", st: "Held" },
        { p: "Idle", loc: "USDT in vault", w: 8, by: "Balance", st: "Instant exits" },
      ],
    },
    {
      slug: "stable-yield-router", ops: ["swap-stable", "supply-stable", "vault-stable"], name: "Stable Yield Router", manager: "Orbit Agent", agentId: 942, agentVaults: 1, symbol: "avSYR", asset: "USDT", template: "stable",
      strategy: "Moves USDT and USDC between Venus and Lista lending as rates change.",
      runtimeDays: 128, returns: { "7D": 0.24, "30D": 1.02, "90D": 3.31, ALL: 4.76 }, maxDrawdown: { "7D": -0.03, "30D": -0.12, "90D": -0.38, ALL: -0.62 },
      tvl: 2860000, followers: 984, status: "Live", sharePrice: 1.0476, fees: { perf: 10, mgmt: 0, platform: 3 }, cap: null, exitCost: "< 0.1%",
      limits: { nonUsdt: 50, idle: 5 }, venues: ["venus", "lista", "pancakeswap"],
      allocation: [["Venus · USDT", 48], ["Venus · USDC", 37], ["Idle USDT", 15]],
      positions: [
        { p: "Venus", loc: "vUSDT", w: 48, by: "vToken × exchange rate", st: "Supplying · 3.34%" },
        { p: "Venus", loc: "vUSDC", w: 37, by: "vToken × exchange rate", st: "Supplying · 3.81%" },
        { p: "Idle", loc: "USDT in vault", w: 15, by: "Balance", st: "Instant exits" },
      ],
    },
    {
      slug: "bnb-bluechip-momentum", ops: ["swap", "supply", "collateral", "lp"], name: "Bluechip Momentum", manager: "Sable Quant", agentId: 1306, agentVaults: 3, symbol: "avBCM", asset: "USDT", template: "bluechip",
      strategy: "Trend-following exposure across BNB, BTCB and ETH with volatility-aware position sizing.",
      runtimeDays: 73, returns: { "7D": 2.16, "30D": 6.42, "90D": null, ALL: 13.88 }, maxDrawdown: { "7D": -1.92, "30D": -4.74, "90D": null, ALL: -8.16 },
      tvl: 2170000, followers: 803, status: "Live", sharePrice: 1.1388, fees: { perf: 15, mgmt: 0, platform: 5 }, cap: 5000000, exitCost: "< 0.5% at $100K",
      pendingChange: { what: "Performance fee 15% → 20%", hours: 18 }, venues: ["pancakeswap", "venus"],
      allocation: [["BNB", 46], ["BTCB", 31], ["ETH", 23]],
      positions: [
        { p: "PancakeSwap", loc: "WBNB", w: 46, by: "Oracle · Chainlink / Atlas", st: "Held" },
        { p: "PancakeSwap", loc: "BTCB", w: 31, by: "Oracle · Chainlink / Atlas", st: "Held" },
        { p: "Venus", loc: "vETH", w: 23, by: "vToken × oracle", st: "Supplying · 1.36%" },
      ],
    },
    {
      slug: "liquid-staking-loop", ops: ["stake-bnb", "loop", "swap-unwind"], name: "Liquid Staking Loop", manager: "Kepler AI", agentId: 1422, agentVaults: 1, symbol: "avLSL", asset: "BNB", template: "loop",
      strategy: "slisBNB loop on Lista at about 4.6× with the idle buffer kept at 10%.",
      runtimeDays: 41, returns: { "7D": 0.04, "30D": 0.18, "90D": null, ALL: 0.24 }, maxDrawdown: { "7D": -0.02, "30D": -0.05, "90D": null, ALL: -0.06 },
      tvl: 1940000, followers: 677, status: "Live", sharePrice: 1.0024, fees: { perf: 10, mgmt: 0, platform: 3 }, cap: null, exitCost: "≈ 0.8% on 10 BNB",
      limits: { ltv: 80, idle: 10 }, venues: ["lista"],
      allocation: [["slisBNB loop (net)", 90], ["Idle BNB", 10]],
      positions: [
        { p: "Lista DAO", loc: "slisBNB / BNB · fixed-term", w: 90, by: "Staking rate × BNB − debt", st: "LTV 78.4% · 4.6×" },
        { p: "Idle", loc: "BNB in vault", w: 10, by: "Balance", st: "Instant exits" },
      ],
    },
    {
      slug: "mag7-rotation", ops: ["swap", "supply", "lp"], name: "Mag 7 Rotation", manager: "Tickerline", agentId: 1702, agentVaults: 2, symbol: "avM7R", asset: "USDT", template: "stocks",
      strategy: "Rotates between the largest US tech names in bStocks, holding USDT when momentum fades.",
      runtimeDays: 52, returns: { "7D": 1.42, "30D": 4.91, "90D": null, ALL: 7.84 }, maxDrawdown: { "7D": -1.18, "30D": -3.96, "90D": null, ALL: -5.72 },
      tvl: 1210000, followers: 512, status: "Live", sharePrice: 1.0784, fees: { perf: 15, mgmt: 0, platform: 5 }, cap: 1500000, exitCost: "0.2–0.7% at $100K", venues: ["pancakeswap"],
      allocation: [["NVDAB", 28], ["GOOGLB", 22], ["AAPLB", 18], ["USDT", 32]],
      positions: [
        { p: "PancakeSwap", loc: "NVDAB", w: 28, by: "Atlas · APRO · TWAP", st: "Held" },
        { p: "PancakeSwap", loc: "GOOGLB", w: 22, by: "Atlas · TWAP", st: "Held" },
        { p: "PancakeSwap", loc: "AAPLB", w: 18, by: "Atlas · TWAP", st: "Held" },
        { p: "Idle", loc: "USDT in vault", w: 32, by: "Balance", st: "Instant exits" },
      ],
    },
    {
      slug: "nvda-dca", ops: ["swap"], name: "NVDA Weekly DCA", manager: "Drip Agent", agentId: 1755, agentVaults: 1, symbol: "avNDC", asset: "USDT", template: "stocks",
      strategy: "Buys NVDAB every Monday with a fixed share of idle USDT. Nothing else.",
      runtimeDays: 9, returns: { "7D": 2.08, "30D": null, "90D": null, ALL: 3.41 }, maxDrawdown: { "7D": -2.64, "30D": null, "90D": null, ALL: -2.64 },
      tvl: 184000, followers: 96, status: "Live", sharePrice: 1.0341, fees: { perf: 10, mgmt: 0, platform: 5 }, cap: null, exitCost: "≈ 0.4% at $100K", venues: ["pancakeswap"],
      allocation: [["NVDAB", 64], ["USDT", 36]],
      positions: [
        { p: "PancakeSwap", loc: "NVDAB", w: 64, by: "Atlas · APRO · TWAP", st: "Held" },
        { p: "Idle", loc: "USDT in vault", w: 36, by: "Balance", st: "Next buy Monday" },
      ],
    },
    {
      slug: "lista-rate-hopper", ops: ["supply-stable", "vault-stable"], name: "Lista Rate Hopper", manager: "Mirror Labs", agentId: 1790, agentVaults: 4, symbol: "avLRH", asset: "USDT", template: "stable",
      strategy: "Low-fee USDT lending across Venus and Lista.",
      runtimeDays: 11, returns: { "7D": 0.21, "30D": null, "90D": null, ALL: 0.33 }, maxDrawdown: { "7D": -0.02, "30D": null, "90D": null, ALL: -0.02 },
      tvl: 420000, followers: 61, status: "Live", sharePrice: 1.0033, fees: { perf: 5, mgmt: 0, platform: 3 }, cap: null, exitCost: "< 0.1%",
      copyOf: { slug: "stable-yield-router", lag: "14 min" }, limits: { nonUsdt: 50, idle: 5 }, venues: ["venus", "lista"],
      allocation: [["Venus · USDT", 47], ["Venus · USDC", 38], ["Idle USDT", 15]],
      positions: [
        { p: "Venus", loc: "vUSDT", w: 47, by: "vToken × exchange rate", st: "Supplying · 3.34%" },
        { p: "Venus", loc: "vUSDC", w: 38, by: "vToken × exchange rate", st: "Supplying · 3.81%" },
        { p: "Idle", loc: "USDT in vault", w: 15, by: "Balance", st: "Instant exits" },
      ],
    },
  ];

  /* ------------------------------------------------------------------ */
  /* Local demo ledger — no wallet, signature or transaction required.  */
  /* ------------------------------------------------------------------ */
  const DEMO_OWNER = "0x7a3F5b2E9d41C8a06f3B7e2D19c4A8b5E0d2c91E";
  const DEMO_KEY = "bnb-agent-vaults:demo-ledger:v1";
  const freshDemoState = () => ({
    balances: { USDT: 24850, BNB: 18.42 },
    holdings: {
      "stable-yield-router": { shares: 20000, cost: 1 },
      "bnb-bluechip-momentum": { shares: 3200, cost: 1.0625 },
      "mag7-rotation": { shares: 4600, cost: 1.0214 },
    },
    activities: [],
    launchedVaults: [],
  });
  let memoryDemoState = freshDemoState();
  function readDemoState() {
    try {
      const saved = localStorage.getItem(DEMO_KEY);
      if (saved) memoryDemoState = { ...freshDemoState(), ...JSON.parse(saved) };
    } catch (_) {}
    return memoryDemoState;
  }
  function writeDemoState(state) {
    memoryDemoState = state;
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(state)); } catch (_) {}
    window.dispatchEvent(new CustomEvent("bav:demo-state", { detail: state }));
    return state;
  }
  const demo = {
    owner: DEMO_OWNER,
    state: readDemoState,
    balance(asset) { return Number(readDemoState().balances[asset] || 0); },
    shares(slug) { return Number(readDemoState().holdings[slug]?.shares || 0); },
    deposit(slug, amount) {
      const v = VAULTS.find((x) => x.slug === slug), n = Number(amount), state = readDemoState();
      if (!v || !isFinite(n) || n <= 0) return { ok: false, error: "Enter an amount greater than zero." };
      if (n > Number(state.balances[v.asset] || 0)) return { ok: false, error: "Demo balance is too low for this deposit." };
      const issued = n / v.sharePrice, old = state.holdings[slug] || { shares: 0, cost: v.sharePrice };
      const basis = old.shares * old.cost + n;
      state.balances[v.asset] -= n;
      state.holdings[slug] = { shares: old.shares + issued, cost: basis / (old.shares + issued) };
      state.activities.unshift({ at: Date.now(), event: "Demo deposit", vault: v.name, amount: `${n.toFixed(2)} ${v.asset} → ${issued.toFixed(2)} ${v.symbol}`, ref: "LOCAL" });
      writeDemoState(state);
      return { ok: true, shares: issued, balance: state.balances[v.asset] };
    },
    redeem(slug, shares) {
      const v = VAULTS.find((x) => x.slug === slug), n = Number(shares), state = readDemoState();
      const held = Number(state.holdings[slug]?.shares || 0);
      if (!v || !isFinite(n) || n <= 0) return { ok: false, error: "Enter an amount greater than zero." };
      if (n > held) return { ok: false, error: `You only hold ${held.toFixed(2)} demo shares.` };
      const received = n * v.sharePrice;
      state.holdings[slug].shares = held - n;
      if (state.holdings[slug].shares < 0.000001) delete state.holdings[slug];
      state.balances[v.asset] = Number(state.balances[v.asset] || 0) + received;
      state.activities.unshift({ at: Date.now(), event: "Demo redemption", vault: v.name, amount: `${n.toFixed(2)} ${v.symbol} → ${received.toFixed(2)} ${v.asset}`, ref: "LOCAL" });
      writeDemoState(state);
      return { ok: true, received, balance: state.balances[v.asset] };
    },
    launch(manifest) {
      const state = readDemoState();
      const id = `demo-${Date.now().toString(36)}`;
      state.launchedVaults.unshift({ id, at: Date.now(), manifest });
      state.activities.unshift({ at: Date.now(), event: "Demo vault launched", vault: manifest.identity.name, amount: `${manifest.seed.amount} ${manifest.seed.asset} seed`, ref: id.toUpperCase() });
      writeDemoState(state);
      return { id };
    },
    reset() { return writeDemoState(freshDemoState()); },
  };

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
    const lvl = r === "Low" ? 1 : r === "Medium" ? 2 : 3;
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

  // NAV/share series, anchored so period returns match the published figures.
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
    return `<img class="logo ${cls}" src="${BASE_PATH}/logos/${file}.jpg" alt="${esc(v ? v.name : "BNB Chain")}">`;
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
    const nav = [["vaults.html", "Vaults"], ["portfolio.html", "Portfolio"], ["create.html", "Launch a Vault"]];
    const top = document.createElement("div");
    top.innerHTML = `
      <div class="notice" data-bav-shell><span><b>Demo mode</b></span><span>No wallet required</span><span>Simulated performance</span><span>No transactions</span></div>
      <header class="masthead" data-bav-shell>
        <div class="wrap">
          <a class="brand" href="${route()}">${SEAL}<span class="brand-name">BNB Agent Vaults</span></a>
          <nav class="nav">${nav.map(([h, l]) => `<a href="${route(h.replace(".html", ""))}" class="${active === h ? "active" : ""}">${l}</a>`).join("")}</nav>
          <div class="head-right">
            <span class="chain"><img class="logo" src="${BASE_PATH}/logos/bnbchain.jpg" alt="">BNB Smart Chain · 56</span>
            <button class="btn sm ghost" data-demo><span class="full">Demo Mode</span><span class="short">Demo</span></button>
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
    return `<footer class="footer" data-bav-shell><div class="wrap">
      <div class="foot-grid">
        <div><a class="brand" href="${route()}">${SEAL}<span class="brand-name">BNB Agent Vaults</span></a>
          <p>Non-custodial ERC-4626 vaults on BNB Chain, operated by AI agents inside a pre-committed mandate.</p></div>
        <div><h5>Product</h5><a href="${route("vaults")}">Vault directory</a><a href="${route("create")}">Launch a vault</a><a href="${route("portfolio")}">Portfolio</a></div>
        <div><h5>Developers</h5><a href="${route("create")}">Vault Manifest</a><a href="${route("#terms")}">MCP + skills</a><a href="${route("#terms")}">Contracts (pending audit)</a></div>
        <div><h5>Protocol</h5><a href="${route("#terms")}">Fee caps</a><a href="${route("#terms")}">Timelocks</a><a href="${route("#terms")}">Risk council</a><a href="${route("#terms")}">Security model</a></div>
      </div>
      <div class="disclosure">
        <div class="label">Important information</div>
        <div>
          <p>BNB Agent Vaults is a prototype. Smart contracts have not been audited and are not deployed to BNB Smart Chain mainnet. All vaults, managers, balances and performance figures shown are simulated for design purposes and do not represent real assets or results.</p>
          <p>Mandate limits reduce, but do not eliminate, risk. Depositors remain exposed to market, liquidation, oracle, smart-contract, counterparty and liquidity risk, and may lose some or all of their capital. Annualized figures are a mathematical restatement of past returns, not a forecast or APY. Nothing on this site is investment advice or an offer to sell any security.</p>
        </div>
      </div>
      <div class="foot-base"><span>© 2026 BNB Agent Vaults — design prototype</span><span>Chain ID 56 · ERC-4626 · ERC-8004</span></div>
    </div></footer>`;
  }

  function wireShell() {
    const mh = $(".masthead");
    const mb = $(".menu-btn");
    const setMenu = (open) => { mh.classList.toggle("open", open); document.body.classList.toggle("menu-open", open); };
    if (mb) mb.addEventListener("click", () => setMenu(!mh.classList.contains("open")));
    $$(".nav a", mh).forEach((a) => a.addEventListener("click", () => setMenu(false)));
    window.addEventListener("resize", () => { if (window.innerWidth > 960) setMenu(false); });
    $$("[data-demo]").forEach((b) => b.addEventListener("click", () => toast("Demo mode is active — no wallet or transaction is required")));
    stackTables();
  }

  // On small screens `.tbl.stack` rows render as cards; each cell borrows its column header as a label.
  function stackTables(root = document) {
    $$("table.stack", root).forEach((t) => {
      if (t.dataset.stacked) return;
      t.dataset.stacked = "1";
      const apply = () => {
        const heads = $$("thead th", t).map((th) => th.textContent.trim());
        $$("tbody tr, tfoot tr", t).forEach((tr) => {
          let i = 0;
          Array.from(tr.children).forEach((td) => {
            const span = td.colSpan || 1;
            if (span === 1 && heads[i] && td.dataset.label !== heads[i]) td.dataset.label = heads[i];
            i += span;
          });
        });
      };
      apply();
      new MutationObserver(apply).observe(t, { childList: true, subtree: true });
    });
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
    TODAY, DAY, SLOTS, ASSETS, VENUES, BLOCKS, OPS, opScope, TEMPLATES, VAULTS,
    $, $$, esc, fmt, perf, periodDays, historyTag, riskMeter, statusTag,
    rng, hexAddr, short, navSeries, sparkline, lineChart, logo, agentCanvas, stackTables,
    shell, footerHTML, wireShell, toast, SEAL, route, DEMO_OWNER, demo,
    vault: (slug) => VAULTS.find((v) => v.slug === slug),
  };
})();
