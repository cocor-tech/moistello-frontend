import { describe, it, expect, beforeEach } from "vitest";
import { useLedgerStore } from "../ledger-store";

describe("useLedgerStore", () => {
  beforeEach(() => {
    useLedgerStore.getState().reset();
  });

  it("has correct initial state", () => {
    const state = useLedgerStore.getState();
    expect(state.transportType).toBeNull();
    expect(state.connectionState).toBe("idle");
    expect(state.firmwareVersion).toBeNull();
    expect(state.stellarAppVersion).toBeNull();
    expect(state.firmwareWarnings).toEqual([]);
    expect(state.connectionError).toBeNull();
  });

  it("updates transportType between usb, ble, and null", () => {
    const store = useLedgerStore.getState;

    store().setTransportType("usb");
    expect(store().transportType).toBe("usb");

    store().setTransportType("ble");
    expect(store().transportType).toBe("ble");

    store().setTransportType(null);
    expect(store().transportType).toBeNull();
  });

  it("updates connectionState across standard connection lifecycle", () => {
    const store = useLedgerStore.getState;

    store().setConnectionState("detecting");
    expect(store().connectionState).toBe("detecting");

    store().setConnectionState("connecting");
    expect(store().connectionState).toBe("connecting");

    store().setConnectionState("waiting_for_app");
    expect(store().connectionState).toBe("waiting_for_app");

    store().setConnectionState("waiting_for_confirm");
    expect(store().connectionState).toBe("waiting_for_confirm");

    store().setConnectionState("connected");
    expect(store().connectionState).toBe("connected");

    store().setConnectionState("disconnected");
    expect(store().connectionState).toBe("disconnected");

    store().setConnectionState("waiting_for_reconnect");
    expect(store().connectionState).toBe("waiting_for_reconnect");
  });

  it("updates firmwareVersion and stellarAppVersion", () => {
    const store = useLedgerStore.getState;

    store().setFirmwareVersion("2.2.4");
    store().setStellarAppVersion("1.5.0");

    expect(store().firmwareVersion).toBe("2.2.4");
    expect(store().stellarAppVersion).toBe("1.5.0");

    store().setFirmwareVersion(null);
    store().setStellarAppVersion(null);

    expect(store().firmwareVersion).toBeNull();
    expect(store().stellarAppVersion).toBeNull();
  });

  it("updates and clears firmwareWarnings array", () => {
    const store = useLedgerStore.getState;

    const warnings = ["Firmware is outdated", "Security update recommended"];
    store().setFirmwareWarnings(warnings);
    expect(store().firmwareWarnings).toEqual(warnings);

    store().setFirmwareWarnings([]);
    expect(store().firmwareWarnings).toEqual([]);
  });

  it("handles error states and clears connection errors", () => {
    const store = useLedgerStore.getState;

    store().setConnectionState("error");
    store().setConnectionError("Device locked with PIN");

    expect(store().connectionState).toBe("error");
    expect(store().connectionError).toBe("Device locked with PIN");

    store().setConnectionError(null);
    expect(store().connectionError).toBeNull();
  });

  it("resets all properties back to initial defaults", () => {
    const store = useLedgerStore.getState;

    store().setTransportType("usb");
    store().setConnectionState("error");
    store().setFirmwareVersion("2.1.0");
    store().setStellarAppVersion("1.4.2");
    store().setFirmwareWarnings(["Low battery"]);
    store().setConnectionError("Connection timeout");

    store().reset();

    expect(store().transportType).toBeNull();
    expect(store().connectionState).toBe("idle");
    expect(store().firmwareVersion).toBeNull();
    expect(store().stellarAppVersion).toBeNull();
    expect(store().firmwareWarnings).toEqual([]);
    expect(store().connectionError).toBeNull();
  });
});
