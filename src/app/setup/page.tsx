"use client";

import { logger } from "@/lib/logger"
import { getCsrfHeaders } from "@/lib/auth/csrf"
import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function SetupForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [step, setStep] = useState<"form" | "loading" | "success" | "error">("form");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) setStep("error");
  }, [token]);

  const handleSubmit = async () => {
    setError("");
    if (!username.trim()) { setError("Username is required"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    if (!token) { setError("No setup token provided"); return; }

    setStep("loading");

    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ token, username: username.trim(), password }),
      });
      const data = await res.json();

      if (res.ok) {
        setStep("success");
        setTimeout(() => router.push("/upload"), 1500);
      } else {
        setStep("form");
        setError(data.error || "Setup failed");
      }
    } catch (e) {
      logger.error("[setup] Setup failed:", e)
      setStep("form");
      setError("Network error — try again");
    }
  };

  return (
    <div className="min-h-screen bg-void auroral-mesh flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-premium rounded-3xl p-8 max-w-md w-full holo-border"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl gradient-bg-extended flex items-center justify-center mx-auto mb-4">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-heading text-2xl gradient-text">Create Account</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Set your username and password to access the admin panel.
          </p>
        </div>

        {step === "error" && !token && (
          <div className="glass rounded-xl p-4 flex items-center gap-3 text-sm">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <p className="text-muted-foreground">
              No setup token found. Use the link provided by your server administrator.
            </p>
          </div>
        )}

        {step === "success" ? (
          <div className="text-center py-4">
            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
            <p className="font-heading text-lg">Account created!</p>
            <p className="text-muted-foreground text-sm mt-1">Redirecting to upload page...</p>
          </div>
        ) : token ? (
          <div className="space-y-4">
            <Input label="Username" placeholder="Choose a username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={step === "loading"} />
            <Input label="Password" type="password" placeholder="Min 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} disabled={step === "loading"} />
            <Input label="Confirm Password" type="password" placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={step === "loading"} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
            {error && (
              <div className="glass rounded-xl p-3 flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4" />{error}
              </div>
            )}
            <Button variant="premium" size="lg" className="w-full rounded-xl" disabled={step === "loading"} isLoading={step === "loading"} onClick={handleSubmit}>
              {step === "loading" ? "Creating..." : "Create Account"}
            </Button>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-void flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-aurora-violet border-t-transparent rounded-full" /></div>}>
      <SetupForm />
    </Suspense>
  );
}
