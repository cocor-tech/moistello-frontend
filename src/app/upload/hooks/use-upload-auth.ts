"use client"

import { useCallback, useEffect, useState } from "react"
import { getCsrfHeaders } from "@/lib/auth/csrf"
import { logger } from "@/lib/logger"

interface AuthPayload {
  authenticated?: boolean
  error?: string
}

export function useUploadAuth() {
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loggingIn, setLoggingIn] = useState(false)

  useEffect(() => {
    let active = true
    fetch("/api/auth")
      .then(async (response) => {
        const data = (await response.json()) as AuthPayload
        if (active) setAuthenticated(Boolean(data.authenticated))
      })
      .catch((error: unknown) => {
        logger.error("Upload session check failed", { error })
        if (active) setAuthenticated(false)
      })
      .finally(() => {
        if (active) setChecking(false)
      })

    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async () => {
    if (!username.trim() || !password) {
      setLoginError("Enter username and password")
      return
    }

    setLoggingIn(true)
    setLoginError("")
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = (await response.json()) as AuthPayload
      if (response.ok) {
        setAuthenticated(true)
      } else {
        setLoginError(data.error || "Login failed")
      }
    } catch (error: unknown) {
      logger.error("Upload login failed", { error })
      setLoginError("Network error")
    } finally {
      setLoggingIn(false)
    }
  }, [password, username])

  const logout = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", headers: getCsrfHeaders() })
      if (!response.ok) {
        logger.warn("Upload logout request was rejected", { status: response.status })
        return false
      }
      setAuthenticated(false)
      return true
    } catch (error: unknown) {
      logger.warn("Upload logout request failed", { error })
      return false
    }
  }, [])

  return {
    authenticated,
    checking,
    username,
    password,
    loginError,
    loggingIn,
    setUsername,
    setPassword,
    login,
    logout,
  }
}
