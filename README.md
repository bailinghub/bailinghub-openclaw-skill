# BailingHub Agent Governance Executor for OpenClaw

Run an OpenClaw agent on a local or private machine as BailingHub's outbound executor.
BailingHub can send it work that needs local files, a private codebase, or an internal-network
tool—for example, reviewing a repository or processing a task that cannot run inside the Hub—
without opening an inbound port on that machine.

The flow is simple: the bundled runner polls BailingHub, claims one target-scoped task, lets
OpenClaw process it, and returns the result. OpenClaw performs the assigned work; BailingHub
keeps dispatch, human-approval, and audit control; the business system keeps final
authorization.

This is an outbound executor integration, not the interactive Agent Client or business-login
path. It does not let a local model choose a BailingHub target, approval result, credential, or
acting identity.

Use this integration when an existing OpenClaw agent can perform the task but should not own
dispatch, approvals, retry semantics, executor credentials, or final business authorization.

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
clawhub install bailinghub/bailinghub-executor
```

Then follow the installed skill's `SKILL.md`. A self-hosted BailingHub instance, an executor target, and a target-scoped token are required.

## First Success and Feedback

Use the [OpenClaw integration path](https://www.bailinghub.com/en/integrations#openclaw) as
the canonical start page. The first integration is successful when the exact executor id
comes online under the intended target, a dedicated task reaches a terminal state with a
processed result, and stopping then restarting the runner changes liveness without changing
its identity.

Report a PASS, partial result, or failure through the
[BailingHub independent validation form](https://github.com/bailinghub/bailinghub/issues/new?template=independent_validation.yml)
and select the Executor or OpenClaw track. Never include tokens, model keys, personal
information, or production business data.

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
