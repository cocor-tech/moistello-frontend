"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import {
  Usb,
  Bluetooth,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { useMultiWalletStore } from "@/stores/multi-wallet-store";
import { LedgerDeviceSim } from "./ledger-device-sim";
import type { DeviceScreenState } from "./ledger-device-sim";
import {
  detectAvailableTransport,
  enumerateAuthorizedDevices,
} from "@/lib/wallet/adapters/ledger-transport";

interface LedgerPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: (publicKey: string) => void;
}

type WizardStep =
  | "detect"
  | "connect"
  | "open_app"
  | "verify"
  | "connected"
  | "error";

function getDeviceScreenForStep(
  step: WizardStep,
  transportType: string | null,
): DeviceScreenState {
  switch (step) {
    case "detect":
      return transportType === "webble" ? "pairing" : "dashboard";
    case "connect":
      return "waiting_commands";
    case "open_app":
      return "stellar_logo";
    case "verify":
      return "confirm_address";
    case "connected":
      return "approved";
    case "error":
      return "rejected";
    default:
      return "dashboard";
  }
}

function getStepMessage(
  step: WizardStep,
  transportType: string,
  errorMsg?: string,
): string {
  switch (step) {
    case "detect":
      return transportType === "webble"
        ? "Enable Bluetooth on your phone and Ledger Nano X"
        : "Connect your Ledger via USB cable";
    case "connect":
      return transportType === "webble"
        ? "Pairing with your Ledger Nano X..."
        : "Establishing USB connection...";
    case "open_app":
      return "Open the Stellar app on your Ledger";
    case "verify":
      return "Confirm the address on your Ledger screen";
    case "connected":
      return "Ledger Connected!";
    case "error":
      return errorMsg || "Connection failed";
  }
}

