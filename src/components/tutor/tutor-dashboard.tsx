'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, FolderOpen, GraduationCap, Puzzle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface SessionSet {
  id: string;
  name: string;
  skill_level: string | null;
  puzzle_count: number;
}
interface Student {
  id: string;
  name: string;
  skill_level: string | null;
}

export function TutorDashboard() {
  const [sets, setSets] = useState<SessionSet[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [setName, setSetName] = useState('');
  const [setSkill, setSetSkill] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentSkill, setStudentSkill] = useState('');

  const load = async () => {
    const [r1, r2] = await Promise.all([
      fetch('/api/tutor/sets').then((r) => r.json()).catch(() => ({ sets: [] })),
      fetch('/api/tutor/students').then((r) => r.json()).catch(() => ({ students: [] })),
    ]);
    setSets(r1.sets || []);
    setStudents(r2.students || []);
  };
  useEffect(() => {
    load();
  }, []);

  const createSet = async () => {
    if (!setName.trim()) return;
    await fetch('/api/tutor/sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: setName, skill_level: setSkill }),
    });
    setSetName('');
    setSetSkill('');
    load();
  };
  const removeSet = async (id: string) => {
    if (!confirm('Delete this session set?')) return;
    await fetch(`/api/tutor/sets/${id}`, { method: 'DELETE' });
    load();
  };
  const createStudent = async () => {
    if (!studentName.trim()) return;
    await fetch('/api/tutor/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: studentName, skill_level: studentSkill }),
    });
    setStudentName('');
    setStudentSkill('');
    load();
  };
  const removeStudent = async (id: string) => {
    if (!confirm('Delete this student?')) return;
    await fetch(`/api/tutor/students/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <Tabs defaultValue="sets" className="mt-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <TabsList>
          <TabsTrigger value="sets">
            <FolderOpen className="w-3.5 h-3.5 mr-1.5" /> Session Sets
          </TabsTrigger>
          <TabsTrigger value="students">
            <GraduationCap className="w-3.5 h-3.5 mr-1.5" /> Students
          </TabsTrigger>
        </TabsList>
        <Link href="/learn/tutor/puzzles">
          <Button variant="outline" size="sm">
            <Puzzle className="w-4 h-4 mr-1.5" /> Browse puzzles
          </Button>
        </Link>
      </div>

      <TabsContent value="sets" className="mt-6 space-y-4">
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[160px] space-y-1">
              <label className="text-xs text-muted-foreground">Set name</label>
              <Input value={setName} onChange={(e) => setSetName(e.target.value)} placeholder="e.g. Forks — beginner" />
            </div>
            <div className="w-40 space-y-1">
              <label className="text-xs text-muted-foreground">Skill level</label>
              <Input value={setSkill} onChange={(e) => setSetSkill(e.target.value)} placeholder="e.g. U1200" />
            </div>
            <Button onClick={createSet}>
              <Plus className="w-4 h-4 mr-1.5" /> Create
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {sets.length === 0 && <p className="text-sm text-muted-foreground">No session sets yet.</p>}
          {sets.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <Link href={`/learn/tutor/sets/${s.id}`} className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.puzzle_count} puzzle{s.puzzle_count === 1 ? '' : 's'}
                    {s.skill_level ? ` · ${s.skill_level}` : ''}
                  </p>
                </Link>
                {s.skill_level && <Badge variant="outline">{s.skill_level}</Badge>}
                <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => removeSet(s.id)}>
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="students" className="mt-6 space-y-4">
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[160px] space-y-1">
              <label className="text-xs text-muted-foreground">Student name</label>
              <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="Student name" />
            </div>
            <div className="w-40 space-y-1">
              <label className="text-xs text-muted-foreground">Skill level</label>
              <Input value={studentSkill} onChange={(e) => setStudentSkill(e.target.value)} placeholder="e.g. beginner" />
            </div>
            <Button onClick={createStudent}>
              <Plus className="w-4 h-4 mr-1.5" /> Add
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {students.length === 0 && <p className="text-sm text-muted-foreground">No students yet.</p>}
          {students.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <Link href={`/learn/tutor/students/${s.id}`} className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{s.name}</p>
                  {s.skill_level && <p className="text-xs text-muted-foreground">{s.skill_level}</p>}
                </Link>
                <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => removeStudent(s.id)}>
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
