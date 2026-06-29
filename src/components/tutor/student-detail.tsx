'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface Log {
  id: string;
  session_date: string;
  rating_snapshot: number | null;
  notes: string | null;
  set: { id: string; name: string } | null;
}
interface Student {
  id: string;
  name: string;
  skill_level: string | null;
  notes: string | null;
}

export function StudentDetail({
  student,
  logs,
  sets,
}: {
  student: Student;
  logs: Log[];
  sets: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [skill, setSkill] = useState(student.skill_level || '');
  const [notes, setNotes] = useState(student.notes || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [logSet, setLogSet] = useState('');
  const [rating, setRating] = useState('');
  const [logNotes, setLogNotes] = useState('');

  const saveProfile = async () => {
    await fetch(`/api/tutor/students/${student.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill_level: skill, notes }),
    });
    router.refresh();
  };
  const addLog = async () => {
    await fetch(`/api/tutor/students/${student.id}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_date: date,
        session_set_id: logSet || null,
        rating_snapshot: rating,
        notes: logNotes,
      }),
    });
    setRating('');
    setLogNotes('');
    setLogSet('');
    router.refresh();
  };
  const removeLog = async (id: string) => {
    await fetch(`/api/tutor/students/${student.id}/logs?log_id=${id}`, { method: 'DELETE' });
    router.refresh();
  };

  const snapshots = logs.filter((l) => l.rating_snapshot != null).slice().reverse();

  return (
    <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8">
      {/* Profile + progress */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Skill level</label>
              <Input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="e.g. beginner / U1200" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Notes / topics to work on</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} />
            </div>
            <Button size="sm" onClick={saveProfile}>
              <Save className="w-4 h-4 mr-1.5" /> Save
            </Button>
          </CardContent>
        </Card>

        {snapshots.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {snapshots.map((l) => (
                <div key={l.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{l.session_date}</span>
                  <span className="font-medium">{l.rating_snapshot}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Session log */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Log a session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Rating (your estimate)</label>
                <Input type="number" value={rating} onChange={(e) => setRating(e.target.value)} placeholder="optional" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Session set used</label>
              <select
                value={logSet}
                onChange={(e) => setLogSet(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">None</option>
                {sets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Notes</label>
              <Textarea value={logNotes} onChange={(e) => setLogNotes(e.target.value)} rows={3} placeholder="What you covered, how it went…" />
            </div>
            <Button size="sm" onClick={addLog}>
              <Plus className="w-4 h-4 mr-1.5" /> Add log
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {logs.length === 0 && <p className="text-sm text-muted-foreground">No sessions logged yet.</p>}
          {logs.map((l) => (
            <Card key={l.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{l.session_date}</span>
                    {l.set && <Badge variant="outline">{l.set.name}</Badge>}
                    {l.rating_snapshot != null && <Badge variant="outline">{l.rating_snapshot}</Badge>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeLog(l.id)}>
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
                {l.notes && <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap">{l.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
