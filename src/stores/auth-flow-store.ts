"use client"

import { create } from "zustand"
import { devtools, persist, createJSONStorage } from "zustand/middleware"
import { post } from "@/lib/api-client"
import { recordMetric, captureAuthError } from "@/lib/monitoring"
import { useMultiWalletStore } from "@/stores/multi-wallet-store"
import { useAuthStore } from "@/stores/auth-store"
import { User } from "@/types"

export type AuthFlowMode = "login" | "register"

export type AuthStep = "choose" | "profile" | "sign"

export type AuthFlowStatus =
  | { status: "idle" }
  | { status: "detecting_wallets" }
  | { status: "connecting"; walletId: string | null }
  | {
      status: "awaiting_approval"
      pairingUri: string | null
      protocol: "qr" | "deeplink" | null
    }
  | { status: "connected"; walletId: string; address: string }
  | { status: "signing"; address: string }
  | { status: "signed"; signature: string; nonce: string }
  | { status: "sending_code" }
  | { status: "code_sent" }
  | { status: "error"; code: AuthErrorCode; message: string; canRetry: boolean }
  | { status: "authenticated" }

export type AuthErrorCode =
  | "connection_timeout"
  | "connection_rejected"
  | "relay_down"
  | "network_mismatch"
  | "auth_server_error"
  | "validation_error"
  | "passkey_revoked"
  | "internal_error"
  | "email_send_failed"
  | "email_code_invalid"
  | "email_code_expired"
  | "email_rate_limited"

const STEP_ORDER: AuthStep[] = ["choose", "profile", "sign"]

function getStepsForMode(mode: AuthFlowMode): AuthStep[] {
  return mode === "register" ? STEP_ORDER : STEP_ORDER.filter(s => s !== "profile")
}

interface RateLimitState {
  remainingAttempts: number
  cooldownUntil: number | null
  lastAttemptAt: number | null
}

interface EmailVerificationState {
  email: string
  verificationId: string | null
  codeSent: boolean
  codeVerified: boolean
  expiresAt: number | null
  remainingAttempts: number
}

export interface AuthFlowState {
  mode: AuthFlowMode
  step: AuthStep
  status: AuthFlowStatus
  error: { code: AuthErrorCode | null; message: string | null } | null
  isSigningInFlight: boolean
  connection: {
    walletId: string | null
    address: string | null
    pairingUri: string | null
    protocol: "qr" | "deeplink" | null
    relayStatus: "healthy" | "degraded" | "down"
  }
  profile: {
    displayName: string
    countryCode: string
    language: string
    fieldErrors: Record<string, string>
  }
  auth: {
    nonce: string | null
    signature: string | null
    nonceTimestamp: number | null
  }
  rateLimit: RateLimitState
  emailVerification: EmailVerificationState
  passkeyVersion: number
  passkeyRevoked: boolean
}

interface AuthFlowActions {
  startLoginFlow: () => void
  startRegisterFlow: () => void
  reset: () => void
  setStep: (step: AuthStep) => void
  goBack: () => void
  setError: (code: AuthErrorCode, message: string) => void
  clearError: () => void
  resetConnection: () => void
  connect: (walletId: string) => Promise<void>
  connectStart: (walletId: string) => void
  connectSuccess: (walletId: string, address: string) => void
  awaitingApproval: (pairingUri: string, protocol: "qr" | "deeplink") => void
  onConnectionTimeout: () => void
  onConnectionRejected: () => void
  setPairingUri: (uri: string | null) => void
  setRelayStatus: (status: "healthy" | "degraded" | "down") => void
  updateProfileField: (field: keyof AuthFlowState["profile"], value: string) => void
  setFieldError: (field: string, error: string | null) => void
  validateProfile: () => boolean
  signAndSubmit: () => Promise<void>
  signStart: (address: string) => void
  signSuccess: (signature: string, nonce: string) => void
  authenticated: () => void
  isWalletConnected: () => boolean
  canProceed: () => boolean
  currentStepIndex: () => number
  totalSteps: () => number
  sendVerificationCode: (email: string, captchaToken?: string) => Promise<void>
  verifyCode: (code: string) => Promise<void>
  resendCode: () => Promise<void>
  clearEmailVerification: () => void
  setEmailVerificationCodeSent: (email: string, verificationId: string | null) => void
  setEmailVerified: () => void
  setNonce: (nonce: string | null) => void
  setRateLimit: (remainingAttempts: number, cooldownUntil: number | null) => void
  setPasskeyVersion: (version: number) => void
  setPasskeyRevoked: (revoked: boolean) => void
}

