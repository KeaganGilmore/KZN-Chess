'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';

export default function AdminDistrictsPage() {
  const { toast } = useToast();
  const [districts, setDistricts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState<any | null>(null);
  const [newDistrict, setNewDistrict] = useState({
    name: '',
    region: '',
    coordinator_name: '',
    coordinator_email: '',
    coordinator_phone: '',
  });

  const fetchDistricts = async () => {
    try {
      const res = await fetch('/api/districts');
      if (!res.ok) throw new Error();
      setDistricts(await res.json());
    } catch {
      toast({ title: 'Failed to load districts', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistricts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = async () => {
    if (!newDistrict.name.trim()) {
      toast({ title: 'District name is required', variant: 'destructive' });
      return;
    }
    const res = await fetch('/api/districts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDistrict),
    });
    if (res.ok) {
      toast({ title: 'District added' });
      setShowAdd(false);
      setNewDistrict({ name: '', region: '', coordinator_name: '', coordinator_email: '', coordinator_phone: '' });
      fetchDistricts();
    } else {
      const data = await res.json().catch(() => ({}));
      toast({ title: data.error || 'Failed to add district', variant: 'destructive' });
    }
  };

  const handleSave = async (id: string) => {
    const res = await fetch(`/api/districts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData),
    });
    if (res.ok) {
      toast({ title: 'District updated' });
      setEditing(null);
      fetchDistricts();
    } else {
      const data = await res.json().catch(() => ({}));
      toast({ title: data.error || 'Failed to update district', variant: 'destructive' });
    }
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    const res = await fetch(`/api/districts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active }),
    });
    if (!res.ok) {
      toast({ title: 'Failed to update district', variant: 'destructive' });
    }
    fetchDistricts();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const res = await fetch(`/api/districts/${deleting.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast({ title: 'District deleted' });
      fetchDistricts();
    } else {
      const data = await res.json().catch(() => ({}));
      toast({ title: data.error || 'Failed to delete district', variant: 'destructive' });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">District Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage KZN chess districts and coordinators.
          </p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add District
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New District</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newDistrict.name}
                  onChange={(e) => setNewDistrict({ ...newDistrict, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Region</Label>
                <Input
                  value={newDistrict.region}
                  onChange={(e) => setNewDistrict({ ...newDistrict, region: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Coordinator Name</Label>
                <Input
                  value={newDistrict.coordinator_name}
                  onChange={(e) => setNewDistrict({ ...newDistrict, coordinator_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Coordinator Email</Label>
                <Input
                  value={newDistrict.coordinator_email}
                  onChange={(e) => setNewDistrict({ ...newDistrict, coordinator_email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Coordinator Phone</Label>
                <Input
                  value={newDistrict.coordinator_phone}
                  onChange={(e) => setNewDistrict({ ...newDistrict, coordinator_phone: e.target.value })}
                />
              </div>
              <Button onClick={handleAdd} className="w-full">
                Add District
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {districts.map((d) => (
          <Card key={d.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                {editing === d.id ? (
                  <Input
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="font-semibold"
                  />
                ) : (
                  <CardTitle className="text-base">{d.name}</CardTitle>
                )}
                <div className="flex items-center gap-1">
                  <Switch
                    checked={d.is_active}
                    onCheckedChange={(v) => toggleActive(d.id, v)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {editing === d.id ? (
                <div className="space-y-3">
                  <Input
                    placeholder="Region"
                    value={editData.region || ''}
                    onChange={(e) => setEditData({ ...editData, region: e.target.value })}
                  />
                  <Input
                    placeholder="Coordinator Name"
                    value={editData.coordinator_name || ''}
                    onChange={(e) => setEditData({ ...editData, coordinator_name: e.target.value })}
                  />
                  <Input
                    placeholder="Email"
                    value={editData.coordinator_email || ''}
                    onChange={(e) => setEditData({ ...editData, coordinator_email: e.target.value })}
                  />
                  <Input
                    placeholder="Phone"
                    value={editData.coordinator_phone || ''}
                    onChange={(e) => setEditData({ ...editData, coordinator_phone: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSave(d.id)} className="gap-1">
                      <Save className="w-3.5 h-3.5" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {d.region && (
                    <p className="text-muted-foreground">{d.region}</p>
                  )}
                  {d.coordinator_name && (
                    <p>
                      <span className="text-muted-foreground">Coordinator:</span>{' '}
                      {d.coordinator_name}
                    </p>
                  )}
                  {d.coordinator_email && (
                    <p className="text-muted-foreground text-xs">{d.coordinator_email}</p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(d.id);
                        setEditData(d);
                      }}
                      className="gap-1"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleting(d)}
                      className="gap-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete district?"
        description={
          deleting
            ? `"${deleting.name}" will be permanently removed. Districts with tournaments cannot be deleted — deactivate them instead.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
