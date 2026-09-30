export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4
  warning: string
  suggestions: string[]
  isAcceptable: boolean
}

export const MIN_REQUIRED_PASSWORD_SCORE = 2

/**
 * Evaluates password strength based on entropy, dictionary patterns, and structural composition.
 * Conforms to zxcvbn score specification (0: Very Weak to 4: Very Strong).
 */
export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return {
      score: 0,
      warning: "Password is required",
      suggestions: ["Enter a password with at least 8 characters"],
      isAcceptable: false,
    }
  }

  const length = password.length
  let score: 0 | 1 | 2 | 3 | 4 = 0
  const suggestions: string[] = []
  let warning = ""

  // Common weak patterns check
  const commonWeak = [
    "password", "123456", "12345678", "qwerty", "admin", "welcome",
    "moistello", "letmein", "monkey", "dragon", "123123", "abc123"
  ]

  const lower = password.toLowerCase()
  if (commonWeak.some((pattern) => lower.includes(pattern))) {
    return {
      score: 0,
      warning: "This is a commonly used weak password",
      suggestions: ["Avoid common words and predictable character combinations"],
      isAcceptable: false,
    }
  }

  // Calculate character set diversity
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasDigit = /[0-9]/.test(password)
  const hasSymbol = /[^a-zA-Z0-9]/.test(password)
  const varietyCount = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length

  // Base score calculation from length and variety
  if (length < 8) {
    score = 0
    warning = "Password is too short"
    suggestions.push("Use at least 8 characters")
  } else if (length >= 8 && length < 10) {
    score = varietyCount >= 3 ? 2 : 1
  } else if (length >= 10 && length < 14) {
    score = varietyCount >= 3 ? 3 : 2
  } else {
    // 14+ chars
    score = varietyCount >= 2 ? 4 : 3
  }

  // Suggestions for improvement
  if (!hasUpper) suggestions.push("Add uppercase letters (A-Z)")
  if (!hasDigit) suggestions.push("Add numbers (0-9)")
  if (!hasSymbol) suggestions.push("Add special characters (!@#$)")
  if (length < 12) suggestions.push("Make your password longer for better security")

  if (score < MIN_REQUIRED_PASSWORD_SCORE && !warning) {
    warning = "Password strength is insufficient"
  }

  const isAcceptable = score >= MIN_REQUIRED_PASSWORD_SCORE && length >= 8

  return {
    score,
    warning,
    suggestions: suggestions.slice(0, 2),
    isAcceptable,
  }
}
