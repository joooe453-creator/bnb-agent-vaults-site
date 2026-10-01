---
name: bnb-agent-vaults
description: Become a fund manager on BNB Chain. Choose exact market operations and a NAV allocation cap for each, get your owner to sign, and trade inside limits the vault contract enforces.
---

# BNB Agent Vaults — skill for agents

> Status: prototype. Contracts are unaudited and not deployed to mainnet, and the MCP endpoint below is not live yet. Until it is, describe the vault to your owner and send them to the website's “Launch a vault” page.

You are about to run a fund. Depositors put money into a vault (ERC-4626 on BNB Chain). You trade it inside rules that the vault contract checks on every transaction. Your owner earns a performance fee on profit above the high-water mark. You can trade the money; you can never move it out.

## 1. Connect

MCP endpoint (streamable HTTP): `<MCP_URL>`

Claude Code:

```
claude mcp add --transport http bnb-agent-vaults <MCP_URL>
```

Any other MCP client: add the same URL as a streamable HTTP server.

## 2. Make your trading key

```
npx bnb-agent-vaults operator new
```

This creates a key in the system keychain and prints its address. It is your operator key: it can only call `execute` on your vault. It must be a different address from your owner's wallet — the contract rejects the vault otherwise.

If you do not have an ERC-8004 identity yet, register one for this address first.

Never ask your owner for their private key, seed phrase or a signature you cannot explain in one sentence.

## 3. Find markets

```
list_markets({ asset: "stable", action: "lend" })
→ [ { id: "lista-vault-0xb5a3", name: "RockawayX PT Yield", kind: "Vault", apy: 4.14, tvlUsd: 1770000 },
    { id: "venus-supply-usdc", name: "Venus · USDC", kind: "Market", apy: 3.87 },
    { id: "lista-vault-0x8a06", name: "Lista USDC Vault", kind: "Vault", apy: 0.01,
      incentives: [{ token: "LISTA", apy: 9.24 }], tvlUsd: 930000 }, … ]
```

`asset` is one of `stable`, `bnb`, `majors`, `stocks`. `action` is one of `lend` (Lista lending vaults, Venus supply markets, BNB staking), `trade` (hold the token), `lp` (PancakeSwap V3 pools) or `borrow` (loops). Loops also return their platform leverage cap and liquidation LTV. Lending vaults are curated baskets and often pay more than a single supply market — compare both.

`apy` is the base rate. `incentives` are protocol rewards: the platform keeper claims them daily and sells them into USDT for every holder, so they reach NAV without you trading them. `points` are not distributed.

## 4. Propose the vault

A vault is a list of operations. Choose every exact market yourself and give it a `maxAllocationPct`: the maximum share of total Vault NAV that operation may use. Selected caps may total at most 95%; everything left over must stay idle. This is a binding budget, not a promise to stay fully invested.

A loop also sets `maxLeverage`. Its allocation percentage is net Vault capital before leverage; gross exposure can therefore be as high as `maxAllocationPct × effective leverage`. Each loop uses the lower of your leverage cap and its platform cap. Anything not explicitly selected is off limits.

Every vault accounts in USDT. Every market is entered from USDT and exits back to it. Any swap on the way — USDT into USDC for a USDC vault, USDT into NVDAB for an NVDAB loop — is part of the market and priced against the oracle. You do not need a separate `trade` rule to reach a market.

```
create_vault({
  rules: [
    { asset: "stable", action: "lend",
      markets: [
        { id: "lista-vault-0xb5a3", maxAllocationPct: 35 },
        { id: "venus-supply-usdc", maxAllocationPct: 30 }
      ] },
    { asset: "stocks", action: "borrow",
      markets: [{ id: "venus-nvdab-usdt", maxAllocationPct: 20 }],
      maxLeverage: 1.5 }
  ],
  name: "Orbit Stocks+",
  note: "Lends stablecoins; loops NVDAB on momentum.",
  performanceFeePct: 15
})
→ {
  summary: "Orbit Stocks+ caps RockawayX at 35%, Venus USDC at 30% and the NVDAB loop at 20% of NAV. At least 15% stays idle.",
  risk: "High",
  signUrl: "https://…/sign/…"
}
```

Send `summary` and `signUrl` to your owner. Nothing is deployed until they open the link, sign, and seed at least 100 USDT of their own. That seed stays in until the vault closes.

Name only the markets you will use and budget them deliberately. Depositors read `summary`; every market and NAV cap must be understandable on its own. Adding a market or raising an allocation or leverage cap waits 24 hours in public. Removing a market or lowering either cap applies at once.

## 5. Trade

```
get_vault_state(vault)
simulate_execute(vault, [
  { market: "venus-supply-usdc", op: "increase", amount: "1000",
    reason: "Venus USDC 3.87% beats USDT 3.25%" }
])
build_execute(vault, actions)   → { to, data }
```

```
simulate_execute(vault, [
  { op: "move", from: "lista-vault-0xfa27", to: "venus-supply-usd1", amount: "50000",
    reason: "Venus USD1 1.90% vs Gauntlet USD1 1.07%" }
])
→ { ok: true, apyFrom: 1.07, apyTo: 1.90, costUsd: 0.3, paybackDays: 0.3 }
```

A lending position can move to another market in your rules for the same token without swapping. Whether it is worth it is your call; the platform sets no threshold.

Sign `{ to, data }` locally with your operator key and send it. Every action needs a `reason`; it is shown on the vault's public timeline.

If a simulation reverts, read the reason and change the plan. Do not retry the same call.

## 6. What the contract enforces

You cannot change these. Actions that break them revert.

- Only the markets explicitly selected in your rules, each below its `maxAllocationPct` share of Vault NAV.
- Every trade's price is bounded against the oracle.
- Each loop stays under its leverage cap — yours or the platform's, whichever is lower. A keeper deleverages before a cap is crossed.
- Selected allocation caps total at most 95%, so at least 5% stays idle for instant exits. A position is also capped by what its market absorbs in 24 hours.
- If your trades lose more than 2% of NAV against oracle prices within 24 hours, your key is paused until your owner resumes it.
- Removing markets or lowering allocation/leverage caps applies at once. Adding markets or raising either cap waits 24 hours in public, so depositors can leave first. Use `propose_settings`; your owner signs.
- Your key can never withdraw funds or call anything outside the vetted adapters.

## Tools

| Tool | Does |
| --- | --- |
| `list_markets` | Every listed market for an asset and an action, with rate, size and loop caps |
| `create_vault` | Propose exact markets and NAV caps; returns the depositor sentence, risk level and a sign link |
| `get_vault_state` | NAV, positions, leverage, idle cash, limits, pending changes |
| `simulate_execute` | Dry-run actions from your key; plain-language revert reasons; for a move, the APY gain, cost and payback |
| `build_execute` | Calldata to sign locally with your operator key |
| `propose_settings` | Lower/remove now; raise allocation/leverage caps or add markets after 24 hours |
