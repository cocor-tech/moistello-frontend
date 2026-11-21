import { describe, it, expect, beforeEach } from "vitest";
import { usePasskeyWalletStore } from "../passkey-wallet-store";

describe("usePasskeyWalletStore", () => {
  beforeEach(() => {
    usePasskeyWalletStore.getState().reset();
  });

  it("has correct initial state", () => {
    const state = usePasskeyWalletStore.getState();
    expect(state.state).toBe("idle");
    expect(state.error).toBeNull();
    expect(state.publicKey).toBeNull();
  });

  it("updates state through valid state transitions", () => {
    const store = usePasskeyWalletStore.getState;

    store().setState("registering");
    expect(store().state).toBe("registering");

    store().setState("awaiting_biometric");
    expect(store().state).toBe("awaiting_biometric");

    store().setState("authenticating");
    expect(store().state).toBe("authenticating");

    store().setState("deriving");
    expect(store().state).toBe("deriving");

    store().setState("connected");
    expect(store().state).toBe("connected");
  });

  it("updates and clears publicKey", () => {
    const store = usePasskeyWalletStore.getState;
    const pubKey = "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37";

    store().setPublicKey(pubKey);
    expect(store().publicKey).toBe(pubKey);

    store().setPublicKey(null);
    expect(store().publicKey).toBeNull();
  });

  it("resets all state back to defaults", () => {
    const store = usePasskeyWalletStore.getState;

    store().setState("connected");
    store().setPublicKey("GBEXAMPLEKEY");
    store().setError("Some error");

    expect(store().state).toBe("error");
    expect(store().publicKey).toBe("GBEXAMPLEKEY");
    expect(store().error).toBe("Some error");

    store().reset();

    expect(store().state).toBe("idle");
    expect(store().publicKey).toBeNull();
    expect(store().error).toBeNull();
  });

  it("sets error message and transitions state to error when error is provided", () => {
    const store = usePasskeyWalletStore.getState;
    store().setState("authenticating");

    store().setError("Biometric validation failed");

    expect(store().error).toBe("Biometric validation failed");
    expect(store().state).toBe("error");
  });

  it("clears error without changing state when error is null", () => {
    const store = usePasskeyWalletStore.getState;

    // When in connected state and error is set to null, state remains connected
    store().setState("connected");
    store().setError(null);

    expect(store().error).toBeNull();
    expect(store().state).toBe("connected");

    // If state was error, clearing error leaves state as error until explicitly changed
    store().setError("Something failed");
    expect(store().state).toBe("error");
    store().setError(null);
    expect(store().error).toBeNull();
    expect(store().state).toBe("error");
  });
});
