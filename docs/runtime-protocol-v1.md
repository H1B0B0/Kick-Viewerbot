# Runtime Protocol v1

This document is the normative lifecycle, Socket.IO, telemetry, readiness, origin,
identity, and version contract for **Kick ViewerBot**. The machine-readable source is
`contracts/runtime-v1.schema.json`; canonical examples are under `contracts/fixtures/`.
Protocol compatibility requires exact major version `1`.

## Lifecycle

`BotState` is exactly `unavailable | stopped | starting | running | stopping | error`.

- Initial state is `unavailable` when runtime imports fail, otherwise `stopped`.
- `stopped -> starting` occurs while holding one manager lock.
- `starting -> running` occurs only after bot preflight and the worker-pool readiness callback.
- `starting | running -> stopping` occurs on stop.
- `stopping -> stopped` occurs only after the generation thread and all owned workers terminate.
- Any startup, worker, or shutdown failure transitions to `error`.
- Restart is allowed from `stopped`, and from `error` only when
  `ErrorPayload.generation_alive` is false.
- Restart is rejected from `unavailable`, and for timeout/error conditions while a
  generation remains alive.
- Stopping an already stopped manager returns an idempotent successful `stop_bot` ack.

## Commands and acknowledgements

The client emits four Socket.IO commands: `start_bot`, `stop_bot`, `get_stats`, and
`ping`. Every request contains `protocol_version: 1` and a client-generated UUID
`command_id`, unique for the sidecar lifetime.

- `start_bot`: adds `config: RuntimeConfig` and
  `proxy_file: {name: string, base64: string} | null`.
- `stop_bot`: adds `generation_id: string | null`.
- `get_stats`: adds no fields.
- `ping`: adds `client_timestamp_ms: number`.

Every ack arrives within five seconds and contains `protocol_version: 1`, the same
`command_id`, `ok: boolean`, `state: BotState`, and `error: ErrorPayload | null`.

- `start_bot` ack adds `accepted: boolean` and `generation_id: string | null`.
- `stop_bot` ack adds `generation_id: string | null` and `terminated: boolean`.
- `get_stats` ack adds `stats: StatsEnvelope`.
- `ping` ack adds `client_timestamp_ms` and `server_timestamp_ms`.

A duplicate `command_id` returns the cached prior ack and never repeats the action.
Acks correlate only by UUID and do not consume event sequence values.

## RuntimeConfig

`RuntimeConfig` is exactly:

```text
{
  channel_name: string,
  threads: integer 1..1000,
  timeout_ms: integer 1000..60000,
  proxy_type: "http" | "socks4" | "socks5",
  stability_mode: boolean,
  subscription_status: string
}
```

`channel_name` is normalized before crossing this boundary and is non-empty.

## Server events and compatibility aliases

Canonical server events are:

- `service_ready`: payload is `Readiness`.
- `bot_state`: `{protocol_version, sequence, timestamp_ms, generation_id, state,
  restart_allowed, error}`.
- `stats_update`: payload is `StatsEnvelope`.
- `bot_error`: `{protocol_version, sequence, timestamp_ms, generation_id, error}`.
- `pong`: the `ping` ack without `ok`, `state`, or `error`.

For one release only, legacy names retain the canonical payload unchanged:

- `connected` aliases `service_ready`.
- `bot_started`, `bot_stopped`, and `bot_status_changed` alias `bot_state`.

After that compatibility release the four aliases are removed. All seven current
server event names are therefore classified as retained: three canonical names
(`stats_update`, `bot_error`, `pong`) and four one-release aliases. No current event
is silently unclassified or immediately removed.

## ErrorPayload

`ErrorPayload` is exactly `{code: string, message: string, retryable: boolean,
generation_alive: boolean}`. Restart decisions use `generation_alive`; message text
is informational and is not a state discriminator.

## StatsEnvelope and sequencing

`StatsEnvelope` is exactly the schema-defined object containing protocol/version,
sequence/time/generation, lifecycle/restart, channel/mode, metrics, config, status,
and error fields. Counts are non-negative integers. CPU and memory percentages and
both progress values are in `0..100`. Network rates are MiB/s. Timestamps are Unix
epoch milliseconds.

`active_connections` is `number | null`. In standard mode it is always `null`, never
zero used as a stand-in for viewers. The interface must call local metrics
connections, threads, requests, and bandwidth—not viewers.

`sequence` is an unsigned, monotonically increasing sidecar-lifetime counter. A
client ignores lower or equal event sequences unless it has first validated a new
`instance_nonce` from `service_ready`. Command acknowledgements do not consume
sequence values.

## Readiness

`Readiness` is exactly:

```text
{
  protocol_version: 1,
  instance_nonce: string,
  port: integer,
  pid: integer,
  lifecycle_state: "stopped",
  ready: true
}
```

The protocol major must equal `1`, and `pid` must equal the spawned child PID. A
nonce, PID, protocol, lifecycle, or readiness mismatch rejects readiness.

## Product identity, targets, origins, and version propagation

- Product: `Kick ViewerBot`.
- Identifier: `com.velbots.kickviewerbot`.
- Targets: `aarch64-apple-darwin`, `x86_64-apple-darwin`,
  `x86_64-pc-windows-msvc`.
- macOS production origin: `tauri://localhost`.
- Windows production origin: `http://tauri.localhost`.
- Browser development origin only: `http://localhost:3000`.

`frontend/src-tauri/tauri.conf.json` is the canonical version source. The frontend
reads Tauri `getVersion()`. Python receives `--app-version`. CI verifies Cargo,
package, and Python metadata against the canonical Tauri version.