export type AuthFlowStore = AuthFlowState & AuthFlowActions

const initialConnection = {
  walletId: null as string | null,
  address: null as string | null,
  pairingUri: null as string | null,
  protocol: null as "qr" | "deeplink" | null,
  relayStatus: "healthy" as "healthy" | "degraded" | "down",
}

const initialProfile = {
  displayName: "",
  countryCode: "",
  language: "en",
  fieldErrors: {} as Record<string, string>,
}

function initialRateLimit(): RateLimitState {
  return {
    remainingAttempts: 5,
    cooldownUntil: null,
    lastAttemptAt: null,
  }
}

function initialEmailVerification(): EmailVerificationState {
  return {
    email: "",
    verificationId: null,
    codeSent: false,
    codeVerified: false,
    expiresAt: null,
    remainingAttempts: 5,
  }
}

function createInitialState(): AuthFlowState {
  return {
    mode: "login",
    step: "choose",
    status: { status: "idle" } as AuthFlowStatus,
    error: null,
    isSigningInFlight: false,
    connection: { ...initialConnection },
    profile: { ...initialProfile },
    auth: { nonce: null, signature: null, nonceTimestamp: null },
    rateLimit: initialRateLimit(),
    emailVerification: initialEmailVerification(),
    passkeyVersion: 0,
    passkeyRevoked: false,
  }
}

export async function verifyPasskeyRevocation(): Promise<void> {
  try {
    const { passkeyVersion } = useAuthFlowStore.getState()
    const response = await post<{
      revoked: boolean
      currentVersion: number
    }>("/auth/passkey/status", { passkeyVersion })
    if (!response.revoked) {
      useAuthFlowStore.setState({
        passkeyRevoked: false,
        passkeyVersion: response.currentVersion,
      })
    }
  } catch (e) {
    console.warn("[auth-flow] Passkey status check failed (server unreachable):", e)
  }
}

