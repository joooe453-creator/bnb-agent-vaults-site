# BNB Agent Vaults — Phase 1

Use this integration to design and validate a phase-one basket vault on BNB Smart Chain. This endpoint does not
deploy a vault or submit transactions.

## Product boundary

A vault has exactly one buying plan:

1. `lump-sum`: buy the declared bStock/crypto basket once for each settled contribution batch.
2. `accumulate`: buy fixed tranches on a schedule, after a basket drawdown, or when either trigger fires.

Post-purchase handling is optional for every target:

- `hold`: retain the purchased token in the vault.
- `yield-market`: deposit only into the exact compatible Aave, Venus, or Lista market returned by
  `list_phase1_markets`.

Do not invent token, pool, vToken, Aave provider/aToken, or Lista vault addresses. If the registry has no yield market for a target, use
`hold`. Borrowing, leverage, loops, LP positions, arbitrary calls, and stablecoin yield rotation are outside phase one.

## Safe workflow

1. Call `list_phase1_markets` immediately before building a manifest.
2. Select 1–10 targets and make integer `weightBps` total exactly `10000`.
3. Copy each target's token address, PancakeSwap V3 pool, and fee exactly from the registry.
4. Add a yield market only when its `targetId` equals the selected target's id. Set
   `revalidateBeforeEveryDeposit: true` and `fallback: "hold"`.
5. Use `build_vault_manifest` to inspect the current schema and fixed limits.
6. Call `validate_vault_manifest`. Do not present a vault as deployable unless every check passes and a BSC fork
   dry-run has passed.

## Accumulation and rebalancing semantics

- `trancheBps` is 1–25% of available cash.
- A schedule declares its cadence, future start date/time, IANA time zone and end condition. Supported intervals are
  up to 365 days, 52 weeks, or 12 months.
- Missed and failed scheduled orders are skipped without catch-up; edits apply from the next cycle.
- Calendar schedules preserve local clock time across daylight-saving changes and use the last valid day in short months.
- Drawdown is 1–30% and is measured from `last-executed-basket-index`.
- Schedule and drawdown triggers share a minimum 24-hour cooldown. If both fire, execute only one tranche.
- A failed purchase does not move the basket reference or consume the cooldown.
- Total deployment is capped at 95%, leaving at least 5% idle.
- Rebalancing is optional and cashflow-only by default. It requires an absolute weight-drift floor, a 24-hour
  cooldown, an event turnover cap, a minimum trade, and preflight of every leg.
- Full buy/sell rebalancing is unavailable while any target is deposited in an Aave, Venus, or Lista destination.
- A portfolio drawdown control may pause new automated orders, but never auto-liquidates and requires manual resume.

## Market checks

Registry inclusion is not proof that a future deposit will succeed. Before every Venus deposit, verify the exact
underlying, comptroller, listing state, mint pause and supply-cap headroom. Before every Lista/ERC-4626 deposit,
verify the exact `asset()`, `maxDeposit` and `previewDeposit`. Before every Aave deposit, verify the official provider,
exact aToken, reserve active/frozen/paused flags and supply-cap headroom. If a check fails, keep the purchased asset
in the vault; never silently route it to a different market.

## MCP tools

| Tool | Purpose |
| --- | --- |
| `list_phase1_markets` | Exact buy targets, PancakeSwap pools and compatible Aave/Venus/Lista markets |
| `build_vault_manifest` | Current schema, required fields and fixed risk rules |
| `validate_vault_manifest` | Deterministic manifest validation; does not submit a transaction |
| `list_integrations` | Integration and tracking metadata |
| `get_protocol_operations` | Read-only protocol capability details |

The contracts and site are an unaudited prototype and are not deployed to mainnet. Do not describe simulated
performance as actual returns or imply that a market's future yield or capacity is guaranteed.
