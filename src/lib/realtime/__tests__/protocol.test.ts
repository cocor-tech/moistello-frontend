import { describe, expect, it } from "vitest"
import type { ClientMessage, RealtimeEvent, ServerMessage } from "../protocol"

function describeClientMessage(message: ClientMessage): string {
  switch (message.type) {
    case "subscribe":
      return `subscribe:${message.circleId}`
    case "unsubscribe":
      return `unsubscribe:${message.circleId}`
    case "ping":
      return "ping"
  }
}

function describeServerMessage(message: ServerMessage): string {
  switch (message.type) {
    case "ready":
      return `ready:${message.connectionId}`
    case "subscribed":
    case "unsubscribed":
      return `${message.type}:${message.circleId}`
    case "event":
      return `event:${message.eventType}`
    case "pong":
      return "pong"
    case "error":
      return `error:${message.code}`
  }
}

describe("realtime protocol messages", () => {
  describe("ClientMessage", () => {
    it("round-trips a subscribe message through JSON", () => {
      const message: ClientMessage = {
        type: "subscribe",
        requestId: "req-1",
        circleId: "circle-42",
      }
      expect(JSON.parse(JSON.stringify(message))).toEqual(message)
    })

    it("describes every client message type", () => {
      const messages: ClientMessage[] = [
        { type: "subscribe", requestId: "1", circleId: "c1" },
        { type: "unsubscribe", requestId: "2", circleId: "c1" },
        { type: "ping" },
        { type: "ping", requestId: "3" },
      ]
      expect(messages.map(describeClientMessage)).toEqual([
        "subscribe:c1",
        "unsubscribe:c1",
        "ping",
        "ping",
      ])
    })

    it("allows ping without a requestId", () => {
      const message: ClientMessage = { type: "ping" }
      expect("requestId" in message).toBe(false)
    })
  })

  describe("ServerMessage", () => {
    it("describes every server message type", () => {
      const messages: ServerMessage[] = [
        { type: "ready", connectionId: "conn-1", heartbeatIntervalMs: 30000 },
        { type: "subscribed", requestId: "1", circleId: "c1" },
        { type: "unsubscribed", requestId: "2", circleId: "c1" },
        {
          type: "event",
          eventId: "e1",
          sequence: 7,
          circleId: "c1",
          eventType: "contribution.created",
          occurredAt: "2026-01-01T00:00:00.000Z",
          payload: {},
        },
        { type: "pong" },
        { type: "error", code: "RATE_LIMITED", message: "Slow down" },
      ]
      expect(messages.map(describeServerMessage)).toEqual([
        "ready:conn-1",
        "subscribed:c1",
        "unsubscribed:c1",
        "event:contribution.created",
        "pong",
        "error:RATE_LIMITED",
      ])
    })

    it("treats subscribed and unsubscribed as sharing one shape", () => {
      const subscribed: ServerMessage = { type: "subscribed", requestId: "1", circleId: "c1" }
      const unsubscribed: ServerMessage = { type: "unsubscribed", requestId: "1", circleId: "c1" }
      expect(Object.keys(subscribed).sort()).toEqual(Object.keys(unsubscribed).sort())
    })
  })

  describe("RealtimeEvent", () => {
    it("carries the fields needed to order and route an event", () => {
      const event: RealtimeEvent = {
        eventId: "e1",
        sequence: 1,
        circleId: "c1",
        eventType: "payout.claimed",
        occurredAt: "2026-01-01T00:00:00.000Z",
        payload: { amount: 10 },
      }
      expect(event).toMatchObject({ sequence: 1, circleId: "c1", eventType: "payout.claimed" })
      expect(new Date(event.occurredAt).toISOString()).toBe(event.occurredAt)
    })
  })
})
