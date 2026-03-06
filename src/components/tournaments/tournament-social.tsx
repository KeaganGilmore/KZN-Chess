'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { Heart, MessageCircle, Send, Trash2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { TournamentComment } from '@/lib/types';

export function TournamentSocial({ tournamentId }: { tournamentId: string }) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const { toast } = useToast();

  const [comments, setComments] = useState<TournamentComment[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    fetch(`/api/tournaments/${tournamentId}/comments`)
      .then((r) => r.json())
      .then(setComments)
      .catch(() => {});

    fetch(`/api/tournaments/${tournamentId}/likes`)
      .then((r) => r.json())
      .then((d) => {
        setLikeCount(d.count);
        setUserLiked(d.userLiked);
      })
      .catch(() => {});
  }, [tournamentId]);

  const handleLike = async () => {
    if (!user) {
      toast({ title: 'Sign in to like tournaments', variant: 'destructive' });
      return;
    }
    setLiking(true);
    const res = await fetch(`/api/tournaments/${tournamentId}/likes`, {
      method: 'POST',
    });
    if (res.ok) {
      const { liked } = await res.json();
      setUserLiked(liked);
      setLikeCount((c) => (liked ? c + 1 : c - 1));
    }
    setLiking(false);
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    if (!user) {
      toast({ title: 'Sign in to comment', variant: 'destructive' });
      return;
    }
    setPosting(true);
    const res = await fetch(`/api/tournaments/${tournamentId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newComment }),
    });
    if (res.ok) {
      const comment = await res.json();
      setComments((prev) => [comment, ...prev]);
      setNewComment('');
    } else {
      const data = await res.json();
      toast({ title: data.error || 'Failed to post comment', variant: 'destructive' });
    }
    setPosting(false);
  };

  const handleDelete = async (commentId: string) => {
    const res = await fetch(`/api/tournaments/${tournamentId}/comments`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId }),
    });
    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-primary/10 text-primary border-primary/20',
    organizer: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    player: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-6">
      {/* Like button */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleLike}
          disabled={liking}
          className={cn(
            'gap-2 transition-all',
            userLiked && 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
          )}
        >
          <Heart className={cn('w-4 h-4', userLiked && 'fill-current')} />
          {likeCount}
        </Button>
        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
          <MessageCircle className="w-4 h-4" />
          {comments.length} comment{comments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Comment box */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Discussion
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {user && (
            <div className="flex gap-3">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts about this tournament..."
                rows={2}
                className="resize-none"
              />
              <Button
                onClick={handleComment}
                disabled={posting || !newComment.trim()}
                size="icon"
                className="shrink-0 self-end"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}

          {!user && (
            <p className="text-sm text-muted-foreground text-center py-3">
              Sign in to join the discussion
            </p>
          )}

          {comments.length > 0 && <Separator />}

          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {comment.user?.name || 'Unknown'}
                    </span>
                    {comment.user?.role && (
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] px-1.5 py-0', roleColors[comment.user.role])}
                      >
                        {comment.user.role === 'admin' && <Shield className="w-2.5 h-2.5 mr-0.5" />}
                        {comment.user.role}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(comment.created_at), 'd MMM yyyy, HH:mm')}
                    </span>
                  </div>
                  {(user?.id === comment.user_id || user?.role === 'admin') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(comment.id)}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>

          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No comments yet. Be the first to share your thoughts!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
