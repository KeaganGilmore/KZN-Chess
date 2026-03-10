'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import type { TournamentSettings, TiebreakMethod, PairingSystem, RatingTypeOption } from '@/lib/types';
import { TIEBREAK_LABELS } from '@/lib/types';

interface TournamentSettingsFormProps {
  tournamentId: string;
  settings: TournamentSettings;
  onSettingsChange: () => void;
}

const ALL_TIEBREAKS: TiebreakMethod[] = [
  'buchholz', 'buchholz_cut1', 'median_buchholz', 'sonneborn_berger',
  'progressive', 'direct_encounter', 'aro', 'num_wins', 'num_blacks',
];

export function TournamentSettingsForm({ tournamentId, settings, onSettingsChange }: TournamentSettingsFormProps) {
  const [form, setForm] = useState({
    pairing_system: settings.pairing_system,
    num_rounds: settings.num_rounds,
    point_win: settings.point_win,
    point_draw: settings.point_draw,
    point_loss: settings.point_loss,
    point_bye: settings.point_bye,
    point_half_bye: settings.point_half_bye,
    rating_type: settings.rating_type,
    allow_self_registration: settings.allow_self_registration,
    tiebreak_order: settings.tiebreak_order || ['buchholz', 'buchholz_cut1', 'sonneborn_berger'],
  });
  const [saving, setSaving] = useState(false);
  const [dragItem, setDragItem] = useState<number | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Settings saved');
      onSettingsChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const moveTiebreak = (from: number, to: number) => {
    const order = [...form.tiebreak_order];
    const [item] = order.splice(from, 1);
    order.splice(to, 0, item);
    setForm({ ...form, tiebreak_order: order });
  };

  const toggleTiebreak = (method: TiebreakMethod) => {
    const order = [...form.tiebreak_order];
    const idx = order.indexOf(method);
    if (idx >= 0) {
      order.splice(idx, 1);
    } else {
      order.push(method);
    }
    setForm({ ...form, tiebreak_order: order });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Tournament Format</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Pairing System</Label>
              <Select
                value={form.pairing_system}
                onValueChange={v => setForm({ ...form, pairing_system: v as PairingSystem })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="swiss">Swiss (FIDE Dutch)</SelectItem>
                  <SelectItem value="round_robin">Round Robin</SelectItem>
                  <SelectItem value="double_round_robin">Double Round Robin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Number of Rounds</Label>
              <Input
                type="number" min="1" max="30"
                value={form.num_rounds}
                onChange={e => setForm({ ...form, num_rounds: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <Label className="text-xs">Rating Type for Pairings</Label>
              <Select
                value={form.rating_type}
                onValueChange={v => setForm({ ...form, rating_type: v as RatingTypeOption })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fide">FIDE Rating</SelectItem>
                  <SelectItem value="national">Chess SA National Rating</SelectItem>
                  <SelectItem value="unrated">Unrated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={form.allow_self_registration}
              onCheckedChange={v => setForm({ ...form, allow_self_registration: v })}
            />
            <Label className="text-xs">Allow public self-registration</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Point System</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Win</Label>
              <Input type="number" step="0.5" min="0" value={form.point_win}
                onChange={e => setForm({ ...form, point_win: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-xs">Draw</Label>
              <Input type="number" step="0.5" min="0" value={form.point_draw}
                onChange={e => setForm({ ...form, point_draw: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-xs">Loss</Label>
              <Input type="number" step="0.5" min="0" value={form.point_loss}
                onChange={e => setForm({ ...form, point_loss: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-xs">Bye</Label>
              <Input type="number" step="0.5" min="0" value={form.point_bye}
                onChange={e => setForm({ ...form, point_bye: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label className="text-xs">Half Bye</Label>
              <Input type="number" step="0.5" min="0" value={form.point_half_bye}
                onChange={e => setForm({ ...form, point_half_bye: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Tiebreak Priority (drag to reorder)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {form.tiebreak_order.map((method, idx) => (
              <div
                key={method}
                draggable
                onDragStart={() => setDragItem(idx)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  if (dragItem !== null && dragItem !== idx) {
                    moveTiebreak(dragItem, idx);
                  }
                  setDragItem(null);
                }}
                className={`flex items-center gap-2 p-2 rounded border border-border bg-background cursor-move ${
                  dragItem === idx ? 'opacity-50' : ''
                }`}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground w-5">{idx + 1}.</span>
                <span className="text-sm">{TIEBREAK_LABELS[method]}</span>
                <Button
                  size="icon" variant="ghost" className="h-6 w-6 ml-auto"
                  onClick={() => toggleTiebreak(method)}
                >
                  ×
                </Button>
              </div>
            ))}
          </div>

          {/* Available tiebreaks not yet in the order */}
          {ALL_TIEBREAKS.filter(t => !form.tiebreak_order.includes(t)).length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Available tiebreaks:</p>
              <div className="flex flex-wrap gap-1">
                {ALL_TIEBREAKS.filter(t => !form.tiebreak_order.includes(t)).map(method => (
                  <Button
                    key={method}
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => toggleTiebreak(method)}
                  >
                    + {TIEBREAK_LABELS[method]}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
}
