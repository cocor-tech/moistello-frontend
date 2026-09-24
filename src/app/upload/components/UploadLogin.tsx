import type { FormEvent } from "react"
import { motion } from "framer-motion"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface UploadLoginProps {
  username: string
  password: string
  loginError: string
  loggingIn: boolean
  onUsernameChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onLogin: () => void
}

export function UploadLogin({
  username,
  password,
  loginError,
  loggingIn,
  onUsernameChange,
  onPasswordChange,
  onLogin,
}: UploadLoginProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onLogin()
  }

  return (
    <div className="min-h-screen bg-void auroral-mesh flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card/80 border border-white/10 rounded-xl p-8 max-w-sm w-full holo-border"
        aria-labelledby="upload-login-title"
      >
        <div className="text-center mb-8">
          <h1 id="upload-login-title" className="font-heading text-2xl gradient-text">Admin Login</h1>
          <p className="text-muted-foreground text-sm mt-2">Sign in to manage uploaded pages</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit} aria-label="Admin login form">
          <Input
            label="Username"
            name="username"
            autoComplete="username"
            aria-describedby={loginError ? "upload-login-error" : undefined}
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            disabled={loggingIn}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            aria-describedby={loginError ? "upload-login-error" : undefined}
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            disabled={loggingIn}
          />
          {loginError && (
            <div id="upload-login-error" className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-2 text-sm text-red-400" role="alert" aria-live="assertive">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              {loginError}
            </div>
          )}
          <Button
            type="submit"
            variant="premium"
            size="lg"
            className="w-full rounded-xl"
            disabled={loggingIn}
            isLoading={loggingIn}
          >
            {loggingIn ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <p className="text-[10px] text-muted-foreground/40 text-center mt-6">
          Don&apos;t have an account? Run{" "}
          <code className="bg-white/5 border border-white/10 px-1 py-0.5 rounded font-mono">node scripts/create-user.js</code>{" "}
          on the server.
        </p>
      </motion.div>
    </div>
  )
}
