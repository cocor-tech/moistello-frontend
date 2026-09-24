import { z } from "zod"
import type { FieldError, FieldValues, Resolver } from "react-hook-form"

/**
 * Minimal zod → react-hook-form resolver.
 *
 * Hand-rolled instead of pulling in `@hookform/resolvers`: the published
 * resolver delegates to `@typeschema/*` adapters whose optional peer chain
 * conflicts with zod v4 in a strict npm install (ERESOLVE), which would break
 * the repo's CI (`npm ci`). Our schemas are flat objects and gates are
 * per-field + per-message, so a ~30 line adapter gives identical behaviour
 * with zero extra dependencies.
 *
 * Usage:
 *
 *   useForm({
 *     resolver: zodResolver(loginSchema),
 *     mode: "onTouched",
 *   })
 */
type ResolverValues<TSchema extends z.ZodTypeAny> = z.output<TSchema> & FieldValues

export function zodResolver<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
): Resolver<ResolverValues<TSchema>, unknown> {
  return (async (values: unknown) => {
    const result = schema.safeParse(values)
    if (result.success) {
      return { values: result.data, errors: {} }
    }

    const errors: Record<string, FieldError> = {}
    for (const issue of result.error.issues) {
      const key = issue.path.join(".")
      // First message wins per field, matching react-hook-form's reporting of
      // a single error per field.
      if (key && !errors[key]) {
        errors[key] = { type: issue.code, message: issue.message }
      }
    }

    return {
      values: {} as ResolverValues<TSchema>,
      errors,
    }
  }) as unknown as Resolver<ResolverValues<TSchema>, unknown>
}