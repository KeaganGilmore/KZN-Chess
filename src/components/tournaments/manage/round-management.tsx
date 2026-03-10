'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shuffle, Eye, PlayCircle, CheckCircle, RotateCcw,
  ChevronLeft, ChevronRight, Printer, Share2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { TournamentRound, TournamentPairing, GameResult } from '@/lib/types';
import { getWhatsAppShareUrl, generatePairingsWhatsApp } from '@/lib/tournament/whatsapp';

interface RoundManagementProps {
  tournamentId: string;
  rounds: TournamentRound[];
  onRoundsChange: () => void;
  players: Map<string, { id: string; player_name: string; fide_rating: number | null; national_rating: number | null }>;
}

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  not_started: { label: 'Not Started', variant: 'outline' },
  pairings_published: { label: 'Pairings Published', variant: 'secondary' },
  in_progress: { label: 'In Progress', variant: 'default' },
  results_published: { label: 'Results Published', variant: 'default' },
};

const RESULTS: { value: GameResult; label: string; shortLabel: string }[] = [
  { value: '1-0', label: '1-0 (White wins)', shortLabel: '1-0' },
  { value: '0-1', label: '0-1 (Black wins)', shortLabel: '0-1' },
  { value: 'draw', label: '½-½ (Draw)', shortLabel: '½-½' },
  { value: 'white_forfeit', label: '1-0 FF', shortLabel: '+−' },
  { value: 'black_forfeit', label: '0-1 FF', shortLabel: '−+' },
  { value: 'double_forfeit', label: '0-0 FF', shortLabel: '−−' },
];

