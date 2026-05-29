import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { User, MessageSquare } from "lucide-react";

export function DiscussionPanel({ questionId }: { questionId: string }) {
  const { token, user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [questionId]);

  async function fetchComments() {
    try {
      const data = await api<any[]>(`/api/discussion/${questionId}`);
      setComments(data);
    } catch (err) {
      toast.error("Failed to load discussion");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      toast.error("You must be logged in to comment.");
      return;
    }
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const added = await api<any>(`/api/discussion/${questionId}`, {
        method: "POST",
        token,
        body: JSON.stringify({ content: newComment.trim() }),
      });
      setComments([added, ...comments]);
      setNewComment("");
      toast.success("Comment posted");
    } catch (err: any) {
      toast.error(err.message || "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground animate-pulse">Loading discussion...</div>;
  }

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm font-semibold">No comments yet.</p>
            <p className="text-xs">Be the first to start the discussion!</p>
          </div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="bg-card/45 border border-border p-4 rounded-xl flex gap-3 shadow-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                {c.user.avatarUrl ? (
                  <img src={c.user.avatarUrl} alt={c.user.name} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{c.user.name}</span>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{c.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-4 border-t border-border mt-auto">
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your approach or ask a question..."
            className="text-sm resize-none"
            rows={3}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting || !newComment.trim()} size="sm" className="font-bold">
              Post Comment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
