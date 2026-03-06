'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TournamentCard } from './tournament-card';
import { useToast } from '@/hooks/use-toast';
import type { District, Tournament } from '@/lib/types';

export function SubmitTournamentForm({
  districts,
  userId,
}: {
  districts: District[];
  userId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('edit');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    end_date: '',
    start_time: '',
    venue: '',
    venue_address: '',
    maps_link: '',
    time_control: 'rapid' as const,
    time_control_detail: '',
    rounds: '5',
    entry_fee: '',
    prizes: '',
    is_rated: false,
    registration_procedure: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    district_id: '',
  });

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const previewTournament: Tournament = {
    id: 'preview',
    ...formData,
    end_date: formData.end_date || null,
    start_time: formData.start_time || null,
    venue_address: formData.venue_address || null,
    maps_link: formData.maps_link || null,
    time_control_detail: formData.time_control_detail || null,
    entry_fee: formData.entry_fee || null,
    prizes: formData.prizes || null,
    registration_procedure: formData.registration_procedure || null,
    contact_name: formData.contact_name || null,
    contact_phone: formData.contact_phone || null,
    contact_email: formData.contact_email || null,
    poster_url: null,
    description: formData.description || null,
    rounds: parseInt(formData.rounds) || 5,
    organizer_id: userId,
    status: 'pending',
    is_verified: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    district: districts.find((d) => d.id === formData.district_id),
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.date || !formData.venue || !formData.district_id) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          rounds: parseInt(formData.rounds) || 5,
          organizer_id: userId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit');
      }

      toast({
        title: 'Tournament submitted!',
        description: 'Your tournament is pending admin approval.',
      });
      router.push('/tournaments');
    } catch (err: any) {
      toast({
        title: 'Submission failed',
        description: err.message,
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="mb-6">
        <TabsTrigger value="edit">Edit</TabsTrigger>
        <TabsTrigger value="preview">
          <Eye className="w-3.5 h-3.5 mr-1.5" />
          Preview
        </TabsTrigger>
      </TabsList>

      <TabsContent value="edit">
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tournament Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g. Durban Open Chess Championship 2026"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Describe the tournament, sections, eligibility, etc."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => updateField('date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date (if multi-day)</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => updateField('end_date', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => updateField('start_time', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>District *</Label>
                  <Select
                    value={formData.district_id}
                    onValueChange={(v) => updateField('district_id', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select district" />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Venue */}
          <Card>
            <CardHeader>
              <CardTitle>Venue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Venue Name *</Label>
                <Input
                  value={formData.venue}
                  onChange={(e) => updateField('venue', e.target.value)}
                  placeholder="e.g. Durban ICC"
                />
              </div>
              <div className="space-y-2">
                <Label>Venue Address</Label>
                <Input
                  value={formData.venue_address}
                  onChange={(e) => updateField('venue_address', e.target.value)}
                  placeholder="Full street address"
                />
              </div>
              <div className="space-y-2">
                <Label>Google Maps Link</Label>
                <Input
                  value={formData.maps_link}
                  onChange={(e) => updateField('maps_link', e.target.value)}
                  placeholder="https://maps.google.com/..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Format */}
          <Card>
            <CardHeader>
              <CardTitle>Format & Fees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Time Control</Label>
                  <Select
                    value={formData.time_control}
                    onValueChange={(v) => updateField('time_control', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classical">Classical</SelectItem>
                      <SelectItem value="rapid">Rapid</SelectItem>
                      <SelectItem value="blitz">Blitz</SelectItem>
                      <SelectItem value="bullet">Bullet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time Control Detail</Label>
                  <Input
                    value={formData.time_control_detail}
                    onChange={(e) => updateField('time_control_detail', e.target.value)}
                    placeholder="e.g. 90min + 30sec increment"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Number of Rounds</Label>
                  <Input
                    type="number"
                    value={formData.rounds}
                    onChange={(e) => updateField('rounds', e.target.value)}
                    min={1}
                    max={15}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Entry Fee</Label>
                  <Input
                    value={formData.entry_fee}
                    onChange={(e) => updateField('entry_fee', e.target.value)}
                    placeholder="e.g. R200 (Juniors R100)"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Prizes</Label>
                <Input
                  value={formData.prizes}
                  onChange={(e) => updateField('prizes', e.target.value)}
                  placeholder="e.g. R10,000 first prize"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.is_rated}
                  onCheckedChange={(v) => updateField('is_rated', v)}
                />
                <Label>FIDE/CHESSA Rated Tournament</Label>
              </div>
            </CardContent>
          </Card>

          {/* Registration & Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Registration & Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Registration Procedure</Label>
                <Textarea
                  value={formData.registration_procedure}
                  onChange={(e) => updateField('registration_procedure', e.target.value)}
                  placeholder="How should players register? Email, WhatsApp, walk-in?"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <Input
                    value={formData.contact_name}
                    onChange={(e) => updateField('contact_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input
                    value={formData.contact_phone}
                    onChange={(e) => updateField('contact_phone', e.target.value)}
                    placeholder="+27..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => updateField('contact_email', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
            size="lg"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Submit for Approval
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="preview">
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            This is how your tournament will appear to players:
          </p>
          <div className="max-w-md">
            <TournamentCard tournament={previewTournament} />
          </div>
          <Button
            onClick={() => setTab('edit')}
            variant="outline"
            className="mr-3"
          >
            Back to Edit
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit for Approval
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}
