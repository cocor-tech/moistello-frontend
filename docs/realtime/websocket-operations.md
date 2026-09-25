# WebSocket Operations and Security

## Lifecycle
Authenticate during the handshake, create a server-generated connection ID, require explicit
circle subscriptions, authorize every subscription, process heartbeat activity, and remove all
subscriptions on disconnect.

## Circle isolation
A client-provided circle ID is only a requested resource. The server must validate membership and
permissions using the authenticated identity. Re-check authorization when membership changes require it.

## Delivery
Events should include a unique event ID, stream sequence number, circle ID, event type, timestamp,
and minimized schema-validated payload. Clients must detect sequence gaps and recover through the
authoritative HTTP/API layer.

## Multi-instance operation
Use a shared broker for multiple hub processes and document ordering, duplicate handling, replay,
broker outage, backpressure, and slow-consumer behavior.

## Observability
Track active connections, subscriptions, rejected subscriptions, heartbeat timeouts, broadcast
delivery, dropped messages, and send errors without logging tokens or private data.
