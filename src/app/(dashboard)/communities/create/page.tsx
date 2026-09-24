"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Users, Check } from "lucide-react"
import { Button, ButtonLink } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { post } from "@/lib/api-client"
import { useUIStore } from "@/stores/ui-store"
import { Routes } from "@/lib/constants"

const CATEGORIES = [
  { value: "community", label: "Community" },
  { value: "finance", label: "Finance" },
  { value: "tech", label: "Tech" },
  { value: "social_impact", label: "Social Impact" },
  { value: "education", label: "Education" },
  { value: "entertainment", label: "Entertainment" },
  { value: "other", label: "Other" },
]

export default function CreateCommunityPage() {
  const router = useRouter()
  const addToast = useUIStore((s) => s.addToast)

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("community")
  const [tagsInput, setTagsInput] = useState("")
  const [creating, setCreating] = useState(false)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  const generateSlug = (val: string) =>
    val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

  const handleNameChange = (val: string) => {
    setName(val)
    if (!slugManuallyEdited) {
      setSlug(generateSlug(val))
    }
  }

  const handleCreate = useCallback(async () => {
    if (!name.trim() || !slug.trim()) return
    setCreating(true)
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean)
      const res = await post("/communities", {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        category,
        tags,
      })
      const envelope = (res as Record<string, unknown>)?.data as Record<string, unknown> ?? res as Record<string, unknown>
      const community = (envelope?.community ?? envelope) as Record<string, unknown>
      const communityId = String(community?.id ?? "")
      addToast({ type: "success", title: "Community created!", description: "Your community is now live." })
      router.push(`${Routes.COMMUNITIES}/${communityId}`)
    } catch (err) {
      const msg = (err && typeof err === "object" && "message" in err)
        ? (err as { message: string }).message
        : "Failed to create community"
      addToast({ type: "error", title: "Creation failed", description: msg })
    } finally {
      setCreating(false)
    }
  }, [name, slug, description, category, tagsInput, router, addToast])

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={Routes.COMMUNITIES} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Back to communities">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">Create Community</h1>
          <p className="text-sm text-muted-foreground">Start a new savings community</p>
        </div>
      </div>

      <div className="glass-premium rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-5 w-5 text-aurora-violet" />
          <h3 className="font-heading text-sm font-semibold text-foreground">Community Details</h3>
        </div>

        <Input
          label="Community Name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g. Lagos Tech Savers"
          maxLength={100}
          hint="2-100 characters"
        />

        <Input
          label="URL Slug"
          value={slug}
          onChange={(e) => { setSlug(generateSlug(e.target.value)); setSlugManuallyEdited(true) }}
          placeholder="lagos-tech-savers"
          maxLength={120}
          hint="Used in the URL: /communities/{slug}"
        />

        <div>
          <label htmlFor="community-description" className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label>
          <textarea
            id="community-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this community about?"
            rows={3}
            maxLength={2000}
            className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-aurora-violet/50 resize-none"
          />
        </div>

        <Select
          label="Category"
          options={CATEGORIES}
          value={category}
          onChange={setCategory}
        />

        <Input
          label="Tags (comma-separated)"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="savings, tech, lagos"
          hint="Up to 10 tags"
        />

        <div className="flex items-center justify-end gap-3 pt-2">
          <ButtonLink href={Routes.COMMUNITIES} variant="outline" size="md">Cancel</ButtonLink>
          <Button
            variant="primary"
            size="md"
            onClick={handleCreate}
            isLoading={creating}
            disabled={!name.trim() || !slug.trim()}
            leftIcon={<Check className="h-4 w-4" />}
          >
            {creating ? "Creating..." : "Create Community"}
          </Button>
        </div>
      </div>
    </div>
  )
}
