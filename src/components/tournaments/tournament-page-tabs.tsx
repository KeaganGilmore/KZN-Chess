'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TournamentDetail } from './tournament-detail';
import { PlayersList } from './players-list';
import { PairingsView } from './pairings-view';
import { StandingsView } from './standings-view';
import { CrosstableView } from './crosstable-view';
import { PlayerCard } from './player-card';
import { ManageTab } from './manage/manage-tab';
import type { Tournament } from '@/lib/types';

interface TournamentPageTabsProps {
  tournament: Tournament;
  related: Tournament[];
  canEdit?: boolean;
  canManage?: boolean;
}

export function TournamentPageTabs({
  tournament,
  related,
  canEdit,
  canManage,
}: TournamentPageTabsProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [hasPlayers, setHasPlayers] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  // Check if tournament has players registered
  useEffect(() => {
    const checkPlayers = async () => {
      try {
        const res = await fetch(`/api/tournaments/${tournament.id}/players`);
        if (res.ok) {
          const data = await res.json();
          setHasPlayers(data.length > 0);
        }
      } catch { /* ignore */ }
    };
    checkPlayers();
  }, [tournament.id]);

  const handlePlayerClick = (playerId: string) => {
    setSelectedPlayerId(playerId);
  };

  const showTournamentTabs = hasPlayers || canManage;

  // If no players and not a manager, just show the regular detail page
  if (!showTournamentTabs) {
    return <TournamentDetail tournament={tournament} related={related} canEdit={canEdit} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Player card modal */}
      {selectedPlayerId && (
        <div className="mb-4">
          <PlayerCard
            tournamentId={tournament.id}
            playerId={selectedPlayerId}
            onClose={() => setSelectedPlayerId(null)}
          />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex overflow-x-auto h-auto gap-0 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="info" className="text-xs sm:text-sm px-3 py-2 flex-shrink-0">
            Info
          </TabsTrigger>
          <TabsTrigger value="players" className="text-xs sm:text-sm px-3 py-2 flex-shrink-0">
            Players
          </TabsTrigger>
          <TabsTrigger value="rounds" className="text-xs sm:text-sm px-3 py-2 flex-shrink-0">
            Rounds
          </TabsTrigger>
          <TabsTrigger value="standings" className="text-xs sm:text-sm px-3 py-2 flex-shrink-0">
            Standings
          </TabsTrigger>
          <TabsTrigger value="crosstable" className="text-xs sm:text-sm px-3 py-2 flex-shrink-0">
            Crosstable
          </TabsTrigger>
          {canManage && (
            <TabsTrigger value="manage" className="text-xs sm:text-sm px-3 py-2 flex-shrink-0">
              Manage
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="info" className="mt-0">
          <TournamentDetail tournament={tournament} related={related} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="players" className="mt-6">
          <PlayersList tournamentId={tournament.id} onPlayerClick={handlePlayerClick} />
        </TabsContent>

        <TabsContent value="rounds" className="mt-6">
          <PairingsView tournamentId={tournament.id} onPlayerClick={handlePlayerClick} />
        </TabsContent>

        <TabsContent value="standings" className="mt-6">
          <StandingsView tournamentId={tournament.id} onPlayerClick={handlePlayerClick} />
        </TabsContent>

        <TabsContent value="crosstable" className="mt-6">
          <CrosstableView tournamentId={tournament.id} onPlayerClick={handlePlayerClick} />
        </TabsContent>

        {canManage && (
          <TabsContent value="manage" className="mt-6">
            <ManageTab tournamentId={tournament.id} tournamentName={tournament.name} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
