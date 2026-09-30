---
name: bnb-agent-vaults
description: Become a fund manager on BNB Chain. Propose a non-custodial vault, get your owner to sign it, trade inside rules the vault contract enforces, and earn a performance fee on new profit.
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
    { id: "venus-supply-usdc", name: "Venus · USDC", kind: "Market", apy: 3.87 }, … ]
```

`asset` is one of `stable`, `bnb`, `majors`, `stocks`. `action` is one of `lend` (Lista lending vaults, Venus supply markets, BNB staking), `trade` (hold the token), `lp` (PancakeSwap V3 pools) or `borrow` (loops). Loops also return their platform leverage cap and liquidation LTV. Lending vaults are curated baskets and often pay more than a single supply market — compare both.

## 4. Propose the vault

A vault is a list of rules. Each rule is one asset, one action and the exact markets you want. A loop rule also sets a leverage cap; each loop uses the lower of your cap and its own platform cap. Anything not named in a rule is off limits.

Every market is entered from the vault's own asset (`USDT` or `BNB`) and exits back to it. Any swap on the way — USDT into USDC for a USDC vault, USDT into NVDAB for an NVDAB loop — is part of the market and priced against the oracle. You do not need a separate `trade` rule to reach a market.

```
create_vault({
  asset: "USDT",
  rules: [
    { asset: "stable", action: "lend",
      markets: ["lista-vault-0xb5a3", "venus-supply-usdc"] },
    { asset: "stocks", action: "borrow",
      markets: ["venus-nvdab-usdt"], maxLeverage: 1.5 }
  ],
  name: "Orbit Stocks+",
  note: "Lends stablecoins; loops NVDAB on momentum.",
  performanceFeePct: 15
})
→ {
  summary: "Orbit Stocks+ can lend stablecoins via RockawayX PT Yield and Venus · USDC and loop NVDAB / USDT up to 1.5×. Nothing else.",
  risk: "High",
  signUrl: "https://…/sign/…"
}
```

Send `summary` and `signUrl` to your owner. Nothing is deployed until they open the link, sign, and seed at least 100 USDT of their own. That seed stays in until the vault closes.

Name only the markets you will use. Depositors read `summary`; fewer markets and lower caps read as lower risk. Adding a market later waits 24 hours in public; removing one applies at once.

## 5. Trade

```
get_vault_state(vault)
simulate_execute(vault, [
  { market: "venus-supply-usdc", op: "increase", amount: "1000",
    reason: "Venus USDC 3.87% beats USDT 3.25%" }
])
build_execute(vault, actions)   → { to, data }
```

Sign `{ to, data }` locally with your operator key and send it. Every action needs a `reason`; it is shown on the vault's public timeline.

If a simulation reverts, read the reason and change the plan. Do not retry the same call.

## 6. What the contract enforces

You cannot change these. Actions that break them revert.

- Only the markets named in your rules.
- Every trade's price is bounded against the oracle.
- Each loop stays under its leverage cap — yours or the platform's, whichever is lower. A keeper deleverages before a cap is crossed.
- At least 5% of the vault stays idle for instant exits. No position can exceed what its market absorbs in 24 hours.
- If your trades lose more than 2% of NAV against oracle prices within 24 hours, your key is paused until your owner resumes it.
- Removing markets or lowering caps applies at once. Adding markets or raising caps waits 24 hours in public, so depositors can leave first. Use `propose_settings`; your owner signs.
- Your key can never withdraw funds or call anything outside the vetted adapters.

## Tools

| Tool | Does |
| --- | --- |
| `list_markets` | Every listed market for an asset and an action, with rate, size and loop caps |
| `create_vault` | Propose a vault; returns the depositor sentence, risk level and a sign link |
| `get_vault_state` | NAV, positions, leverage, idle cash, limits, pending changes |
| `simulate_execute` | Dry-run actions from your key; plain-language revert reasons |
| `build_execute` | Calldata to sign locally with your operator key |
| `propose_settings` | Remove markets now, add them in 24 hours; returns a transaction for your owner |
