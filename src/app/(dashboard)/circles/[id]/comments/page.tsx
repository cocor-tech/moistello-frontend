"use client"

import React, { useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, MessageSquare, Send, Heart } from "lucide-react"
import { useCircle } from "@/hooks/use-circles"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button, ButtonLink } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { cn } from "@/lib/cn"
import { formatRelativeTime } from "@/lib/formatters"

interface Comment {
  id: string
  userId: string
  userName: string
  body: string
  createdAt: string
  likes: number
  likedByUser: boolean
  isPinned: boolean
  replies?: Comment[]
}

function generateMockComments(): Comment[] {
  return [
    {
      id: "c1", userId: "u1", userName: "Alice", body: "Great first round everyone! Looking forward to the payout.",
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), likes: 3, likedByUser: false, isPinned: true,
      replies: [
        { id: "r1", userId: "u2", userName: "Bob", body: "Agreed! Let's keep the momentum going.", createdAt: new Date(Date.now() - 3600000).toISOString(), likes: 1, likedByUser: false, isPinned: false },
      ],
    },
    {
      id: "c2", userId: "u3", userName: "Carol", body: "When is the next round due? I want to make sure I contribute on time.",
      createdAt: new Date(Date.now() - 86400000).toISOString(), likes: 0, likedByUser: false, isPinned: false,
    },
  ]
}

function CommentThread({ comment, onLike, onReply }: { comment: Comment; onLike: (id: string) => void; onReply: (parentId: string, body: string) => void }) {
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState("")

  const handleSubmitReply = () => {
    if (!replyText.trim()) return
    onReply(comment.id, replyText.trim())
    setReplyText("")
    setShowReply(false)
  }

  return (
    <div className={cn("space-y-3", comment.isPinned && "bg-amber-500/5 -mx-4 px-4 py-3 rounded-xl")}>
      <div className="flex items-start gap-3">
        <Avatar fallback={comment.userName} size="sm" className="shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-heading font-semibold text-foreground dark:text-white">{comment.userName}</span>
            {comment.isPinned && <Badge variant="primary" size="sm">Pinned</Badge>}
            <span className="text-2xs text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>
          </div>
          <p className="text-sm text-foreground/80 mt-1">{comment.body}</p>
          <div className="flex items-center gap-3 mt-2">
            <button type="button" aria-label={comment.likedByUser ? "Unlike comment" : "Like comment"} onClick={() => onLike(comment.id)} className={cn("inline-flex items-center gap-1 text-xs transition-colors", comment.likedByUser ? "text-red-400" : "text-muted-foreground hover:text-red-400")}>
              <Heart className={cn("h-3.5 w-3.5", comment.likedByUser && "fill-current")} />
              {comment.likes > 0 && comment.likes}
            </button>
            <button type="button" onClick={() => setShowReply(!showReply)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Reply</button>
          </div>

          {showReply && (
            <div className="mt-2 flex items-start gap-2">
              <input
                aria-label="Reply text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmitReply()}
                placeholder="Write a reply..."
                className="flex-1 bg-white/5 border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
              <Button type="button" variant="primary" size="xs" aria-label="Send reply" onClick={handleSubmitReply} disabled={!replyText.trim()}><Send className="h-3.5 w-3.5" aria-hidden="true" /></Button>
            </div>
          )}
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-8 space-y-3 border-l-2 border-border pl-4">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex items-start gap-3">
              <Avatar fallback={reply.userName} size="sm" className="shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-heading font-semibold text-foreground dark:text-white">{reply.userName}</span>
                  <span className="text-2xs text-muted-foreground">{formatRelativeTime(reply.createdAt)}</span>
                </div>
                <p className="text-sm text-foreground/80 mt-0.5">{reply.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CommentsPage() {
  const params = useParams()
  const circleId = params.id as string

  const { data: circle } = useCircle(circleId)

  const [comments, setComments] = useState<Comment[]>(generateMockComments)
  const [newComment, setNewComment] = useState("")
  const [loading, setLoading] = useState(false)

  const handlePost = useCallback(() => {
    if (!newComment.trim()) return
    setLoading(true)
    const comment: Comment = {
      id: `c${Date.now()}`,
      userId: "anon",
      userName: "You",
      body: newComment.trim(),
      createdAt: new Date().toISOString(),
      likes: 0, likedByUser: false, isPinned: false,
    }
    setTimeout(() => {
      setComments((prev) => [comment, ...prev])
      setNewComment("")
      setLoading(false)
    }, 300)
  }, [newComment])

  const handleLike = useCallback((id: string) => {
    setComments((prev) => prev.map((c) => c.id === id ? { ...c, likedByUser: !c.likedByUser, likes: c.likedByUser ? c.likes - 1 : c.likes + 1 } : c))
  }, [])

  const handleReply = useCallback((parentId: string, body: string) => {
    const reply: Comment = {
      id: `r${Date.now()}`,
      userId: "anon",
      userName: "You",
      body,
      createdAt: new Date().toISOString(),
      likes: 0, likedByUser: false, isPinned: false,
    }
    setComments((prev) => prev.map((c) => c.id === parentId ? { ...c, replies: [...(c.replies ?? []), reply] } : c))
  }, [])

  const pinned = comments.filter((c) => c.isPinned)
  const regular = comments.filter((c) => !c.isPinned)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comments"
        description={`${comments.length} comment${comments.length !== 1 ? "s" : ""}`}
        breadcrumbs={[{ label: "Circles", href: "/circles" }, { label: circle?.name ?? "Circle", href: `/circles/${circleId}` }, { label: "Comments" }]}
        action={<ButtonLink href={`/circles/${circleId}`}  variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>Back</ButtonLink>}
      />

      <div className="flex items-start gap-2">
        <Avatar fallback="You" size="sm" className="shrink-0 mt-1" />
        <div className="flex-1">
          <textarea
            aria-label="New comment"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share a thought about this circle..."
            rows={2}
            className="w-full bg-white/5 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
          />
          <div className="flex justify-end mt-2">
            <Button variant="primary" size="sm" onClick={handlePost} isLoading={loading} disabled={!newComment.trim()} leftIcon={<Send className="h-3.5 w-3.5" />}>Post</Button>
          </div>
        </div>
      </div>

      {pinned.length > 0 && (
        <div className="space-y-4">
          <p className="text-2xs font-heading tracking-wider uppercase text-muted-foreground">Pinned</p>
          {pinned.map((c) => <CommentThread key={c.id} comment={c} onLike={handleLike} onReply={handleReply} />)}
        </div>
      )}

      {regular.length === 0 && pinned.length === 0 ? (
        <EmptyState icon={<MessageSquare className="h-6 w-6" />} title="No comments yet" description="Be the first to share your thoughts." />
      ) : (
        <div className="space-y-6">
          <p className="text-2xs font-heading tracking-wider uppercase text-muted-foreground">{regular.length > 0 ? "Recent Comments" : ""}</p>
          {regular.map((c) => <CommentThread key={c.id} comment={c} onLike={handleLike} onReply={handleReply} />)}
        </div>
      )}
    </div>
  )
}
