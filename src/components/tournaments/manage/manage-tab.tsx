'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayerManagement } from './player-management';
import { RoundManagement } from './round-management';
import { TournamentSettingsForm } from './tournament-settings-form';
import { ExportPanel } from './export-panel';
import type {
  TournamentPlayer,
  TournamentRound,
  TournamentSettings,
  PlayerStanding,
} from '@/lib/types';

interface ManageTabProps {
  tournamentId: string;
  tournamentName: string;
}

export function ManageTab({ tournamentId, tournamentName }: ManageTabProps) {
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [rounds, setRounds] = useState<TournamentRound[]>([]);
  const [settings, setSettings] = useState<TournamentSettings | null>(null);
  const [standings, setStandings] = useState<PlayerStanding[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [playersRes, roundsRes, settingsRes, standingsRes] = await Promise.all([
        fetch(`/api/tournaments/${tournamentId}/players`),
        fetch(`/api/tournaments/${tournamentId}/rounds`),
        fetch(`/api/tournaments/${tournamentId}/settings`),
        fetch(`/api/tournaments/${tournamentId}/standings`),
      ]);

      if (playersRes.ok) setPlayers(await playersRes.json());
      if (roundsRes.ok) setRounds(await roundsRes.json());
      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (standingsRes.ok) {
        const data = await standingsRes.json();
        setStandings(data.standings || []);
      }
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const playersMap = new Map(
    players.map(p => [p.id, p])
  );

  const currentRound = rounds.length > 0
    ? Math.max(...rounds.map(r => r.round_number))
    : 0;

  if (loading || !settings) {
    return <div className="py-8 text-center text-muted-foreground">Loading management tools...</div>;
  }

  return (
    <Tabs defaultValue="rounds" className="w-full">
      <TabsList className="w-full grid grid-cols-4 h-auto">
        <TabsTrigger value="rounds" className="text-xs py-2">Rounds</TabsTrigger>
        <TabsTrigger value="players" className="text-xs py-2">Players</TabsTrigger>
        <TabsTrigger value="settings" className="text-xs py-2">Settings</TabsTrigger>
        <TabsTrigger value="export" className="text-xs py-2">Export</TabsTrigger>
      </TabsList>

      <TabsContent value="rounds" className="mt-4">
        <RoundManagement
          tournamentId={tournamentId}
          rounds={rounds}
          onRoundsChange={fetchData}
          players={playersMap}
        />
      </TabsContent>

      <TabsContent value="players" className="mt-4">
        <PlayerManagement
          tournamentId={tournamentId}
          players={players}
          onPlayersChange={fetchData}
        />
      </TabsContent>

      <TabsContent value="settings" className="mt-4">
        <TournamentSettingsForm
          tournamentId={tournamentId}
          settings={settings}
          onSettingsChange={fetchData}
        />
      </TabsContent>

      <TabsContent value="export" className="mt-4">
        <ExportPanel
          tournamentId={tournamentId}
          tournamentName={tournamentName}
          standings={standings}
          settings={settings}
          currentRound={currentRound}
        />
      </TabsContent>
    </Tabs>
  );
}
