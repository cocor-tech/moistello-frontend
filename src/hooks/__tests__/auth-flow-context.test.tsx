import { render, act } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { AuthFlowProvider, useAuthFlow } from "../auth-flow-context";
import { useAuthFlowStore } from "@/stores/auth-flow-store";

describe("auth-flow-context", () => {
  beforeEach(() => act(() => useAuthFlowStore.getState().reset()));

  it("useAuthFlow reads straight from the auth-flow store", () => {
    function Probe() {
      const status = useAuthFlow((state) => state.status.status);
      return <span>{status}</span>;
    }
    const { getByText } = render(<Probe />);

    expect(getByText("idle")).toBeTruthy();
  });

  it("resets local auth state when another tab reports it authenticated", () => {
    render(
      <AuthFlowProvider>
        <div />
      </AuthFlowProvider>,
    );
    act(() => useAuthFlowStore.setState({ status: { status: "connecting" } } as never));

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "moistello-auth-flow",
          newValue: JSON.stringify({ state: { status: { status: "authenticated" } } }),
        }),
      );
    });

    expect(useAuthFlowStore.getState().status.status).toBe("idle");
  });
});
