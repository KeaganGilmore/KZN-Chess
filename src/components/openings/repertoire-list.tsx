'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Rep {
  id: string;
  name: string;
  color: 'white' | 'black';
}

export function RepertoireList() {
  const [reps, setReps] = useState<Rep[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState<'white' | 'black'>('white');

  const load = async () => {
    const r = await fetch('/api/repertoires').then((x) => x.json()).catch(() => ({ repertoires: [] }));
    setReps(r.repertoires || []);
  };
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!name.trim()) return;
    await fetch('/api/repertoires', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    setName('');
    load();
  };
  const remove = async (id: string) => {
    if (!confirm('Delete this repertoire?')) return;
    await fetch(`/api/repertoires/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[180px] space-y-1">
            <label className="text-xs text-muted-foreground">Repertoire name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. London System" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Side</label>
            <select
              value={color}
              onChange={(e) => setColor(e.target.value as 'white' | 'black')}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="white">White</option>
              <option value="black">Black</option>
            </select>
          </div>
          <Button onClick={create}>
            <Plus className="w-4 h-4 mr-1.5" /> Create
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {reps.length === 0 && <p className="text-sm text-muted-foreground">No repertoires yet.</p>}
        {reps.map((r) => (
          <Card key={r.id}>
            <CardContent className="flex items-center justify-between gap-3 p-3">
              <Link href={`/learn/openings/${r.id}`} className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{r.name}</p>
              </Link>
              <Badge variant="outline" className="capitalize">{r.color}</Badge>
              <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => remove(r.id)}>
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
