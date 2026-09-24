import { z } from "zod"

export const ticketSchema = z.object({
  name: z.string().min(1, "Name is required").max(120, "Name is too long"),
  subject: z
    .string()
    .min(1, "Subject is required")
    .min(4, "Subject must be at least 4 characters")
    .max(200, "Subject must be 200 characters or fewer"),
  category: z.string().min(1, "Select a category"),
  message: z
    .string()
    .min(1, "Describe your issue")
    .min(20, "Please provide more detail (at least 20 characters)")
    .max(5000, "Message must be 5000 characters or fewer"),
  priority: z.enum(["low", "medium", "high", "urgent"]).catch("medium"),
})

export type TicketInput = z.infer<typeof ticketSchema>