export function LedgerPrompt({
  isOpen,
  onClose,
  onConnected,
}: LedgerPromptProps) {
  const connect = useMultiWalletStore((s) => s.connect);
  const setLedgerConnectionState = useMultiWalletStore(
    (s) => s.setLedgerConnectionState,
  );
  const setLedgerTransportType = useMultiWalletStore(
    (s) => s.setLedgerTransportType,
  );
  const setLedgerConnectionError = useMultiWalletStore(
    (s) => s.setLedgerConnectionError,
  );
  const resetLedgerState = useMultiWalletStore((s) => s.resetLedgerState);

  const [currentStep, setCurrentStep] = useState<WizardStep>("detect");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedKey, setConnectedKey] = useState<string>("");
  const [hasAuthorizedDevice, setHasAuthorizedDevice] = useState(false);

  const transportType =
    typeof window !== "undefined" ? detectAvailableTransport() : "none";

  useEffect(() => {
    if (isOpen && transportType === "webusb") {
      enumerateAuthorizedDevices().then(setHasAuthorizedDevice);
    }
  }, [isOpen, transportType]);

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    setCurrentStep("connect");
    setLedgerTransportType(transportType === "webusb" ? "usb" : "ble");
    setLedgerConnectionState("connecting");

    try {
      setCurrentStep("open_app");
      setLedgerConnectionState("waiting_for_app");
      await connect("ledger");
      setCurrentStep("verify");
      setLedgerConnectionState("waiting_for_confirm");

      const store = useMultiWalletStore.getState();
      const addr = store.address;
      if (addr) {
        setConnectedKey(addr);
        setCurrentStep("connected");
        setLedgerConnectionState("connected");
        setTimeout(() => {
          onConnected?.(addr);
          onClose();
        }, 2000);
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "Failed to connect to Ledger";
      setError(msg);
      setCurrentStep("error");
      setLedgerConnectionError(msg);
      setLedgerConnectionState("error");
    } finally {
      setIsConnecting(false);
    }
  }, [
    connect,
    onClose,
    onConnected,
    setLedgerTransportType,
    setLedgerConnectionState,
    setLedgerConnectionError,
    transportType,
  ]);

  const handleRetry = useCallback(() => {
    setError(null);
    setCurrentStep("detect");
    setLedgerConnectionState("idle");
    setLedgerConnectionError(null);
  }, [setLedgerConnectionState, setLedgerConnectionError]);

  const handleClose = useCallback(() => {
    resetLedgerState();
    onClose();
  }, [resetLedgerState, onClose]);

  const totalSteps = transportType === "webble" ? 4 : 3;
  const stepNumber =
    currentStep === "detect"
      ? 1
      : currentStep === "connect"
        ? 2
        : currentStep === "open_app"
          ? 2
          : currentStep === "verify"
            ? 3
            : currentStep === "connected"
              ? totalSteps
              : 1;
  const isError = currentStep === "error";

  const containerRef = useFocusTrap<HTMLDivElement>(isOpen, handleClose);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ledger-wizard-title"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 24 }}
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ledger-wizard-title"
            tabIndex={-1}
            className="glass-premium rounded-3xl p-8 max-w-lg w-full holo-border"
          >
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl gradient-bg-extended flex items-center justify-center mx-auto mb-3">
                {transportType === "webble" ? (
                  <Bluetooth className="h-6 w-6 text-white" />
                ) : (
                  <Usb className="h-6 w-6 text-white" />
                )}
              </div>
              <h2
                id="ledger-wizard-title"
                className="font-heading text-xl gradient-text mb-1"
              >
                Connect Your Ledger
              </h2>
              <p className="text-xs text-muted-foreground">
                {transportType === "webble"
                  ? "Connect via Bluetooth"
                  : transportType === "webusb"
                    ? "Connect via USB"
                    : "Hardware wallet connection"}
              </p>
            </div>

            {/* Device Simulator */}
            <div className="flex justify-center mb-6">
              <LedgerDeviceSim
                screen={getDeviceScreenForStep(currentStep, transportType)}
                address={connectedKey || undefined}
              />
            </div>

            {/* Step indicator */}
            {!isError && currentStep !== "connected" && (
              <div className="flex justify-center gap-1.5 mb-4">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300",
                      i + 1 < stepNumber
                        ? "bg-emerald-400"
                        : i + 1 === stepNumber
                          ? "bg-aurora-violet w-4"
                          : "bg-white/10",
                    )}
                  />
                ))}
              </div>
            )}

            {/* Step content */}
            <div className="text-center mb-6" role="status" aria-live="polite">
              {isError ? (
                <div className="flex items-start gap-2 text-sm text-red-400 bg-red-400/5 rounded-xl p-3">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              ) : currentStep === "connected" ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center"
                >
                  <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
                  <p className="font-heading text-lg gradient-text">
                    Connected!
                  </p>
                  <p className="text-xs text-muted-foreground font-mono mt-1 break-all">
                    {connectedKey
                      ? `${connectedKey.slice(0, 8)}...${connectedKey.slice(-4)}`
                      : ""}
                  </p>
                  <p className="text-2xs text-muted-foreground/50 mt-1">
                    Hardware wallet verified
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Step {stepNumber} of {totalSteps}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {getStepMessage(currentStep, transportType)}
                    {isConnecting && (
                      <Loader2 className="inline h-3 w-3 animate-spin ml-1" />
                    )}
                  </p>
                  {currentStep === "detect" && transportType === "webusb" && (
                    <p className="text-2xs text-muted-foreground/50">
                      {hasAuthorizedDevice
                        ? "Previously connected device detected"
                        : "Browser will ask you to select your device"}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={handleClose}
                disabled={isConnecting}
              >
                Cancel
              </Button>

              {isError && (
                <Button
                  variant="primary"
                  className="flex-1 rounded-xl"
                  onClick={handleRetry}
                >
                  Try Again
                </Button>
              )}

              {currentStep === "detect" && !isConnecting && !isError && (
                <Button
                  variant="primary"
                  className="flex-1 rounded-xl"
                  onClick={handleConnect}
                >
                  {transportType === "webble" ? "Start Pairing" : "Connect"}
                </Button>
              )}

              {currentStep === "connected" && (
                <Button
                  variant="primary"
                  className="flex-1 rounded-xl"
                  onClick={handleClose}
                >
                  Continue
                </Button>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground/40 text-center mt-4">
              Your private key never leaves the Ledger device. Every transaction
              requires physical confirmation.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
