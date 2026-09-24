import { z } from "zod"

const githubUrlRegex = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+[A-Za-z0-9_-]$/

export const contributorSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(120, "Name is too long"),
  github: z
    .string()
    .min(1, "GitHub profile is required")
    .refine((value) => /^https:\/\/github\.com\//i.test(value), {
      message: "Please enter a GitHub URL starting with https://github.com/",
    })
    .refine((value) => githubUrlRegex.test(value), {
      message: "Please enter a valid GitHub profile URL",
    }),
  contribution: z.string().min(1, "Select an area"),
  bio: z.string().max(1000, "Bio must be 1000 characters or fewer").optional(),
})

export type ContributorInput = z.infer<typeof contributorSchema>