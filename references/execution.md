# Continuous mandate execution

MCP is the site's `/mcp` route. This repository contains the implementation; publishing/hosting it is a separate release.
`get_execution_deployment` returns deployment@1.0 and the actual schema templates. Default record is undeployed on chain97.

## Mandate

Required: `schema: bnb-agent-vaults/mandate@1.0`, `chainId`, `creator`, separate `agent`, `performanceFeeBps`, full `template`,
`arbitraryCalls: false`, `minIdleBps: 500`, `ruleChangeDelaySeconds: 86400`, `seedLockSeconds: 7776000`, `dailyLossBps: 200`.
Copy the exact template from deployment discovery. Its `caps` length equals `legs.length`, sum <=9500. Its config hash is
`keccak256(abi.encode(asset, route, legs))`; caps and fees are separate vault-level terms read from the created vault.
Kinds: `0` hold, `1` Venus, `2` Lista ERC-4626, `3` Aave. Venus provider is its exact comptroller; Aave provider is its exact
PoolAddressesProvider; Lista and hold provider are zero. Swap routes are direct accounting-asset/target V3 pools.

## Tools

`prepare_mandate_creation`: `{account, templateId, name, symbol, agent, performanceFeeBps, capBps: number[],
minSeedShares: raw string, deadline: Unix seconds}`. The factory has its own deadline and caller-bound creator. Seed shares
are minimum output; normal first seed is `100 * 10^(assetDecimals+3)` (decimals offset3).
`simulate_mandate_creation` takes the same fields and returns `{plan, simulation}` after the seed allowance exists.
This gives agent creators a simulation tool for the exact creation call as well as ordinary vault actions.

`prepare_vault_action` and `simulate_vault_action` share these common fields:
`{action, vault, account, deadline}`. Recipients and redemption owner are fixed to `account` by the builder.

| Action | Additional arguments | Contract call |
| --- | --- | --- |
| deposit | assets, minShares | depositWithMin |
| redeem | shares, minAssets | redeemWithMin |
| redeem-in-kind | shares | redeemInKind |
| execute | leg, assets, minTokenOut, minReceipt | deploy |
| unwind | leg, fractionBps (1..10000), minAssets | unwind |
| risk-check | none | checkRisk |

Amounts are canonical base10 raw-unit uint256 strings; `minReceipt` may be zero because the adapter enforces its own
receipt minimum, while user cash/swap/share minimums must be positive. Deadlines must be within the next hour.
In-kind redemption has no price minimum, because it distributes receipt inventories rather than quoting cash.
Preparation never proves solvency or execution success. Approvals, `eth_call`, gas estimation, final wallet review, transaction
receipt status, and events are distinct steps. No MCP tool stores keys, signs, broadcasts, or grants arbitrary-call permissions.

The SDK reconstructs a canonical plan before simulation and rejects altered chain/value/calldata/recipient/approval fields.
`execute` simulation decodes the bool into `executed` / `executionBlocked` / `wouldPause`; `risk-check` returns
`wouldBePaused`. All simulated results have `statePersisted:false`. After a status1 receipt, use `minedExecutionOutcome`
to match the selected vault, leg and amount, or its `ExecutionBlocked` / `RiskCheckpoint` event. Do not infer a trade or
durable pause from a hash or an `eth_call`. `get_vault_state` returns same-block raw cash and token/receipt inventories,
per-leg marked values when readable, caps, fee recipients, fixed90/10 fee split and pending rule changes.

New factory-created vaults can be enrolled from a `?vault=address` URL after factory membership and immutable template
checks; the UI replaces example terms with current chain state. Chain97 requires separately verified testnet templates.
Chain56 templates under config/*.bsc.json are only for isolated mainnet fork tests and later reviewed configuration.

## Protocol provenance and receipt reconciliation

The server exposes14 tools:9 continuous discovery/validation/preparation/simulation/health/receipt tools and5 historical
reference tools. `get_execution_health` reports a canonical block, RPC `finalized` head, factory approvals and dependency
drift. Per-action simulation is still required; health alone does not prove market liquidity or valid NAV.

Deployment `provenance@1.0` pins runtime hashes, EIP1967 implementation/admin/beacon slots, captured implementation,
Chainlink aggregator, Aave Pool/DataProvider, Pancake LM hook and full Venus `facets()` address/selector mapping.
Source-reviewed embedded libraries enter `reviewedDependencies`; this metadata does not widen the onchain configHash.
Real Lista legs additionally require `lista-risk@1.0`: downstream Moolah market IDs/parameters, queues/caps, admission,
fee and role/timelock witnesses. Changing these or losing a required reader disables create/deposit/execute simulation.
Never refresh the baseline automatically in response to drift. Record new versions only after release review.

This offchain gate can be bypassed by direct contract calls and is not a protocol upgrade veto. It does not prove every
custom dispatch target, oracle honesty or solvency. Exit/risk-check simulation is allowed independently; external protocol
pauses or transfer restrictions may still prevent receipt exits. `sandboxMocks:true` is explicitly limited to97/31337 and
has no real-Lista downstream guarantee.

After wallet broadcast call `verify_operation_receipt` with `{plan: theOriginalUnsignedPlan, hash: transactionHash}`.
It compares transaction chain/from/to/data/value, unique action event/recipient/amount/minimum and canonical block hash.
It distinguishes unknown/pending/orphaned/reverted/mined/finalized. `ExecutionBlocked` must not be recorded as a trade.
The RPC must provide a canonical `finalized` header; unsupported finality does not become a fixed confirmation count.
Cash/share event facts are raw strings, and gas cost is separate native wei. The plan deadline may have passed by the time
the receipt is queried. `operationId` fingerprints intent, omits wallet nonce, and does not enforce exactly-once execution.
Persist nonce/hash/replacement evidence externally; a timeout or missing RPC transaction never causes automatic resubmission.