export const useAuthFlowStore = create<AuthFlowStore>()(
  persist(
    devtools(
      (set, get) => ({
        ...createInitialState(),

        startLoginFlow: () => {
          if (typeof window !== "undefined") {
            import("@/lib/wallet/registry").then(({ getWalletRegistry }) => {
              try {
                getWalletRegistry().getAdapter("passkey")?.reset?.()
              } catch (e) {
                console.warn("[auth-flow] Failed to reset passkey adapter:", e)
              }
            })
          }
          set({
            mode: "login",
            step: "choose",
            status: { status: "idle" },
            connection: { ...initialConnection },
            auth: { nonce: null, signature: null, nonceTimestamp: null },
          })
        },

        startRegisterFlow: () => set({ mode: "register", step: "choose", status: { status: "idle" } }),

        reset: () => set(createInitialState()),

        setStep: step => set({ step }),

        goBack: () => {
          const { step, mode } = get()
          const steps = getStepsForMode(mode)
          const currentIndex = steps.indexOf(step)
          if (currentIndex > 0) {
            set({ step: steps[currentIndex - 1] })
          }
        },

        setError: (code, message) =>
          set({
            status: {
              status: "error",
              code,
              message,
              canRetry: code !== "validation_error",
            },
            error: { code, message },
          }),

        clearError: () => set({ error: null, status: { status: "idle" }, isSigningInFlight: false }),

        resetConnection: () =>
          set(state => ({
            connection: {
              ...state.connection,
              walletId: null,
              address: null,
              pairingUri: null,
              protocol: null,
            },
          })),

        connect: async _walletId => {
          set({ status: { status: "connecting", walletId: _walletId } })
        },

        connectStart: walletId =>
          set(state => ({
            status: { status: "connecting", walletId },
            connection: { ...state.connection, walletId },
          })),

        connectSuccess: (walletId, address) =>
          set(state => ({
            status: { status: "connected", walletId, address },
            connection: { ...state.connection, walletId, address },
          })),

        awaitingApproval: (pairingUri, protocol) =>
          set(state => ({
            status: { status: "awaiting_approval", pairingUri, protocol },
            connection: { ...state.connection, pairingUri, protocol },
          })),

        onConnectionTimeout: () => {
          const msg = "Connection timed out. Please try again."
          set({
            status: {
              status: "error",
              code: "connection_timeout",
              message: msg,
              canRetry: true,
            },
            error: { code: "connection_timeout", message: msg },
          })
        },

        onConnectionRejected: () => {
          const msg = "Connection was rejected."
          set({
            status: {
              status: "error",
              code: "connection_rejected",
              message: msg,
              canRetry: true,
            },
            error: { code: "connection_rejected", message: msg },
          })
        },

        setPairingUri: uri =>
          set(state => ({
            connection: { ...state.connection, pairingUri: uri },
          })),

        setRelayStatus: status =>
          set(state => ({
            connection: { ...state.connection, relayStatus: status },
          })),

        updateProfileField: (field, value) =>
          set(state => ({
            profile: { ...state.profile, [field]: value },
            error: null,
          })),

        setFieldError: (field, error) =>
          set(state => {
            const next = { ...state.profile.fieldErrors }
            if (error) {
              next[field] = error
            } else {
              delete next[field]
            }
            return { profile: { ...state.profile, fieldErrors: next } }
          }),

        validateProfile: () => {
          const { profile } = get()
          const errors: Record<string, string> = {}
          if (!profile.displayName.trim()) errors.displayName = "Display name is required"
          if (!profile.countryCode.trim()) errors.countryCode = "Country is required"
          set(state => ({
            profile: { ...state.profile, fieldErrors: errors },
          }))
          return Object.keys(errors).length === 0
        },

        signAndSubmit: async () => {
          // ── In-flight guard ──────────────────────────────────────────────────
          // Prevent concurrent invocations (double-click, retry before completion).
          // If a sign+submit is already running, return immediately without touching
          // any state so the first call remains authoritative.
          if (get().isSigningInFlight) return
          set({ isSigningInFlight: true })

          // Capture a per-call AbortController so callers can detect stale results
          // if the component unmounts mid-flight (future-proof; not awaited here but
          // threaded through for downstream use if needed).
          const abortController = new AbortController()

          try {
            const initialState = get()
            const mode = initialState.mode
            const address = initialState.connection.address
            const walletId = initialState.connection.walletId

            if (!address || !walletId) {
              const msg = "No wallet connected."
              set({
                isSigningInFlight: false,
                status: {
                  status: "error",
                  code: "internal_error",
                  message: msg,
                  canRetry: false,
                },
                error: { code: "internal_error", message: msg },
              })
              return
            }

            recordMetric("wallet.sign.attempt", 1, { mode, walletId })
            set({ status: { status: "signing", address } })

            recordMetric("wallet.sign.attempt", 1, {
              phase: "nonce_fetch",
              mode,
            })
            const nonceResponse = await post<{
              success: boolean
              data: { nonce: { nonce: string } }
            }>(
              "/auth/nonce",
              {
                walletAddress: address,
              },
              { _retry: true } as Record<string, unknown>,
            )

            // Bail if a concurrent abort was triggered while we awaited the nonce.
            if (abortController.signal.aborted) return

            const nonce = nonceResponse.data.nonce.nonce

            const signingState = get()
            const signingMode = signingState.mode
            const signingWalletId = signingState.connection.walletId
            if (!signingWalletId) {
              throw new Error("Wallet adapter not found")
            }
            recordMetric("wallet.sign.attempt", 1, {
              phase: "signing",
              mode: signingMode,
              walletId: signingWalletId,
            })
            const wallets = useMultiWalletStore.getState().wallets
            const adapter = wallets[signingWalletId]?.adapter
            if (!adapter) {
              throw new Error("Wallet adapter not found")
            }

            const signed = await adapter.signMessage(nonce)

            if (abortController.signal.aborted) return

            const signature = signed.signature

            const signedState = get()
            recordMetric("wallet.sign.success", 1, {
              mode: signedState.mode,
              walletId: signedState.connection.walletId ?? "unknown",
            })
            set({
              status: { status: "signed", signature, nonce },
              auth: { nonce, signature, nonceTimestamp: Date.now() },
            })

            const submitState = get()
            const submitMode = submitState.mode
            const submitAddress = submitState.connection.address
            const submitPasskeyVersion = submitState.passkeyVersion
            recordMetric("wallet.sign.attempt", 1, {
              phase: "submit",
              mode: submitMode,
            })
            const endpoint = submitMode === "login" ? "/auth/verify" : "/auth/register"
            const body: Record<string, unknown> = {
              walletAddress: submitAddress,
              signature,
              nonce,
              passkeyVersion: submitPasskeyVersion,
            }

            if (submitMode === "register") {
              const profile = submitState.profile
              body.displayName = profile.displayName.trim()
              body.countryCode = profile.countryCode
              if (profile.language) body.preferredLanguage = profile.language
            }

            const authResponse = await post<{
              success: boolean
              data: {
                token: string
                refreshToken?: string
                user: Record<string, unknown>
                expectedPasskeyVersion?: number
              }
            }>(endpoint, body, { _retry: true } as Record<string, unknown>)

            if (abortController.signal.aborted) return

            const d = authResponse.data
            const currentPasskeyVersion = get().passkeyVersion
            if (d.expectedPasskeyVersion !== undefined && d.expectedPasskeyVersion > currentPasskeyVersion) {
              set({
                passkeyVersion: d.expectedPasskeyVersion,
                passkeyRevoked: true,
              })
              const msg = "Your passkey has been revoked. Please set up a new one."
              set({
                isSigningInFlight: false,
                status: {
                  status: "error",
                  code: "passkey_revoked",
                  message: msg,
                  canRetry: true,
                },
                error: { code: "passkey_revoked", message: msg },
              })
              return
            }

            const token = d.token
            const refreshToken = d.refreshToken ?? token

            await useAuthStore.getState().setTokens(token, refreshToken, d.user as unknown as User | undefined)

            recordMetric("auth.sign.completed", 1, { mode: get().mode })

            set({ isSigningInFlight: false, status: { status: "authenticated" } })
          } catch (err: unknown) {
            // Do not overwrite state if this call was already superseded.
            if (abortController.signal.aborted) return

            const axiosErr = err as {
              response?: { status?: number; data?: { error?: string } }
            }
            const errorMessage =
              axiosErr?.response?.data?.error ?? (err instanceof Error ? err.message : "Signing failed")

            const currentState = get()
            captureAuthError(err, {
              step: "sign",
              mode: currentState.mode,
              walletId: currentState.connection.walletId,
              address: currentState.connection.address,
              errorCode: "auth_server_error",
            })

            const msg = errorMessage
            set({
              isSigningInFlight: false,
              status: {
                status: "error",
                code: "auth_server_error",
                message: msg,
                canRetry: true,
              },
              error: { code: "auth_server_error", message: msg },
            })
          }
        },

        signStart: address => set({ status: { status: "signing", address } }),

        signSuccess: (signature, nonce) =>
          set({
            status: { status: "signed", signature, nonce },
            auth: { nonce, signature, nonceTimestamp: Date.now() },
          }),

        authenticated: () => set({ status: { status: "authenticated" } }),

        setPasskeyVersion: (version: number) => set({ passkeyVersion: version }),

        setPasskeyRevoked: (revoked: boolean) => set({ passkeyRevoked: revoked }),

        isWalletConnected: () => {
          const { connection, status } = get()
          return status.status === "connected" && !!connection.address
        },

        canProceed: () => {
          const { step, connection, profile } = get()
          switch (step) {
            case "choose":
              return connection.address !== null
            case "profile":
              return profile.displayName.trim() !== "" && profile.countryCode.trim() !== ""
            case "sign":
              return true
          }
        },

        currentStepIndex: () => {
          const { step, mode } = get()
          return getStepsForMode(mode).indexOf(step)
        },

        totalSteps: () => getStepsForMode(get().mode).length,

        sendVerificationCode: async (email, captchaToken) => {
          set({ status: { status: "sending_code" } })
          try {
            const res = await post<{
              data: {
                verificationId: string
                expiresAt: number
                remainingAttempts: number
              }
            }>("/auth/verification/send", { email, captchaToken })
            const d = res.data
            set({
              status: { status: "code_sent" },
              emailVerification: {
                email,
                verificationId: d.verificationId,
                codeSent: true,
                codeVerified: false,
                expiresAt: d.expiresAt,
                remainingAttempts: d.remainingAttempts,
              },
            })
          } catch (err: unknown) {
            const axiosErr = err as { response?: { status?: number; data?: { error?: string } } }
            const msg = axiosErr?.response?.data?.error || "Failed to send verification code. Please try again."
            set({
              status: { status: "error", code: "email_send_failed", message: msg, canRetry: true },
              error: { code: "email_send_failed", message: msg },
            })
            throw err
          }
        },

        verifyCode: async (code) => {
          const { emailVerification } = get()
          if (!/^\d{6}$/.test(code)) {
            const msg = "Invalid code format."
            set({
              status: { status: "error", code: "email_code_invalid", message: msg, canRetry: false },
              error: { code: "email_code_invalid", message: msg },
            })
            throw new Error(msg)
          }
          try {
            await post("/auth/verification/verify", {
              verificationId: emailVerification.verificationId,
              code,
            })
            set((state) => ({
              status: { status: "idle" } as AuthFlowStatus,
              emailVerification: { ...state.emailVerification, codeVerified: true },
              error: null,
            }))
          } catch (err: unknown) {
            const axiosErr = err as { response?: { status?: number; data?: { error?: string } } }
            const status = axiosErr?.response?.status
            const body = axiosErr?.response?.data
            let msg: string

            if (status === 429) {
              msg = "Too many attempts. Please wait before trying again."
              set({
                status: { status: "error", code: "email_rate_limited", message: msg, canRetry: true },
                error: { code: "email_rate_limited", message: msg },
              })
            } else if (status === 410) {
              msg = "Verification code has expired. Request a new one."
              set({
                status: { status: "error", code: "email_code_expired", message: msg, canRetry: false },
                error: { code: "email_code_expired", message: msg },
              })
            } else {
              msg = (body as { error?: string })?.error || "Invalid code."
              const remaining = typeof (body as { remainingAttempts?: number })?.remainingAttempts === "number"
                ? (body as { remainingAttempts: number }).remainingAttempts
                : Math.max(0, emailVerification.remainingAttempts - 1)
              set((state) => ({
                status: { status: "error", code: "email_code_invalid", message: msg, canRetry: true },
                error: { code: "email_code_invalid", message: msg },
                emailVerification: { ...state.emailVerification, remainingAttempts: remaining },
              }))
            }
            throw new Error(msg)
          }
        },

        resendCode: async () => {
          const { emailVerification } = get()
          if (!emailVerification.email) return
          await get().sendVerificationCode(emailVerification.email)
        },

        clearEmailVerification: () =>
          set({ emailVerification: initialEmailVerification() }),

        setEmailVerificationCodeSent: (email, verificationId) =>
          set((s) => ({
            emailVerification: {
              ...s.emailVerification,
              email,
              verificationId,
              codeSent: true,
              codeVerified: false,
            },
          })),

        setEmailVerified: () =>
          set((s) => ({
            emailVerification: { ...s.emailVerification, codeVerified: true },
          })),

        setNonce: (nonce) =>
          set((s) => ({
            auth: { ...s.auth, nonce, nonceTimestamp: nonce ? Date.now() : null },
          })),

        setRateLimit: (remainingAttempts, cooldownUntil) =>
          set({ rateLimit: { remainingAttempts, cooldownUntil, lastAttemptAt: Date.now() } }),
      }),
      { name: "auth-flow-store" },
    ),
    {
      name: "moistello-auth-flow",
      version: 3,
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        step: state.step,
        auth: state.auth,
        profile: state.profile,
        passkeyVersion: state.passkeyVersion,
        passkeyRevoked: state.passkeyRevoked,
        connection: {
          walletId: state.connection.walletId,
          address: state.connection.address,
        },
      }),
    },
  ),
)
