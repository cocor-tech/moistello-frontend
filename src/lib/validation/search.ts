import { z } from "zod"

export const searchSchema = z.object({
  query: z
    .string()
    .min(1, "Enter a search term")
    .max(200, "Search term is too long"),
})

export type SearchInput = z.infer<typeof searchSchema>