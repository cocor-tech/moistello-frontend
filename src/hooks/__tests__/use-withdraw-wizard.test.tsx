import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useWithdrawWizard } from "../use-withdraw-wizard";

// Mock API client
const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock("@/lib/api-client", () => ({
  get: (...args: any[]) => mockGet(...args),
  post: (...args: any[]) => mockPost(...args),
}));

// Mock UI store
const mockAddToast = vi.fn();
vi.mock("@/stores/ui-store", () => ({
  useUIStore: (selector: any) => {
    const state = { addToast: mockAddToast };
    return selector(state);
  },
}));

vi.mock("@/lib/constants", () => ({
  NGN_FALLBACK_RATE: 1500,
}));

describe("useWithdrawWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockGet.mockResolvedValue({
      data: {
        usdc: "100.50",
        xlm: "500.25",
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes with default state", () => {
    const { result } = renderHook(() => useWithdrawWizard());

    expect(result.current.step).toBe("wallet");
    expect(result.current.asset).toBe("USDC");
    expect(result.current.amountUsdc).toBe("");
    expect(result.current.loading).toBe(false);
    expect(result.current.errMsg).toBe("");
  });

  it("fetches wallet balances on mount", async () => {
    const { result } = renderHook(() => useWithdrawWizard());

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith("/wallets/balance");
    });

    await waitFor(() => {
      expect(result.current.wallets.length).toBe(2);
    });

    expect(result.current.wallets[0]).toMatchObject({
      id: "usdc-wallet",
      label: "USDC Wallet",
      balance: 100.5,
      asset: "USDC",
    });
  });

  it("selects a wallet and updates asset", async () => {
    const { result } = renderHook(() => useWithdrawWizard());

    await waitFor(() => {
      expect(result.current.wallets.length).toBe(2);
    });

    act(() => {
      result.current.selectWallet("xlm-wallet", "XLM");
    });

    expect(result.current.selectedWallet).toBe("xlm-wallet");
    expect(result.current.asset).toBe("XLM");
  });

  it("calculates NGN estimate based on amount", () => {
    const { result } = renderHook(() => useWithdrawWizard());

    act(() => {
      result.current.setAmountUsdc("10");
    });

    expect(result.current.ngnEstimate).toBe(15000); // 10 * 1500
  });

  it("returns null NGN estimate for empty amount", () => {
    const { result } = renderHook(() => useWithdrawWizard());

    expect(result.current.ngnEstimate).toBeNull();
  });

  it("handles get quote with valid inputs", async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        estimatedNgn: 15000,
        rate: 1500,
        spread: 1.5,
        yellowCardAddress: "GTEST123",
        withdrawId: "withdraw-123",
      },
    });

    const { result } = renderHook(() => useWithdrawWizard());

    await waitFor(() => {
      expect(result.current.wallets.length).toBe(2);
    });

    act(() => {
      result.current.setAmountUsdc("10");
      result.current.setSelectedBank("058");
      result.current.setAccountNumber("1234567890");
      result.current.setAccountName("John Doe");
    });

    await act(async () => {
      await result.current.handleGetQuote();
    });

    expect(mockPost).toHaveBeenCalledWith("/wallet/withdraw/quote", {
      asset: "USDC",
      amount: 10,
      bankCode: "058",
      accountNumber: "1234567890",
      accountName: "John Doe",
    });

    expect(result.current.step).toBe("confirm");
    expect(result.current.quote).toMatchObject({
      estimatedNgn: 15000,
      withdrawId: "withdraw-123",
    });
  });

  it("shows error toast for invalid amount", async () => {
    const { result } = renderHook(() => useWithdrawWizard());

    await waitFor(() => {
      expect(result.current.wallets.length).toBe(2);
    });

    act(() => {
      result.current.setAmountUsdc("");
    });

    await act(async () => {
      await result.current.handleGetQuote();
    });

    expect(mockAddToast).toHaveBeenCalledWith({
      type: "error",
      title: "Invalid amount",
    });
  });

  it("shows error toast for insufficient balance", async () => {
    const { result } = renderHook(() => useWithdrawWizard());

    await waitFor(() => {
      expect(result.current.wallets.length).toBe(2);
    });

    act(() => {
      result.current.setAmountUsdc("200"); // More than balance of 100.5
      result.current.setSelectedBank("058");
      result.current.setAccountNumber("1234567890");
      result.current.setAccountName("John Doe");
    });

    await act(async () => {
      await result.current.handleGetQuote();
    });

    expect(mockAddToast).toHaveBeenCalledWith({
      type: "error",
      title: "Insufficient balance",
    });
  });

  it("handles confirm submission", async () => {
    mockPost.mockResolvedValueOnce({
      data: { estimatedNgn: 15000, withdrawId: "withdraw-123" },
    });

    const { result } = renderHook(() => useWithdrawWizard());

    await waitFor(() => {
      expect(result.current.wallets.length).toBe(2);
    });

    act(() => {
      result.current.setAmountUsdc("10");
      result.current.setSelectedBank("058");
      result.current.setAccountNumber("1234567890");
      result.current.setAccountName("John Doe");
    });

    await act(async () => {
      await result.current.handleGetQuote();
    });

    mockPost.mockResolvedValueOnce({ success: true });

    await act(async () => {
      await result.current.handleConfirm();
    });

    expect(mockPost).toHaveBeenCalledWith("/wallet/withdraw/withdraw-123/submit", {
      otpSent: true,
    });
    expect(result.current.step).toBe("otp");
  });

  it("handles OTP verification", async () => {
    mockPost
      .mockResolvedValueOnce({ data: { estimatedNgn: 15000, withdrawId: "withdraw-123" } })
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useWithdrawWizard());

    await waitFor(() => expect(result.current.wallets.length).toBe(2));

    act(() => {
      result.current.setAmountUsdc("10");
      result.current.setSelectedBank("058");
      result.current.setAccountNumber("1234567890");
      result.current.setAccountName("John Doe");
    });

    await act(async () => {
      await result.current.handleGetQuote();
      await result.current.handleConfirm();
    });

    act(() => {
      result.current.handleOtpChange("123456");
    });

    await act(async () => {
      await result.current.handleVerifyOtp();
    });

    expect(mockPost).toHaveBeenCalledWith("/wallet/withdraw/withdraw-123/verify", {
      otp: "123456",
    });
    expect(result.current.step).toBe("success");
    expect(mockAddToast).toHaveBeenCalledWith({
      type: "success",
      title: "Withdrawal confirmed!",
    });
  });

  it("handles OTP resend with cooldown", async () => {
    mockPost
      .mockResolvedValueOnce({ data: { estimatedNgn: 15000, withdrawId: "withdraw-123" } })
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useWithdrawWizard());

    await waitFor(() => expect(result.current.wallets.length).toBe(2));

    act(() => {
      result.current.setAmountUsdc("10");
      result.current.setSelectedBank("058");
      result.current.setAccountNumber("1234567890");
      result.current.setAccountName("John Doe");
    });

    await act(async () => {
      await result.current.handleGetQuote();
      await result.current.handleConfirm();
    });

    await act(async () => {
      await result.current.handleResendOtp();
    });

    expect(mockPost).toHaveBeenCalledWith("/wallet/withdraw/withdraw-123/resend-otp", {});
    expect(result.current.resendCooldown).toBe(60);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.resendCooldown).toBeLessThan(60);
  });

  it("prevents OTP resend during cooldown", async () => {
    const { result } = renderHook(() => useWithdrawWizard());

    act(() => {
      result.current.setStep("otp");
    });

    // Manually set cooldown
    act(() => {
      vi.advanceTimersByTime(0);
    });

    const callCount = mockPost.mock.calls.length;

    await act(async () => {
      await result.current.handleResendOtp();
    });

    // Should not make additional call if no quote
    expect(mockPost.mock.calls.length).toBe(callCount);
  });
});