export function RoundManagement({
  tournamentId, rounds, onRoundsChange, players,
}: RoundManagementProps) {
  const [selectedRound, setSelectedRound] = useState<string | null>(
    rounds.length > 0 ? rounds[rounds.length - 1].id : null
  );
  const [pairings, setPairings] = useState<TournamentPairing[]>([]);
  const [loadingPairings, setLoadingPairings] = useState(false);
  const [generating, setGenerating] = useState(false);

  const currentRound = rounds.find(r => r.id === selectedRound);

  const loadPairings = useCallback(async (roundId: string) => {
    setLoadingPairings(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/rounds/${roundId}/pairings`);
      if (res.ok) {
        const data = await res.json();
        setPairings(data);
      }
    } catch { /* ignore */ } finally {
      setLoadingPairings(false);
    }
  }, [tournamentId]);

  const selectRound = (roundId: string) => {
    setSelectedRound(roundId);
    loadPairings(roundId);
  };

  const handleCreateRound = async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const newRound = await res.json();
      toast.success(`Round ${newRound.round_number} created`);
      onRoundsChange();
      setSelectedRound(newRound.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create round');
    }
  };

  const handleGeneratePairings = async () => {
    if (!selectedRound || !currentRound) return;
    if (!confirm('Generate pairings for this round?')) return;

    setGenerating(true);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/rounds/${selectedRound}/generate`,
        { method: 'POST' }
      );
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Pairings generated');
      loadPairings(selectedRound);
      onRoundsChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate pairings');
    } finally {
      setGenerating(false);
    }
  };

  const handlePublishStatus = async (status: string) => {
    if (!selectedRound) return;
    const confirmMsg = status === 'pairings_published'
      ? 'Publish pairings? Players will see them.'
      : status === 'results_published'
        ? 'Publish results? Standings will update.'
        : `Change round status to ${status}?`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/rounds/${selectedRound}/publish`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }
      );
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Round status updated');
      onRoundsChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleResultChange = async (pairingId: string, result: string) => {
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/rounds/${selectedRound}/pairings`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pairing_id: pairingId, result }),
        }
      );
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await res.json();
      setPairings(prev => prev.map(p => p.id === pairingId ? updated : p));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update result');
    }
  };

  const handleResetPairings = async () => {
    if (!selectedRound) return;
    if (!confirm('Delete all pairings for this round? This cannot be undone.')) return;

    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/rounds/${selectedRound}/pairings`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Pairings reset');
      setPairings([]);
      onRoundsChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset pairings');
    }
  };

  const handlePrintPairings = () => {
    if (!currentRound) return;
    window.open(`/tournaments/${tournamentId}/print/pairings?round=${currentRound.round_number}`, '_blank');
  };

  const handleShareWhatsApp = () => {
    if (!currentRound || pairings.length === 0) return;
    const tournamentUrl = `${window.location.origin}/tournaments/${tournamentId}`;
    const text = generatePairingsWhatsApp(
      document.title.replace(' - KZN Chess', ''),
      currentRound.round_number,
      pairings as TournamentPairing[],
      players,
      tournamentUrl
    );
    window.open(getWhatsAppShareUrl(text), '_blank');
  };

  const canGenerate = currentRound?.status === 'not_started' && pairings.length === 0;
  const canPublishPairings = currentRound?.status === 'not_started' && pairings.length > 0;
  const canStartRound = currentRound?.status === 'pairings_published';
  const canPublishResults = currentRound?.status === 'in_progress';

  // Navigate between rounds
  const currentIdx = rounds.findIndex(r => r.id === selectedRound);
  const prevRound = currentIdx > 0 ? rounds[currentIdx - 1] : null;
  const nextRound = currentIdx < rounds.length - 1 ? rounds[currentIdx + 1] : null;

  return (
    <div className="space-y-4">
      {/* Round selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={handleCreateRound} size="sm" variant="outline">
          + New Round
        </Button>
        <div className="flex items-center gap-1">
          <Button
            size="icon" variant="ghost" className="h-8 w-8"
            disabled={!prevRound}
            onClick={() => prevRound && selectRound(prevRound.id)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {rounds.length > 0 && (
            <Select value={selectedRound || ''} onValueChange={selectRound}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="Select round" />
              </SelectTrigger>
              <SelectContent>
                {rounds.map(r => (
                  <SelectItem key={r.id} value={r.id}>Round {r.round_number}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            size="icon" variant="ghost" className="h-8 w-8"
            disabled={!nextRound}
            onClick={() => nextRound && selectRound(nextRound.id)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        {currentRound && (
          <Badge variant={STATUS_BADGES[currentRound.status]?.variant || 'outline'}>
            {STATUS_BADGES[currentRound.status]?.label || currentRound.status}
          </Badge>
        )}
      </div>

      {!currentRound && rounds.length === 0 && (
        <p className="text-sm text-muted-foreground">No rounds yet. Create the first round to start.</p>
      )}

      {currentRound && (
        <>
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {canGenerate && (
              <Button onClick={handleGeneratePairings} size="sm" disabled={generating}>
                <Shuffle className="w-4 h-4 mr-1" />
                {generating ? 'Generating...' : 'Generate Pairings'}
              </Button>
            )}
            {canPublishPairings && (
              <Button onClick={() => handlePublishStatus('pairings_published')} size="sm">
                <Eye className="w-4 h-4 mr-1" /> Publish Pairings
              </Button>
            )}
            {canStartRound && (
              <Button onClick={() => handlePublishStatus('in_progress')} size="sm">
                <PlayCircle className="w-4 h-4 mr-1" /> Start Round
              </Button>
            )}
            {canPublishResults && (
              <Button onClick={() => handlePublishStatus('results_published')} size="sm">
                <CheckCircle className="w-4 h-4 mr-1" /> Publish Results
              </Button>
            )}
            {pairings.length > 0 && (
              <>
                <Button onClick={handlePrintPairings} size="sm" variant="outline">
                  <Printer className="w-4 h-4 mr-1" /> Print
                </Button>
                <Button onClick={handleShareWhatsApp} size="sm" variant="outline">
                  <Share2 className="w-4 h-4 mr-1" /> WhatsApp
                </Button>
              </>
            )}
            {pairings.length > 0 && currentRound.status === 'not_started' && (
              <Button onClick={handleResetPairings} size="sm" variant="destructive">
                <RotateCcw className="w-4 h-4 mr-1" /> Reset
              </Button>
            )}
          </div>

          {/* Pairings table */}
          {loadingPairings ? (
            <p className="text-sm text-muted-foreground">Loading pairings...</p>
          ) : pairings.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Round {currentRound.round_number} Pairings</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 w-12">Bd</th>
                        <th className="text-left py-2 px-3">White</th>
                        <th className="text-center py-2 px-3 w-[130px]">Result</th>
                        <th className="text-right py-2 px-3">Black</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pairings.map(p => {
                        const white = p.white_player || players.get(p.white_player_id);
                        const black = p.black_player_id
                          ? (p.black_player || players.get(p.black_player_id))
                          : null;

                        return (
                          <tr key={p.id} className="border-b border-border/50">
                            <td className="py-2 px-3 text-muted-foreground">{p.board_number}</td>
                            <td className="py-2 px-3">
                              <span className="font-medium">{white?.player_name || '?'}</span>
                              {(white?.fide_rating || white?.national_rating) && (
                                <span className="text-muted-foreground ml-1">
                                  ({white.fide_rating || white.national_rating})
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {p.is_bye ? (
                                <Badge variant="outline" className="text-xs">BYE</Badge>
                              ) : (
                                <div className="flex flex-col sm:flex-row items-center gap-1">
                                  {/* Mobile: large tap targets */}
                                  <div className="flex gap-1 sm:hidden">
                                    {RESULTS.slice(0, 3).map(r => (
                                      <button
                                        key={r.value}
                                        onClick={() => handleResultChange(p.id, r.value)}
                                        className={`px-3 py-2 rounded text-xs font-bold transition-colors min-w-[44px] min-h-[44px] ${
                                          p.result === r.value
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted hover:bg-muted/80'
                                        }`}
                                      >
                                        {r.shortLabel}
                                      </button>
                                    ))}
                                  </div>
                                  {/* Desktop: select dropdown */}
                                  <div className="hidden sm:block">
                                    <Select
                                      value={p.result || ''}
                                      onValueChange={v => handleResultChange(p.id, v)}
                                    >
                                      <SelectTrigger className="h-7 w-[110px] text-xs">
                                        <SelectValue placeholder="vs" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {RESULTS.map(r => (
                                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {black ? (
                                <>
                                  <span className="font-medium">{black.player_name}</span>
                                  {(black.fide_rating || black.national_rating) && (
                                    <span className="text-muted-foreground ml-1">
                                      ({black.fide_rating || black.national_rating})
                                    </span>
                                  )}
                                </>
                              ) : p.is_bye ? null : '?'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">
              No pairings yet. Click &quot;Generate Pairings&quot; to create them.
            </p>
          )}
        </>
      )}
    </div>
  );
}
