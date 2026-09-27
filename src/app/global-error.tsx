"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const errorMessage =
    process.env.NODE_ENV === "development"
      ? error?.stack || error?.message || String(error)
      : "Something went wrong. Please try again later."

  return (
    <html>
      <body>
        <pre style={{ padding: "2rem", whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: "14px" }}>
          {errorMessage}
        </pre>
        <button type="button" aria-label="Retry rendering the application" onClick={() => reset()} style={{ margin: "0 2rem", padding: "0.5rem 1rem" }}>
          Try again
        </button>
      </body>
    </html>
  )
}
