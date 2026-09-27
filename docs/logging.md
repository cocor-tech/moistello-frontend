# Application logging

Application code uses the shared `logger` from `src/lib/logger.ts` instead of writing directly to the browser or server console.

## Levels

- `debug`: development diagnostics; disabled when `NODE_ENV=production`, even if configured otherwise.
- `info`: lifecycle events such as a successful Redis connection.
- `warn`: recoverable failures and fallbacks.
- `error`: failed user, API, authentication, or wallet operations.

Set `LOG_LEVEL` for server processes or `NEXT_PUBLIC_LOG_LEVEL` for browser builds. Production defaults to `info`.

## Transport and aggregation

Browser events are redacted, grouped by a stable level/message fingerprint, counted with `occurrences`, and sent in bounded batches to `/api/logs` (or `NEXT_PUBLIC_LOGS_ENDPOINT`). The ingestion route validates the payload, redacts context again, re-applies the configured minimum level, rate-limits by forwarded client address, and writes newline-delimited JSON to stdout/stderr for the platform log collector. Failed HTTP requests are requeued.

Do not log passwords, cookies, authorization headers, passkey challenges, nonces, signatures, private keys, OTPs, or raw API responses. The logger masks common secret field names, email addresses, Stellar/EVM addresses, bearer tokens, JWTs, and six-digit OTPs, but callers must still pass only safe context.

Server processes should collect stdout and stderr through the deployment logging pipeline (the existing systemd deployment writes both streams to log files).
