import {
  BookOpen,
  Cpu,
  Database,
  GitBranch,
  Key,
  Shield,
  Users,
  Zap,
} from "lucide-react"

export const developerStats = [
  { icon: Zap, label: "API Endpoints", value: "27", color: "text-cyan-700 dark:text-cyan-300" },
  { icon: Shield, label: "Smart Contracts", value: "7", color: "text-indigo-700 dark:text-indigo-300" },
  { icon: Database, label: "Ready to Deploy", value: "Testnet", color: "text-emerald-700 dark:text-emerald-300" },
  { icon: Cpu, label: "Source", value: "Open", color: "text-violet-700 dark:text-violet-300" },
]

export const quickStartSteps = [
  {
    title: "Get a Challenge",
    endpoint: "POST /v1/auth/nonce",
    description: "Request passkey authentication challenge",
    mobileDescription: "GET /v1/auth/nonce",
  },
  {
    title: "Sign & Verify",
    endpoint: "POST /v1/auth/verify",
    description: "Sign with your biometric passkey",
    mobileDescription: "Sign & verify",
  },
  {
    title: "Access API",
    endpoint: "Authorization: Bearer",
    description: "Use JWT token in requests",
    mobileDescription: "Use a Bearer token",
  },
]

export const apiEndpointGroups = [
  {
    category: "Authentication",
    icon: Key,
    color: "text-violet-700 dark:text-violet-300",
    endpoints: [
      { method: "POST", path: "/v1/auth/nonce", desc: "Get passkey registration/authentication challenge" },
      { method: "POST", path: "/v1/auth/verify", desc: "Verify passkey signature and login" },
      { method: "POST", path: "/v1/auth/register", desc: "Register with passkey" },
      { method: "POST", path: "/v1/auth/refresh", desc: "Refresh JWT tokens" },
      { method: "POST", path: "/v1/auth/logout", desc: "Invalidate session" },
    ],
  },
  {
    category: "Circles",
    icon: Users,
    color: "text-cyan-700 dark:text-cyan-300",
    endpoints: [
      { method: "GET", path: "/v1/circles", desc: "List circles" },
      { method: "POST", path: "/v1/circles", desc: "Create a circle" },
      { method: "GET", path: "/v1/circles/{id}", desc: "Get a circle" },
      { method: "PATCH", path: "/v1/circles/{id}", desc: "Update circle settings" },
    ],
  },
  {
    category: "Contributions",
    icon: Database,
    color: "text-emerald-700 dark:text-emerald-300",
    endpoints: [
      { method: "GET", path: "/v1/contributions", desc: "List contributions" },
      { method: "GET", path: "/v1/contributions/{id}", desc: "Get contribution" },
    ],
  },
]

export const errorCodes = [
  { code: "400", desc: "Bad Request", detail: "Invalid parameters or malformed request" },
  { code: "401", desc: "Unauthorized", detail: "Missing or invalid authentication" },
  { code: "403", desc: "Forbidden", detail: "Insufficient permissions" },
  { code: "404", desc: "Not Found", detail: "Resource does not exist" },
  { code: "409", desc: "Conflict", detail: "Resource already exists" },
  { code: "422", desc: "Unprocessable", detail: "Validation failed" },
  { code: "429", desc: "Rate Limited", detail: "Too many requests" },
  { code: "500", desc: "Server Error", detail: "Internal error, try again later" },
]

export const developerCommitments = [
  { icon: Zap, title: "27 Endpoints", description: "Complete REST API for all platform features." },
  { icon: Shield, title: "Open Source", description: "All code publicly available for review." },
  { icon: Database, title: "Testnet Ready", description: "Start building with test tokens immediately." },
]

export const developerResources = [
  {
    title: "API Documentation",
    description: "Swagger UI with live testing",
    href: "/docs/api",
    icon: BookOpen,
    iconClass: "text-violet-700 dark:text-violet-300",
  },
  {
    title: "GitHub",
    description: "Source code",
    href: "https://github.com/orgs/cocor-tech/repositories",
    icon: GitBranch,
    iconClass: "text-muted-foreground",
  },
]
