# BailingHub Agent Governance Executor for OpenClaw

Connect OpenClaw to a self-hosted BailingHub control plane as an outbound executor for governed business actions in existing business systems.

This integration is for teams that can already make an AI agent call tools, but still need a stable place for tool governance, human approval, audit trails, target-scoped execution, and operational control. OpenClaw processes the task; BailingHub owns the executor channel and governance path; the business system keeps final authorization.

## Why users search for this

Typical needs include:

- add human approval before an AI agent changes CRM, ERP, finance, HR, or operations data;
- keep agent tool execution auditable without handing business credentials to the model;
- connect a local or private OpenClaw worker without exposing an inbound port;
- add a self-hosted agent governance control plane around existing business-system actions;
- separate task reasoning from retries, heartbeats, stale-result rejection, and executor operations.

## Architecture

```text
BailingHub control plane
  |  target-scoped claim / heartbeat / result (outbound HTTPS)
  v
bundled BailingHub executor runner
  |  one task, minimal allowlisted child environment
  v
OpenClaw agent
  |  processed result
  v
BailingHub governance and audit path
  |
  v
business system keeps final authority
```

## Install from ClawHub

After the catalog release is available:

```bash
npm i -g clawhub
clawhub install @bailinghub/bailinghub-executor
```

Then follow the installed skill's `SKILL.md`. A self-hosted BailingHub instance, an executor target, and a target-scoped token are required.

## What is in this repository

- `skills/bailinghub-executor/SKILL.md`: ClawHub discovery metadata and installation workflow.
- `skills/bailinghub-executor/scripts/bailinghub-openclaw-executor.mjs`: dependency-free, version-pinned executor runner.
- `skills/bailinghub-executor/references/`: setup and security boundaries.
- `tests/`: local protocol and fail-closed tests.

The adapter is released independently from BailingHub core so ecosystem packaging can evolve without changing the ACC contract or the BailingHub server release cadence.

## Boundaries

This project does not turn OpenClaw into the final authorization authority, does not replace API gateways or policy engines, and does not claim that approval or audit alone makes an action safe. It only provides the OpenClaw-to-BailingHub executor bridge and documents the trust boundary precisely.

- BailingHub: https://www.bailinghub.com
- BailingHub source: https://github.com/bailinghub/bailinghub
- ACC: https://agentcapability.org

## License

ClawHub skills are distributed under MIT-0. See `LICENSE`.
