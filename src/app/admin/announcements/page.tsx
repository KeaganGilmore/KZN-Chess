'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Loader2, Megaphone, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const emptyForm = { title: '', content: '', is_active: true, start_date: '', end_date: '' };

export default function AdminAnnouncementsPage() {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState<Announcement | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch('/api/announcements?all=true');
      if (!res.ok) throw new Error();
      setAnnouncements(await res.json());
    } catch {
      toast({ title: 'Failed to load announcements', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setForm({
      title: a.title,
      content: a.content,
      is_active: a.is_active,
      start_date: a.start_date ? a.start_date.slice(0, 10) : '',
      end_date: a.end_date ? a.end_date.slice(0, 10) : '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: 'Title and content are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      is_active: form.is_active,
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
    };
    try {
      const res = await fetch(
        editing ? `/api/announcements/${editing.id}` : '/api/announcements',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error);
      }
      toast({ title: editing ? 'Announcement updated' : 'Announcement published' });
      setDialogOpen(false);
      fetchAnnouncements();
    } catch (err: any) {
      toast({ title: err.message || 'Failed to save announcement', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (a: Announcement) => {
    const res = await fetch(`/api/announcements/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !a.is_active }),
    });
    if (res.ok) {
      toast({ title: a.is_active ? 'Announcement hidden' : 'Announcement activated' });
      fetchAnnouncements();
    } else {
      toast({ title: 'Failed to update announcement', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const res = await fetch(`/api/announcements/${deleting.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast({ title: 'Announcement deleted' });
      fetchAnnouncements();
    } else {
      toast({ title: 'Failed to delete announcement', variant: 'destructive' });
    }
    setDeleting(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" />
            Announcements
          </h1>
          <p className="text-muted-foreground mt-1">
            Site-wide announcements shown as a banner on the home page.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          New Announcement
        </Button>
      </div>

      <div className="space-y-3">
        {announcements.map((a) => (
          <Card key={a.id}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{a.title}</h3>
                    <Badge variant={a.is_active ? 'default' : 'outline'}>
                      {a.is_active ? 'Active' : 'Hidden'}
                    </Badge>
                    {a.end_date && new Date(a.end_date) < new Date() && (
                      <Badge variant="outline" className="text-orange-400 border-orange-400/30">
                        Expired
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Created {format(new Date(a.created_at), 'd MMM yyyy')}
                    {a.end_date && ` · ends ${format(new Date(a.end_date), 'd MMM yyyy')}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={a.is_active} onCheckedChange={() => toggleActive(a)} />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleting(a)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {announcements.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No announcements yet. Create one to show a banner on the home page.
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => !saving && setDialogOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ann-title">Title</Label>
              <Input
                id="ann-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. KZN Closed Championship entries open"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ann-content">Content</Label>
              <Textarea
                id="ann-content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={3}
                placeholder="The announcement text shown in the banner..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ann-start">Start date (optional)</Label>
                <Input
                  id="ann-start"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ann-end">End date (optional)</Label>
                <Input
                  id="ann-end"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="ann-active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
              <Label htmlFor="ann-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete announcement?"
        description={deleting ? `"${deleting.title}" will be permanently removed.` : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
