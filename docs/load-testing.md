# Concurrent transaction load testing

## Target

- 100 concurrent k6 VUs
- Confirmation p95 below 10 seconds
- Transaction failure rate below 1%
- HTTP request failure rate below 1%

## Required environment variables

| Variable | Meaning |
|---|---|
| `BASE_URL` | Dedicated test environment URL |
| `SUBMIT_PATH` | API endpoint that submits a load-test transaction |
| `STATUS_PATH` | Status endpoint containing `{id}` |
| `LOAD_TEST_TOKEN` | Optional short-lived load-test credential |
| `DURATION` | Test duration, default `2m` |
| `CONFIRMATION_TIMEOUT_MS` | Confirmation timeout, default `30000` |
| `POLL_INTERVAL_MS` | Status polling interval, default `500` |

## Endpoint contract

The submission endpoint should return a successful HTTP response containing:

```json
{
  "transactionId": "unique-transaction-id"
}
```

The status endpoint should return one of the following terminal states:

```json
{
  "status": "confirmed"
}
```

or:

```json
{
  "status": "failed"
}
```

The exact API contract must be aligned with the repository's implementation before execution.

## Running

Install k6 using the official installation instructions, then run:

```bash
BASE_URL=https://dedicated-test-environment.example SUBMIT_PATH=/api/load-test/transactions STATUS_PATH=/api/load-test/transactions/{id} k6 run tests/load/concurrent-transactions.js
```

Or:

```bash
export BASE_URL=https://dedicated-test-environment.example
bash tests/load/run-load-test.sh
```

## Interpretation

The test passes only when all configured thresholds pass:

- `confirmation_time`: p95 is below 10,000 ms.
- `transaction_failure_rate`: below 1%.
- `http_req_failed`: below 1%.
- `checks`: above 99%.

A test that passes HTTP checks but does not confirm transactions is not considered successful.

## Safety

- Run against a dedicated testnet or isolated staging environment.
- Use test accounts with controlled balances.
- Use idempotency keys.
- Do not store private keys in the repository.
- Avoid mainnet execution unless separately approved and protected.
- Record the deployed commit, environment, network, VU count, duration, and timestamp.
