/* BNB Agent Vaults — shared data, shell and chart helpers (design prototype). */
(function () {
  "use strict";

  const TODAY = Date.UTC(2026, 8, 30);
  const DAY = 864e5;
  const SLOTS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)"];
  const BASE_PATH = window.__BAV_BASE_PATH__ || "";
  const STATIC_PREVIEW = window.__BAV_STATIC_PREVIEW__ === true ||
    window.location.protocol === "file:" ||
    !document.querySelector("[data-prototype-page]");
  const logoUrl = (file) => STATIC_PREVIEW
    ? `assets/logos/${file}.jpg`
    : `${BASE_PATH}/logos/${file}.jpg`;
  const route = (target = "") => {
    const clean = String(target).replace(/^\/+|\/+$/g, "");
    if (STATIC_PREVIEW) {
      if (!clean || clean.startsWith("#")) return "index.html" + clean;
      const [page, slug] = clean.split("/");
      return slug ? `${page}.html?slug=${slug}` : `${page}.html`;
    }
    return `${BASE_PATH}/${clean}${clean && !clean.includes("#") ? "/" : ""}`;
  };

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

  // Fees are derived in one place so the create and vault pages cannot show
  // different splits. The creator sets a gross fee; the platform receives 15%
  // of that fee in addition to its own risk-based performance fee.
  const platformFeeForRisk = (risk) => (risk === "High" ? 5 : 3);
  const feeBreakdown = (creatorPerformancePct, platformPerformancePct) => {
    const creatorGross = Number(creatorPerformancePct) || 0;
    const platformBase = Number(platformPerformancePct) || 0;
    const platformShareOfCreator = creatorGross * 0.15;
    return {
      total: creatorGross + platformBase,
      creatorGross,
      creatorNet: creatorGross - platformShareOfCreator,
      platformBase,
      platformShareOfCreator,
      platformTotal: platformBase + platformShareOfCreator,
    };
  };

  /* ------------------------------------------------------------------ */
  /* Market catalog — shared by the create and vault pages              */
  /* ------------------------------------------------------------------ */
  const CATALOG = (() => {
    /* ================= Market catalog (snapshot 2026-09-30) =================
       Lending: Venus core-pool supply APY (api.venus.io) and Lista lending vaults (api.lista.org/api/moolah/vault/list).
       Not listed: exclusive vaults (Solv, Lorenzo), empty vaults (< $10K), and vaults for assets outside the four groups.
       Loops: Lista + Venus markets with at least $1,000 to borrow; cap = liquidation LTV minus a buffer. */
    const STABLE_TOK = new Set(["USDT", "USDC", "USD1", "U", "sUSDe", "USDe", "asUSDF", "USDT-USDC LP", "USD1-USDT LP", "lisUSD-USDT LP", "U-USDT LP"]);
    const BNB_TOK = new Set(["BNB", "WBNB", "slisBNB", "asBNB", "slisBNB-BNB LP"]);
    const MAJOR_TOK = new Set(["BTCB", "ETH", "wBETH", "SolvBTC"]);
    const groupOf = (t) => (STABLE_TOK.has(t) ? "stable" : BNB_TOK.has(t) ? "bnb" : MAJOR_TOK.has(t) ? "majors" : "stocks");
    const familyOf = (t) => (STABLE_TOK.has(t) ? "stable" : BNB_TOK.has(t) ? "bnb" : "other");

    const GROUPS = {
      stable: { name: "Stablecoins", tokens: "USDT, USDC, USD1, U — and yield-bearing stables in loops", noun: "stablecoins" },
      bnb: { name: "BNB & staked BNB", tokens: "BNB, slisBNB, asBNB", noun: "BNB" },
      majors: { name: "BTC & ETH", tokens: "BTCB, ETH, wBETH, SolvBTC", noun: "BTC and ETH" },
      stocks: { name: "Tokenized stocks", tokens: "bStocks with a DEX pool — NVDAB, TSLAB, SPYB…", noun: "tokenized stocks" },
    };
    const ACTIONS = {
      lend: { name: "Lend & earn", desc: "Lending vaults, Venus supply markets and BNB staking.", logos: ["lista", "venus"] },
      trade: { name: "Hold & trade", desc: "Hold the token itself, bought and sold on PancakeSwap.", logos: ["pancakeswap"] },
      lp: { name: "Provide liquidity", desc: "PancakeSwap V3 pools, valued by the oracle, not the pool.", logos: ["pancakeswap"] },
      borrow: { name: "Borrow & loop", desc: "Post collateral, borrow and loop. You set the leverage cap.", logos: ["venus", "lista"] },
    };

    const M = [];
    const lend = (o) => M.push({ a: "lend", ...o });
    // Stablecoins
    lend({ id: "lista-vault-0xb5a3", g: "stable", venue: "lista", kind: "Vault", name: "RockawayX PT Yield", sub: "USDT · curated by RockawayX", apy: 4.14, tvl: 1.77e6, tokens: ["USDT"] });
    lend({ id: "venus-supply-usdc", g: "stable", venue: "venus", kind: "Market", name: "Venus · USDC", sub: "Core pool supply", apy: 3.87, tokens: ["USDC"] });
    lend({ id: "venus-supply-usdt", g: "stable", venue: "venus", kind: "Market", name: "Venus · USDT", sub: "Core pool supply", apy: 3.25, tokens: ["USDT"] });
    lend({ id: "lista-vault-0x3bd8", g: "stable", venue: "lista", kind: "Vault", name: "Statera Vault USDT", sub: "USDT · curated by Statera Labs", apy: 3.23, tvl: 0.02e6, tokens: ["USDT"] });
    lend({ id: "lista-vault-0x6d67", g: "stable", venue: "lista", kind: "Vault", name: "Gauntlet USDT Vault", sub: "USDT · curated by Gauntlet", apy: 2.86, tvl: 2.70e6, tokens: ["USDT"] });
    lend({ id: "lista-vault-0xeb4f", g: "stable", venue: "lista", kind: "Vault", name: "Pangolins USDT Vault", sub: "USDT · curated by Pangolins", apy: 2.50, tvl: 1.38e6, tokens: ["USDT"] });
    lend({ id: "venus-supply-u", g: "stable", venue: "venus", kind: "Market", name: "Venus · U", sub: "Core pool supply", apy: 2.35, tokens: ["U"] });
    lend({ id: "venus-supply-usd1", g: "stable", venue: "venus", kind: "Market", name: "Venus · USD1", sub: "Core pool supply", apy: 1.90, tokens: ["USD1"] });
    lend({ id: "lista-vault-0x9a17", g: "stable", venue: "lista", kind: "Vault", name: "Gauntlet x Lista DAO U Vault", sub: "U · curated by Gauntlet x Lista DAO", apy: 1.41, tvl: 49.93e6, tokens: ["U"] });
    lend({ id: "lista-vault-0xfa27", g: "stable", venue: "lista", kind: "Vault", name: "Gauntlet x Lista DAO USD1 Vault", sub: "USD1 · curated by Gauntlet x Lista DAO", apy: 1.07, tvl: 138.20e6, tokens: ["USD1"] });
    lend({ id: "lista-vault-0x8a06", g: "stable", venue: "lista", kind: "Vault", name: "Lista USDC Vault", sub: "USDC · curated by Lista DAO", apy: 0.01, apyNote: "+9.24% LISTA, not counted", tvl: 0.93e6, tokens: ["USDC"] });
    // BNB
    lend({ id: "lista-vault-0xd5cf", g: "bnb", venue: "lista", kind: "Vault", name: "MEV BNB Vault", sub: "BNB · curated by MEV Capital", apy: 1.72, tvl: 0.03e6, tokens: ["BNB"] });
    lend({ id: "lista-stake-slisbnb", g: "bnb", venue: "lista", kind: "Staking", name: "Stake BNB → slisBNB", sub: "Lista liquid staking · exits via DEX, or a 7–15 day unstake", apy: 0.83, tokens: ["slisBNB"] });
    lend({ id: "lista-vault-0x5713", g: "bnb", venue: "lista", kind: "Vault", name: "Gauntlet x Lista DAO BNB Vault", sub: "BNB · curated by Gauntlet x Lista DAO", apy: 0.21, tvl: 371.75e6, tokens: ["BNB"] });
    lend({ id: "venus-supply-bnb", g: "bnb", venue: "venus", kind: "Market", name: "Venus · BNB", sub: "Core pool supply", apy: 0.03, tokens: ["BNB"] });
    // BTC & ETH
    lend({ id: "venus-supply-eth", g: "majors", venue: "venus", kind: "Market", name: "Venus · ETH", sub: "Core pool supply", apy: 1.22, tokens: ["ETH"] });
    lend({ id: "lista-vault-0xe46b", g: "majors", venue: "lista", kind: "Vault", name: "Lista BTCB Vault", sub: "BTCB · curated by Lista DAO", apy: 0.32, tvl: 0.16e6, tokens: ["BTCB"] });
    lend({ id: "venus-supply-btcb", g: "majors", venue: "venus", kind: "Market", name: "Venus · BTCB", sub: "Core pool supply", apy: 0.19, tokens: ["BTCB"] });
    // Tokenized stocks
    lend({ id: "lista-vault-0x23db", g: "stocks", venue: "lista", kind: "Vault", name: "Flap NVDAB Vault", sub: "NVDAB · curated by Flap", apy: 27.0, tvl: 0.08e6, tokens: ["NVDAB"] });
    ["NVDAB", "TSLAB", "SPCXB", "SKHYB"].forEach((t) => lend({ id: `venus-supply-${t.toLowerCase()}`, g: "stocks", venue: "venus", kind: "Market", name: `Venus · ${t}`, sub: "Collateral-only market — no borrowers, so it earns nothing on its own", apy: 0, tokens: [t] }));

    const hold = (g, t, sub, tier) => M.push({ id: `pcs-hold-${t.toLowerCase()}`, g, a: "trade", venue: "pancakeswap", kind: "Token", name: t, sub, tier, tokens: [t] });
    hold("stable", "USDT", "Near-zero exit cost"); hold("stable", "USDC", "Near-zero exit cost"); hold("stable", "U", "Near-zero exit cost"); hold("stable", "USD1", "$1M back to USDT costs about 0.95%");
    hold("bnb", "BNB", "$100K under 0.5%; $1M about 1.2%"); hold("bnb", "slisBNB", "DEX discount 0.17% on 100 slisBNB"); hold("bnb", "asBNB", "Thinner pool; exit cost shown before each trade");
    hold("majors", "BTCB", "$1M about 0.5%"); hold("majors", "ETH", "$1M about 7% on a single pool");
    const BSTOCKS = [
      { tier: "Deep", hint: "Sell $100K for under 1%", list: ["NVDAB", "TSLAB", "SPYB", "QQQB", "AAPLB", "GOOGLB", "BABAB", "SPCXB"] },
      { tier: "Medium", hint: "Sell $10K for under 1%", list: ["MSFTB", "AMZNB", "HOODB", "MSTRB", "CRCLB", "SKHYB", "SNDKB", "GMEB", "BNCB"] },
      { tier: "Thin", hint: "Sell $10K for 1–10%", list: ["METAB", "TSMB", "NFLXB", "INTCB", "MUB", "MRNAB", "BMNRB", "DJTB", "FLNCB", "AMCB", "NOKB", "SNXXB", "SOXLB", "SOXSB", "TQQQB", "SQQQB"] },
    ];
    const LEV_ETF = new Set(["TQQQB", "SQQQB", "SOXLB", "SOXSB"]);
    BSTOCKS.forEach((t) => t.list.forEach((s) => hold("stocks", s, t.hint + (LEV_ETF.has(s) ? " · leveraged / inverse ETF" : ""), t.tier)));

    const pool = (g, a, b, sub) => M.push({ id: `pcs-lp-${a}-${b}`.toLowerCase(), g, a: "lp", venue: "pancakeswap", kind: "Pool", name: `${a} / ${b}`, sub: sub || "V3 · fee APR not measured yet", tokens: [a, b] });
    pool("stable", "USDT", "USDC"); pool("stable", "USD1", "USDT"); pool("stable", "U", "USDT");
    pool("bnb", "WBNB", "USDT"); pool("bnb", "slisBNB", "WBNB");
    pool("majors", "BTCB", "USDT"); pool("majors", "ETH", "USDT");
    BSTOCKS[0].list.forEach((s) => pool("stocks", s, "USDT", "V3 · deep pool · fee APR not measured yet"));

    // Loop pairs, from Lista (on-chain LLTV + liquidity) and Venus (collateral factors) on 2026-09-30.
    // [id, kind, venue, collateral, loan, liquidation LTV %, pair LTV cap, default, borrow %, LISTA reward %, USD available, sub, collateral yield %, DEX discount %, slisBNB]
    const PAIR_ROWS = [["venus-slisbnb-bnb","corr","venus","slisBNB","BNB",72,65,55,0.39,0,379000000,"",0.834,0.17,1],["venus-asbnb-bnb","corr","venus","asBNB","BNB",60,53,43,0.39,0,379000000,"",null,0.3,0],["lista-slisbnb-bnb-fixed-term","corr","lista","slisBNB","BNB",96.5,90,80,0.5,0,142384587,"fixed-term",0.834,0.17,1],["lista-slisbnb-bnb-lp-bnb-smart-lending","corr","lista","slisBNB-BNB LP","BNB",96.5,90,80,0.5,0,7650810,"Smart Lending",null,0.1,1],["lista-slisbnb-bnb","corr","lista","slisBNB","BNB",96.5,90,80,0.29,0,5772283,"",0.834,0.17,1],["lista-slisbnb-bnb-lp-bnb-smart-lending-1","corr","lista","slisBNB-BNB LP","BNB",91.5,85,75,1.0,0,82038,"Smart Lending",null,0.1,1],["lista-asbnb-bnb","corr","lista","asBNB","BNB",96.5,90,80,0.29,0,8771,"",null,0.3,0],["lista-slisbnb-bnb-1","corr","lista","slisBNB","BNB",91.5,85,75,2.37,0,4474,"",0.834,0.17,1],["venus-susde-usdt","stable","venus","sUSDe","USDT",75,68,58,5.0,0,45800000,"",5.16,0.1,0],["venus-usde-usdt","stable","venus","USDe","USDT",70,63,53,5.0,0,45800000,"",null,0.1,0],["venus-susde-u","stable","venus","sUSDe","U",75,68,58,4.1,0,10200000,"",5.16,0.1,0],["venus-usde-u","stable","venus","USDe","U",70,63,53,4.1,0,10200000,"",null,0.1,0],["venus-susde-usdc","stable","venus","sUSDe","USDC",75,68,58,5.35,0,7900000,"",5.16,0.1,0],["venus-usde-usdc","stable","venus","USDe","USDC",70,63,53,5.35,0,7900000,"",null,0.1,0],["lista-usdt-usdc-lp-usd1-smart-lending","stable","lista","USDT-USDC LP","USD1",96.5,90,80,0.47,0.45,2164988,"Smart Lending",null,0.1,0],["lista-usd1-usdt-lp-u-smart-lending","stable","lista","USD1-USDT LP","U",96.5,90,80,0.03,0,399163,"Smart Lending",null,0.1,0],["lista-lisusd-usdt-lp-u-smart-lending","stable","lista","lisUSD-USDT LP","U",96.5,90,80,0.03,0,384333,"Smart Lending",null,0.1,0],["lista-usd1-usdt-lp-usd1-smart-lending","stable","lista","USD1-USDT LP","USD1",96.5,90,80,0.03,0,292946,"Smart Lending",null,0.1,0],["lista-lisusd-usdt-lp-usd1-smart-lending","stable","lista","lisUSD-USDT LP","USD1",96.5,90,80,0.03,0,271843,"Smart Lending",null,0.1,0],["lista-usdt-usdc-lp-u-smart-lending","stable","lista","USDT-USDC LP","U",96.5,90,80,1.0,0.47,228884,"Smart Lending",null,0.1,0],["lista-asusdf-usd1","stable","lista","asUSDF","USD1",91.5,85,75,0.08,0,205542,"",null,0.3,0],["lista-usdt-usdc-lp-usdc-smart-lending","stable","lista","USDT-USDC LP","USDC",96.5,90,80,1.46,0,100009,"Smart Lending",null,0.1,0],["lista-u-usdt-lp-usdt-smart-lending","stable","lista","U-USDT LP","USDT",96.5,90,80,6.08,0,10567,"Smart Lending",null,0.1,0],["lista-susde-usdt","stable","lista","sUSDe","USDT",91.5,85,75,6.16,0,9992,"",5.16,0.1,0],["lista-u-usdt-lp-usd1-smart-lending","stable","lista","U-USDT LP","USD1",96.5,90,80,1.7,0,2006,"Smart Lending",null,0.1,0],["lista-asusdf-usdt","stable","lista","asUSDF","USDT",91.5,85,75,31.34,0,1089,"",null,0.3,0],["venus-btcb-usdt","long","venus","BTCB","USDT",80,60,45,5.0,0,45800000,"",null,0.04,0],["venus-eth-usdt","long","venus","ETH","USDT",80,60,45,5.0,0,45800000,"",null,0.43,0],["venus-bnb-usdt","long","venus","BNB","USDT",80,60,45,5.0,0,45800000,"",null,0.06,0],["venus-wbeth-usdt","long","venus","wBETH","USDT",80,60,45,5.0,0,45800000,"",null,0.3,0],["venus-solvbtc-usdt","long","venus","SolvBTC","USDT",75,55,40,5.0,0,45800000,"",null,0.2,0],["venus-slisbnb-usdt","long","venus","slisBNB","USDT",72,52,40,5.0,0,45800000,"",0.834,0.17,1],["venus-nvdab-usdt","long","venus","NVDAB","USDT",60,40,30,5.0,0,45800000,"",null,0.3,0],["venus-tslab-usdt","long","venus","TSLAB","USDT",60,40,30,5.0,0,45800000,"",null,0.47,0],["venus-spcxb-usdt","long","venus","SPCXB","USDT",50,30,20,5.0,0,45800000,"",null,0.33,0],["venus-skhyb-usdt","long","venus","SKHYB","USDT",50,30,20,5.0,0,45800000,"",null,0.26,0],["lista-btcb-usd1","long","lista","BTCB","USD1",70.0,50,40,1.69,0,18124562,"",null,0.04,0],["venus-btcb-u","long","venus","BTCB","U",80,60,45,4.1,0,10200000,"",null,0.04,0],["venus-eth-u","long","venus","ETH","U",80,60,45,4.1,0,10200000,"",null,0.43,0],["venus-bnb-u","long","venus","BNB","U",80,60,45,4.1,0,10200000,"",null,0.06,0],["venus-wbeth-u","long","venus","wBETH","U",80,60,45,4.1,0,10200000,"",null,0.3,0],["venus-solvbtc-u","long","venus","SolvBTC","U",75,55,40,4.1,0,10200000,"",null,0.2,0],["venus-slisbnb-u","long","venus","slisBNB","U",72,52,40,4.1,0,10200000,"",0.834,0.17,1],["venus-nvdab-u","long","venus","NVDAB","U",60,40,30,4.1,0,10200000,"",null,0.3,0],["venus-tslab-u","long","venus","TSLAB","U",60,40,30,4.1,0,10200000,"",null,0.47,0],["venus-spcxb-u","long","venus","SPCXB","U",50,30,20,4.1,0,10200000,"",null,0.33,0],["venus-skhyb-u","long","venus","SKHYB","U",50,30,20,4.1,0,10200000,"",null,0.26,0],["venus-btcb-usdc","long","venus","BTCB","USDC",80,60,45,5.35,0,7900000,"",null,0.04,0],["venus-eth-usdc","long","venus","ETH","USDC",80,60,45,5.35,0,7900000,"",null,0.43,0],["venus-bnb-usdc","long","venus","BNB","USDC",80,60,45,5.35,0,7900000,"",null,0.06,0],["venus-wbeth-usdc","long","venus","wBETH","USDC",80,60,45,5.35,0,7900000,"",null,0.3,0],["venus-solvbtc-usdc","long","venus","SolvBTC","USDC",75,55,40,5.35,0,7900000,"",null,0.2,0],["venus-slisbnb-usdc","long","venus","slisBNB","USDC",72,52,40,5.35,0,7900000,"",0.834,0.17,1],["venus-nvdab-usdc","long","venus","NVDAB","USDC",60,40,30,5.35,0,7900000,"",null,0.3,0],["venus-tslab-usdc","long","venus","TSLAB","USDC",60,40,30,5.35,0,7900000,"",null,0.47,0],["venus-spcxb-usdc","long","venus","SPCXB","USDC",50,30,20,5.35,0,7900000,"",null,0.33,0],["venus-skhyb-usdc","long","venus","SKHYB","USDC",50,30,20,5.35,0,7900000,"",null,0.26,0],["lista-btcb-u","long","lista","BTCB","U",86.0,66,50,2.3,0,1893141,"",null,0.04,0],["lista-slisbnb-u","long","lista","slisBNB","U",86.0,66,50,2.28,0,1789181,"",0.834,0.17,1],["lista-btcb-usd1-fixed-term","long","lista","BTCB","USD1",86.0,66,50,1.8,0,794573,"fixed-term",null,0.04,0],["lista-spyb-usd1","long","lista","SPYB","USD1",85.0,65,50,1.49,2.44,358883,"",null,0.05,0],["lista-btcb-usdc","long","lista","BTCB","USDC",80.0,60,45,0.89,0,318961,"",null,0.04,0],["lista-btcb-usdt","long","lista","BTCB","USDT",80.0,60,45,3.5,0,215018,"",null,0.04,0],["lista-slisbnb-usd1-fixed-term","long","lista","slisBNB","USD1",86.0,66,50,2.0,0,202311,"fixed-term",0.834,0.17,1],["lista-slisbnb-usdc","long","lista","slisBNB","USDC",80.0,60,45,0.02,0,140002,"",0.834,0.17,1],["lista-slisbnb-bnb-lp-usd1-smart-lending","long","lista","slisBNB-BNB LP","USD1",75.0,55,40,1.7,0,116577,"Smart Lending",null,0.1,1],["lista-wbnb-usdc","long","lista","WBNB","USDC",80.0,60,45,0.02,0,100004,"",null,0.06,0],["lista-spyb-u","long","lista","SPYB","U",85.0,65,50,0.57,2.43,88877,"",null,0.05,0],["lista-slisbnb-usdt","long","lista","slisBNB","USDT",80.0,60,45,2.22,0,76533,"",0.834,0.17,1],["lista-crclb-u","long","lista","CRCLB","U",60.0,40,30,0.57,2.17,71226,"",null,0.63,0],["lista-crclb-usd1","long","lista","CRCLB","USD1",60.0,40,30,1.49,2.49,59907,"",null,0.63,0],["lista-sndkb-usdc","long","lista","SNDKB","USDC",50.0,30,20,0.02,0,49999,"",null,0.27,0],["lista-mub-usdc","long","lista","MUB","USDC",65.0,45,35,0.02,0,49999,"",null,9.32,0],["lista-tslab-usdc","long","lista","TSLAB","USDC",75.0,55,40,0.03,0,49978,"",null,0.47,0],["lista-qqqb-u","long","lista","QQQB","U",75.0,55,40,0.58,2.34,47776,"",null,0.01,0],["lista-qqqb-usd1","long","lista","QQQB","USD1",75.0,55,40,0.8,2.3,43755,"",null,0.01,0],["lista-googlb-u","long","lista","GOOGLB","U",70.0,50,40,0.55,7.04,38457,"",null,0.51,0],["lista-crclb-usdc","long","lista","CRCLB","USDC",60.0,40,30,0.83,2.4,25635,"",null,0.63,0],["lista-hoodb-usd1","long","lista","HOODB","USD1",60.0,40,30,0.04,0,24987,"",null,0.77,0],["lista-skhyb-usd1","long","lista","SKHYB","USD1",55.0,35,25,0.03,1.82,24783,"",null,0.26,0],["lista-hoodb-u","long","lista","HOODB","U",60.0,40,30,0.03,0,24534,"",null,0.77,0],["lista-nokb-usd1","long","lista","NOKB","USD1",60.0,40,30,0.03,0.43,23919,"",null,4.83,0],["lista-nvdab-usd1","long","lista","NVDAB","USD1",75.0,55,40,0.85,7.16,23902,"",null,0.3,0],["lista-soxlb-u","long","lista","SOXLB","U",50.0,30,20,0.19,0,23522,"",null,5.59,0],["lista-nokb-u","long","lista","NOKB","U",60.0,40,30,0.03,0.23,22938,"",null,4.83,0],["lista-metab-u","long","lista","METAB","U",70.0,50,40,0.13,0,22844,"",null,1.06,0],["lista-babab-usd1","long","lista","BABAB","USD1",65.0,45,35,0.03,0.38,22547,"",null,0.42,0],["lista-skhyb-u","long","lista","SKHYB","U",55.0,35,25,0.04,0.13,21394,"",null,0.26,0],["lista-soxlb-usd1","long","lista","SOXLB","USD1",50.0,30,20,0.04,13.84,20795,"",null,5.59,0],["lista-babab-u","long","lista","BABAB","U",65.0,45,35,0.04,0.38,20091,"",null,0.42,0],["lista-nvdab-usdc","long","lista","NVDAB","USDC",75.0,55,40,0.02,0,20000,"",null,0.3,0],["lista-wbeth-usdt","long","lista","wBETH","USDT",80.0,60,45,3.44,0,17174,"",null,0.3,0],["lista-spcxb-usdc","long","lista","SPCXB","USDC",50.0,30,20,0.92,0.43,11137,"",null,0.33,0],["lista-slisbnb-bnb-lp-usdc-smart-lending","long","lista","slisBNB-BNB LP","USDC",80.0,60,45,1.61,0,10000,"Smart Lending",null,0.1,1],["lista-tslab-usd1","long","lista","TSLAB","USD1",75.0,55,40,0.22,0.03,7546,"",null,0.47,0],["lista-mub-usd1","long","lista","MUB","USD1",65.0,45,35,0.41,1.47,6876,"",null,9.32,0],["lista-nvdab-u","long","lista","NVDAB","U",75.0,55,40,2.16,4.87,6036,"",null,0.3,0],["lista-wbeth-usd1","long","lista","wBETH","USD1",80.0,60,45,1.09,0,5875,"",null,0.3,0],["lista-tslab-u","long","lista","TSLAB","U",75.0,55,40,0.27,0.03,5738,"",null,0.47,0],["lista-msftb-usd1","long","lista","MSFTB","USD1",75.0,55,40,1.52,0.29,5581,"",null,0.56,0],["lista-slisbnb-usd1","long","lista","slisBNB","USD1",70.0,50,40,10.8,0,4865,"",0.834,0.17,1],["lista-googlb-usd1","long","lista","GOOGLB","USD1",70.0,50,40,2.28,6.7,4110,"",null,0.51,0],["lista-spcxb-u","long","lista","SPCXB","U",50.0,30,20,2.21,0.87,3872,"",null,0.33,0],["lista-tsmb-usd1","long","lista","TSMB","USD1",65.0,45,35,0.82,0.15,3117,"",null,1.11,0],["lista-tsmb-u","long","lista","TSMB","U",65.0,45,35,2.22,0.15,2598,"",null,1.11,0],["lista-bnb-usd1","long","lista","BNB","USD1",70.0,50,40,1.7,0,2417,"",null,0.06,0],["lista-eth-usd1","long","lista","ETH","USD1",70.0,50,40,1.7,0,1340,"",null,0.43,0]];
    const VNAME = { lista: "Lista", venus: "Venus", pancakeswap: "PancakeSwap" };
    PAIR_ROWS.forEach(([id, kind, venue, coll, loan, lltv, cap, def, borrow, rew, liq, sub, yld, disc, stake]) => M.push({
      id, g: groupOf(coll), a: "borrow", venue, kind: "Loop", name: `${coll} / ${loan}`, tokens: [coll, loan],
      loop: { kind, coll, loan, lltv, cap, def, borrow, rew, liq, sub, yld, stake: !!stake, max: 1 / (1 - cap / 100), dflt: 1 / (1 - def / 100) },
    }));
    const byId = Object.fromEntries(M.map((m) => [m.id, m]));
    const denomFam = (asset) => (asset === "BNB" ? "bnb" : "stable");
    // Holding the vault's own asset is not a market.
    const marketsFor = (g, a, asset) => M.filter((m) => m.g === g && m.a === a && !(a === "trade" && m.name === (asset === "BNB" ? "BNB" : "USDT")));
    const ruleMarkets = (r) => [...r.m].map((id) => byId[id]).filter(Boolean);
    const allocationCap = (r, marketId) => Math.max(0, Number(r.caps && r.caps[marketId]) || 0);
    const totalAllocation = (rules) => rules.reduce((sum, r) => sum + ruleMarkets(r).reduce((n, m) => n + allocationCap(r, m.id), 0), 0);
    const minIdleAllocation = (rules) => Math.max(0, 100 - totalAllocation(rules));
    const effLev = (m, lev) => Math.min(lev, m.loop.max);
    // Loops with the same pair exist on several venues and terms, so their full label names the venue and liquidation line.
    const label = (m) => (m.a === "borrow" ? `${m.name} · ${VNAME[m.venue]}${m.loop.sub ? " " + m.loop.sub : ""} · liq. ${m.loop.lltv}%` : m.name);
    // Risk from the markets actually allowed: any token held or owed outside the vault asset's family = High,
    // same-family loops only = Medium, otherwise Low.
    function riskOf(ms, asset) {
      if (!ms.length) return null;
      const exposed = ms.some((m) => m.tokens.some((t) => familyOf(t) !== denomFam(asset)));
      return exposed ? "High" : ms.some((m) => m.a === "borrow") ? "Medium" : "Low";
    }
    const levTxt = (x) => (Math.round(x * 10) / 10).toFixed(1) + "×";
    const pct = (n) => (n == null ? "—" : (n >= 10 ? n.toFixed(1) : n.toFixed(2)) + "%");
    const capTxt = (n) => `${Math.round((Number(n) || 0) * 10) / 10}%`;
    const usd = (n) => (n >= 1e6 ? "$" + (n / 1e6).toFixed(n >= 1e8 ? 0 : 1) + "M" : "$" + Math.round(n / 1e3) + "K");
    // Leverage x on a loop: LTV = 1 − 1/x. Liquidation comes after the collateral falls by 1 − LTV / LLTV against the loan.
    function loopRisk(m, x) {
      const L = m.loop, ltv = 1 - 1 / x, drop = Math.max(0, 1 - ltv / (L.lltv / 100)) * 100;
      if (L.kind === "corr" && L.coll === "slisBNB") return "oracle follows the staking rate, so price moves don't liquidate";
      if (L.kind === "long") return `a ${drop.toFixed(0)}% drop in ${L.coll} liquidates`;
      return `a ${drop.toFixed(1)}% depeg liquidates`;
    }
    const carry = (m, x) => (m.loop.yld == null ? null : m.loop.yld * x - m.loop.borrow * (x - 1));
    const joinAnd = (a) => (a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1]);
    const few = (names, noun) => (names.length <= 3 ? joinAnd(names) : `${names[0]}, ${names[1]} and ${names.length - 2} more ${noun}`);
    // The same collateral / loan pair can exist on several venues or terms: name it once, with a count.
    const pairNames = (ms) => {
      const n = {};
      ms.forEach((m) => (n[m.name] = (n[m.name] || 0) + 1));
      return Object.entries(n).map(([k, c]) => (c > 1 ? `${k} (${c} markets)` : k));
    };
    function rulePhrase(r) {
      const ms = ruleMarkets(r), names = ms.map((m) => `${m.name} (${capTxt(allocationCap(r, m.id))} NAV cap)`);
      if (r.a === "lend") {
        // Name the coins actually lent when there are only one or two; otherwise the family.
        const toks = [...new Set(ms.map((m) => m.tokens[0]))];
        const what = (r.g === "majors" || r.g === "stocks") && toks.length <= 2 ? joinAnd(toks) : GROUPS[r.g].noun;
        return `lend ${what} via ${few(names, "places")}`;
      }
      if (r.a === "trade") return `hold ${few(names, "tokens")}`;
      if (r.a === "lp") return `provide liquidity to ${few(names, "pools")}`;
      const pairs = ms.map((m) => `${label(m)} (${capTxt(allocationCap(r, m.id))} NAV cap)`);
      return `loop ${few(pairs, "markets")} up to <em>${levTxt(Math.max(...ms.map((m) => effLev(m, r.lev))))}</em>`;
    }
    // The one sentence depositors read. `name` must already be HTML-escaped.
    function describe(rules, name) {
      // Holding and liquidity read as one list across assets; lending and loops stay per rule.
      const parts = [], merged = {};
      rules.forEach((r) => {
        if (r.a === "trade" || r.a === "lp") {
          if (!merged[r.a]) { merged[r.a] = []; parts.push(r.a); }
          merged[r.a].push(...ruleMarkets(r).map((m) => `${m.name} (${capTxt(allocationCap(r, m.id))} NAV cap)`));
        } else parts.push(r);
      });
      const phrases = parts.map((p) => (p === "trade" ? `hold ${few(merged.trade, "tokens")}` : p === "lp" ? `provide liquidity to ${few(merged.lp, "pools")}` : rulePhrase(p)));
      return `${name} can ${joinAnd(phrases)}. <em>Nothing else.</em>`;
    }
    const maxLeverage = (rules) => Math.max(1, ...rules.filter((r) => r.a === "borrow").flatMap((r) => ruleMarkets(r).map((m) => effLev(m, r.lev))));
    return { label, GROUPS, ACTIONS, MARKETS: M, byId, BSTOCKS, VNAME, groupOf, familyOf, denomFam, marketsFor, ruleMarkets, allocationCap, totalAllocation, minIdleAllocation, effLev, riskOf, levTxt, pct, capTxt, usd, loopRisk, carry, pairNames, describe, maxLeverage };
  })();

  /* ------------------------------------------------------------------ */
  /* Vaults (simulated)                                                  */
  /* ------------------------------------------------------------------ */
  const VAULTS = [
    {
      slug: "northstar-multi", name: "Northstar Multi-Strategy", manager: "Northstar", agentId: 1611, agentVaults: 2, symbol: "avNMS", asset: "USDT", benchmark: "Venus USDT supply rate", managerType: "agent",
      rules: [{ g: "stable", a: "lend", m: ["venus-supply-usdt", "lista-vault-0x6d67"], caps: { "venus-supply-usdt": 30, "lista-vault-0x6d67": 14 } }, { g: "bnb", a: "borrow", m: ["lista-slisbnb-bnb-fixed-term"], caps: { "lista-slisbnb-bnb-fixed-term": 24 }, lev: 4.2 }, { g: "majors", a: "trade", m: ["pcs-hold-btcb"], caps: { "pcs-hold-btcb": 10 } }, { g: "stocks", a: "trade", m: ["pcs-hold-nvdab", "pcs-hold-spyb"], caps: { "pcs-hold-nvdab": 7, "pcs-hold-spyb": 7 } }],
      strategy: "Keeps a stablecoin core on Venus, runs a slisBNB loop, and rotates a sleeve of majors and bStocks.",
      runtimeDays: 96, returns: { "7D": 0.61, "30D": 2.44, "90D": 7.12, ALL: 7.9 }, maxDrawdown: { "7D": -0.42, "30D": -1.88, "90D": -3.9, ALL: -3.9 },
      tvl: 3050000, followers: 1102, status: "Live", sharePrice: 1.079, fees: { perf: 15, mgmt: 0, platform: 5 }, cap: null, exitCost: "0.1–0.9% by position",
      positions: [
        { p: "Venus", loc: "vUSDT", w: 30, by: "vToken × exchange rate", st: "Supplying · 3.34%" },
        { p: "Lista DAO", loc: "USDT lending vault", w: 14, by: "Vault shares", st: "Supplying · 2.84%" },
        { p: "Lista DAO", loc: "slisBNB / BNB · fixed-term", w: 24, by: "Staking rate × BNB − debt", st: "LTV 76.0% · 4.2×" },
        { p: "PancakeSwap", loc: "BTCB · NVDAB · SPYB", w: 24, by: "Oracle · Atlas / APRO", st: "Held" },
        { p: "Idle", loc: "USDT in vault", w: 8, by: "Balance", st: "Instant exits" },
      ],
    },
    {
      slug: "stable-yield-router", name: "Stable Yield Router", manager: "Orbit Agent", agentId: 942, agentVaults: 1, symbol: "avSYR", asset: "USDT", benchmark: "Venus USDT supply rate", managerType: "agent",
      rules: [{ g: "stable", a: "lend", m: ["venus-supply-usdt", "venus-supply-usdc"], caps: { "venus-supply-usdt": 50, "venus-supply-usdc": 40 } }],
      strategy: "Moves USDT and USDC between Venus and Lista lending as rates change.",
      runtimeDays: 128, returns: { "7D": 0.24, "30D": 1.02, "90D": 3.31, ALL: 4.76 }, maxDrawdown: { "7D": -0.03, "30D": -0.12, "90D": -0.38, ALL: -0.62 },
      tvl: 2860000, followers: 984, status: "Live", sharePrice: 1.0476, fees: { perf: 10, mgmt: 0, platform: 3 }, cap: null, exitCost: "< 0.1%",
      positions: [
        { p: "Venus", loc: "vUSDT", w: 48, by: "vToken × exchange rate", st: "Supplying · 3.34%" },
        { p: "Venus", loc: "vUSDC", w: 37, by: "vToken × exchange rate", st: "Supplying · 3.81%" },
        { p: "Idle", loc: "USDT in vault", w: 15, by: "Balance", st: "Instant exits" },
      ],
    },
    {
      slug: "bnb-bluechip-momentum", name: "Bluechip Momentum", manager: "Sable Quant", agentId: 1306, agentVaults: 3, symbol: "avBCM", asset: "USDT", benchmark: "Equal-weight BNB / BTCB / ETH", managerType: "agent",
      rules: [{ g: "bnb", a: "trade", m: ["pcs-hold-bnb"], caps: { "pcs-hold-bnb": 38 } }, { g: "majors", a: "trade", m: ["pcs-hold-btcb"], caps: { "pcs-hold-btcb": 26 } }, { g: "majors", a: "lend", m: ["venus-supply-eth"], caps: { "venus-supply-eth": 21 } }],
      strategy: "Trend-following exposure across BNB, BTCB and ETH with volatility-aware position sizing.",
      runtimeDays: 73, returns: { "7D": 2.16, "30D": 6.42, "90D": null, ALL: 13.88 }, maxDrawdown: { "7D": -1.92, "30D": -4.74, "90D": null, ALL: -8.16 },
      tvl: 2170000, followers: 803, status: "Live", sharePrice: 1.1388, fees: { perf: 15, mgmt: 0, platform: 5 }, cap: 5000000, exitCost: "< 0.5% at $100K",
      pendingChange: { what: "Add Venus · BTCB lending with a 10% NAV cap", hours: 18 },
      positions: [
        { p: "PancakeSwap", loc: "WBNB", w: 38, by: "Oracle · Chainlink / Atlas", st: "Held" },
        { p: "PancakeSwap", loc: "BTCB", w: 26, by: "Oracle · Chainlink / Atlas", st: "Held" },
        { p: "Venus", loc: "vETH", w: 21, by: "vToken × oracle", st: "Supplying · 1.36%" },
        { p: "Idle", loc: "USDT in vault", w: 15, by: "Balance", st: "Instant exits" },
      ],
    },
    {
      slug: "liquid-staking-loop", name: "Liquid Staking Loop", manager: "Kepler AI", agentId: 1422, agentVaults: 1, symbol: "avLSL", asset: "BNB", benchmark: "Hold slisBNB", managerType: "agent",
      rules: [{ g: "bnb", a: "borrow", m: ["lista-slisbnb-bnb-fixed-term"], caps: { "lista-slisbnb-bnb-fixed-term": 90 }, lev: 5 }],
      strategy: "slisBNB loop on Lista at about 4.6× with the idle buffer kept at 10%.",
      runtimeDays: 41, returns: { "7D": 0.04, "30D": 0.18, "90D": null, ALL: 0.24 }, maxDrawdown: { "7D": -0.02, "30D": -0.05, "90D": null, ALL: -0.06 },
      tvl: 1940000, followers: 677, status: "Live", sharePrice: 1.0024, fees: { perf: 10, mgmt: 0, platform: 3 }, cap: null, exitCost: "≈ 0.8% on 10 BNB",
      positions: [
        { p: "Lista DAO", loc: "slisBNB / BNB · fixed-term", w: 90, by: "Staking rate × BNB − debt", st: "LTV 78.4% · 4.6×" },
        { p: "Idle", loc: "BNB in vault", w: 10, by: "Balance", st: "Instant exits" },
      ],
    },
    {
      slug: "mag7-rotation", name: "Mag 7 Rotation", manager: "Tickerline", agentId: null, agentVaults: 2, symbol: "avM7R", asset: "USDT", benchmark: "Hold SPYB", managerType: "human",
      rules: [{ g: "stocks", a: "trade", m: ["pcs-hold-nvdab", "pcs-hold-googlb", "pcs-hold-aaplb"], caps: { "pcs-hold-nvdab": 30, "pcs-hold-googlb": 25, "pcs-hold-aaplb": 20 } }],
      strategy: "Rotates between the largest US tech names in bStocks, holding USDT when momentum fades.",
      runtimeDays: 52, returns: { "7D": 1.42, "30D": 4.91, "90D": null, ALL: 7.84 }, maxDrawdown: { "7D": -1.18, "30D": -3.96, "90D": null, ALL: -5.72 },
      tvl: 1210000, followers: 512, status: "Live", sharePrice: 1.0784, fees: { perf: 15, mgmt: 0, platform: 5 }, cap: 1500000, exitCost: "0.2–0.7% at $100K",
      positions: [
        { p: "PancakeSwap", loc: "NVDAB", w: 28, by: "Atlas · APRO · TWAP", st: "Held" },
        { p: "PancakeSwap", loc: "GOOGLB", w: 22, by: "Atlas · TWAP", st: "Held" },
        { p: "PancakeSwap", loc: "AAPLB", w: 18, by: "Atlas · TWAP", st: "Held" },
        { p: "Idle", loc: "USDT in vault", w: 32, by: "Balance", st: "Instant exits" },
      ],
    },
    {
      slug: "nvda-dca", name: "NVDA Weekly DCA", manager: "Drip Agent", agentId: 1755, agentVaults: 1, symbol: "avNDC", asset: "USDT", benchmark: "Hold SPYB", managerType: "agent",
      rules: [{ g: "stocks", a: "trade", m: ["pcs-hold-nvdab"], caps: { "pcs-hold-nvdab": 70 } }],
      strategy: "Buys NVDAB every Monday with a fixed share of idle USDT. Nothing else.",
      runtimeDays: 9, returns: { "7D": 2.08, "30D": null, "90D": null, ALL: 3.41 }, maxDrawdown: { "7D": -2.64, "30D": null, "90D": null, ALL: -2.64 },
      tvl: 184000, followers: 96, status: "Live", sharePrice: 1.0341, fees: { perf: 10, mgmt: 0, platform: 5 }, cap: null, exitCost: "≈ 0.4% at $100K",
      positions: [
        { p: "PancakeSwap", loc: "NVDAB", w: 64, by: "Atlas · APRO · TWAP", st: "Held" },
        { p: "Idle", loc: "USDT in vault", w: 36, by: "Balance", st: "Next buy Monday" },
      ],
    },
    {
      slug: "lista-rate-hopper", name: "Lista Rate Hopper", manager: "Mirror Labs", agentId: 1790, agentVaults: 4, symbol: "avLRH", asset: "USDT", benchmark: "Venus USDT supply rate", managerType: "agent",
      rules: [{ g: "stable", a: "lend", m: ["venus-supply-usdt", "venus-supply-usdc"], caps: { "venus-supply-usdt": 50, "venus-supply-usdc": 40 } }],
      strategy: "Low-fee USDT lending across Venus and Lista.",
      runtimeDays: 11, returns: { "7D": 0.21, "30D": null, "90D": null, ALL: 0.33 }, maxDrawdown: { "7D": -0.02, "30D": null, "90D": null, ALL: -0.02 },
      tvl: 420000, followers: 61, status: "Live", sharePrice: 1.0033, fees: { perf: 5, mgmt: 0, platform: 3 }, cap: null, exitCost: "< 0.1%",
      copyOf: { slug: "stable-yield-router", lag: "14 min" },
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
    return `<img class="logo ${cls}" src="${logoUrl(file)}" alt="${esc(v ? v.name : "BNB Chain")}">`;
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
      const ly0 = y(pts[pts.length - 1].v);
      ticks.filter((t) => t >= lo && t <= hi).forEach((t) => {
        g += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line-2)" stroke-width="1"/>`;
        // Skip axis labels the current-value pill would cover, and ones clipped by the top edge.
        if (Math.abs(y(t) - ly0) > 18 && y(t) > 10) g += `<text x="${W - m.r + 10}" y="${y(t) + 4}">${t.toFixed(dec)}</text>`;
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
            <span class="chain"><img class="logo" src="${logoUrl("bnbchain")}" alt="">BNB Smart Chain · 56</span>
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

  const vaultMarkets = (v) => (v.rules || []).flatMap(CATALOG.ruleMarkets);
  const vaultVenues = (v) => [...new Set(vaultMarkets(v).map((m) => m.venue))];
  const vaultRisk = (v) => CATALOG.riskOf(vaultMarkets(v), v.asset) || "Low";
  const managerLabel = (v) => (v.managerType === "human" ? `${v.manager} · Human-managed` : `${v.manager} · ERC-8004 #${v.agentId}`);
  const rulesLabel = (v) => {
    const operations = vaultMarkets(v).length;
    const allocated = CATALOG.totalAllocation(v.rules || []);
    return `${operations} operation${operations === 1 ? "" : "s"} · ${CATALOG.capTxt(allocated)} max deployed`;
  };

  window.BAV = {
    TODAY, DAY, SLOTS, ASSETS, VENUES, VAULTS, CATALOG, vaultMarkets, vaultVenues, vaultRisk, managerLabel, rulesLabel,
    platformFeeForRisk, feeBreakdown,
    $, $$, esc, fmt, perf, periodDays, historyTag, riskMeter, statusTag,
    rng, hexAddr, short, navSeries, sparkline, lineChart, logo, agentCanvas, stackTables,
    shell, footerHTML, wireShell, toast, SEAL, route, DEMO_OWNER, demo,
    vault: (slug) => VAULTS.find((v) => v.slug === slug),
  };
})();
