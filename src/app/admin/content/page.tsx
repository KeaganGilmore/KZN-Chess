'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

export default function AdminContentPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const res = await fetch('/api/content');
        if (!res.ok) throw new Error();
        const data = await res.json();
        const map: Record<string, any> = {};
        data.forEach((item: any) => {
          map[item.key] = item.value;
        });
        setContent(map);
      } catch {
        toast({ title: 'Failed to load site content', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveContent = async (key: string) => {
    setSaving(true);
    const res = await fetch('/api/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: content[key] }),
    });
    setSaving(false);
    if (res.ok) {
      toast({ title: 'Content saved' });
    } else {
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
  };

  const updateField = (key: string, field: string, value: any) => {
    setContent((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
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
      <div>
        <h1 className="text-2xl font-bold">Site Content</h1>
        <p className="text-muted-foreground mt-1">
          Edit homepage text, stats, and about page content. Looking for the home
          page banner? That moved to{' '}
          <Link href="/admin/announcements" className="text-primary hover:underline">
            Announcements
          </Link>
          .
        </p>
      </div>

      <Tabs defaultValue="hero" className="space-y-6">
        <TabsList>
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="about">About Page</TabsTrigger>
        </TabsList>

        {/* Hero */}
        <TabsContent value="hero">
          <Card>
            <CardHeader>
              <CardTitle>Hero Section</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={content.hero?.title || ''}
                  onChange={(e) => updateField('hero', 'title', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Subtitle</Label>
                <Input
                  value={content.hero?.subtitle || ''}
                  onChange={(e) => updateField('hero', 'subtitle', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={content.hero?.description || ''}
                  onChange={(e) => updateField('hero', 'description', e.target.value)}
                  rows={3}
                />
              </div>
              <Button onClick={() => saveContent('hero')} disabled={saving} className="gap-2">
                <Save className="w-4 h-4" />
                Save Hero
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats */}
        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Stats Section</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Districts</Label>
                  <Input
                    type="number"
                    value={content.stats?.districts || 0}
                    onChange={(e) => updateField('stats', 'districts', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tournaments Hosted</Label>
                  <Input
                    type="number"
                    value={content.stats?.tournaments_hosted || 0}
                    onChange={(e) => updateField('stats', 'tournaments_hosted', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Players Registered</Label>
                  <Input
                    type="number"
                    value={content.stats?.players_registered || 0}
                    onChange={(e) => updateField('stats', 'players_registered', parseInt(e.target.value))}
                  />
                </div>
              </div>
              <Button onClick={() => saveContent('stats')} disabled={saving} className="gap-2">
                <Save className="w-4 h-4" />
                Save Stats
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* About */}
        <TabsContent value="about">
          <Card>
            <CardHeader>
              <CardTitle>About Page Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>HTML Content</Label>
                <Textarea
                  value={content.about?.content || ''}
                  onChange={(e) => updateField('about', 'content', e.target.value)}
                  rows={15}
                  className="font-mono text-sm"
                  placeholder="<h2>About KZN Chess</h2><p>...</p>"
                />
                <p className="text-xs text-muted-foreground">
                  Supports HTML tags: h2, h3, p, strong, em, ul, li, a
                </p>
              </div>
              <Button onClick={() => saveContent('about')} disabled={saving} className="gap-2">
                <Save className="w-4 h-4" />
                Save About
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
