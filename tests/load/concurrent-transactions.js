import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:1110";
const SUBMIT_PATH = __ENV.SUBMIT_PATH || "/api/load-test/transactions";
const STATUS_PATH = __ENV.STATUS_PATH || "/api/load-test/transactions/{id}";
const LOAD_TEST_TOKEN = __ENV.LOAD_TEST_TOKEN || "";

const CONFIRMATION_TIMEOUT_MS = Number(
  __ENV.CONFIRMATION_TIMEOUT_MS || 30000,
);
const POLL_INTERVAL_MS = Number(__ENV.POLL_INTERVAL_MS || 500);
const MAX_POLL_ATTEMPTS = Math.ceil(
  CONFIRMATION_TIMEOUT_MS / POLL_INTERVAL_MS,
);

export const options = {
  scenarios: {
    concurrent_contributors: {
      executor: "constant-vus",
      vus: 100,
      duration: __ENV.DURATION || "2m",
      gracefulStop: "30s",
    },
  },
  thresholds: {
    confirmation_time: ["p(95)<10000"],
    transaction_failure_rate: ["rate<0.01"],
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
  },
};

const confirmationTime = new Trend("confirmation_time", true);
const transactionFailures = new Rate("transaction_failure_rate");
const confirmationTimeouts = new Counter("confirmation_timeouts");

function headers() {
  const result = {
    "Content-Type": "application/json",
    "X-Load-Test": "v2-be-360",
  };

  if (LOAD_TEST_TOKEN) {
    result.Authorization = `Bearer ${LOAD_TEST_TOKEN}`;
  }

  return result;
}

function submitTransaction() {
  const payload = JSON.stringify({
    contributorId: `k6-vu-${__VU}`,
    iteration: __ITER,
    idempotencyKey: `k6-v2-be-360-${__VU}-${__ITER}`,
    mode: "load-test",
  });

  return http.post(`${BASE_URL}${SUBMIT_PATH}`, payload, {
    headers: headers(),
    tags: { operation: "submit_transaction" },
  });
}

function getStatusUrl(transactionId) {
  return `${BASE_URL}${STATUS_PATH.replace(
    "{id}",
    encodeURIComponent(transactionId),
  )}`;
}

function waitForConfirmation(transactionId) {
  const startedAt = Date.now();

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    const response = http.get(getStatusUrl(transactionId), {
      headers: headers(),
      tags: { operation: "transaction_status" },
    });

    if (response.status >= 200 && response.status < 300) {
      let body;

      try {
        body = response.json();
      } catch (_) {
        body = null;
      }

      if (body?.status === "confirmed") {
        confirmationTime.add(Date.now() - startedAt);
        transactionFailures.add(false);
        return true;
      }

      if (body?.status === "failed" || body?.status === "rejected") {
        transactionFailures.add(true);
        return false;
      }
    }

    sleep(POLL_INTERVAL_MS / 1000);
  }

  confirmationTimeouts.add(1);
  transactionFailures.add(true);
  return false;
}

export default function () {
  const submitResponse = submitTransaction();

  const submissionAccepted = check(submitResponse, {
    "submission accepted": (response) =>
      response.status >= 200 && response.status < 300,
  });

  if (!submissionAccepted) {
    transactionFailures.add(true);
    return;
  }

  let submissionBody;

  try {
    submissionBody = submitResponse.json();
  } catch (_) {
    transactionFailures.add(true);
    return;
  }

  const transactionId =
    submissionBody?.transactionId || submissionBody?.id;

  if (!transactionId) {
    transactionFailures.add(true);
    return;
  }

  waitForConfirmation(transactionId);
}
