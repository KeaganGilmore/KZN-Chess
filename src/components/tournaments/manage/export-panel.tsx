'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Copy, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { PlayerStanding, TournamentSettings } from '@/lib/types';
import { generateStandingsWhatsApp, getWhatsAppShareUrl } from '@/lib/tournament/whatsapp';

interface ExportPanelProps {
  tournamentId: string;
  tournamentName: string;
  standings: PlayerStanding[];
  settings: TournamentSettings;
  currentRound: number;
}

export function ExportPanel({ tournamentId, tournamentName, standings, settings, currentRound }: ExportPanelProps) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleExport = (format: string, fideOnly: boolean = false) => {
    const params = new URLSearchParams({ format });
    if (fideOnly) params.set('fide_only', 'true');
    window.open(`/api/tournaments/${tournamentId}/export?${params}`, '_blank');
  };

  const handleCopyStandings = () => {
    const text = generateStandingsWhatsApp(
      tournamentName, currentRound, standings,
      settings.num_rounds, `${baseUrl}/tournaments/${tournamentId}`
    );
    navigator.clipboard.writeText(text);
    toast.success('Standings copied to clipboard');
  };

  const handleShareStandingsWhatsApp = () => {
    const text = generateStandingsWhatsApp(
      tournamentName, currentRound, standings,
      settings.num_rounds, `${baseUrl}/tournaments/${tournamentId}`
    );
    window.open(getWhatsAppShareUrl(text), '_blank');
  };

  const handlePrintStandings = () => {
    window.open(`/tournaments/${tournamentId}/print/standings`, '_blank');
  };

  const handlePrintCrosstable = () => {
    window.open(`/tournaments/${tournamentId}/print/crosstable`, '_blank');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Rating Submission Exports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button onClick={() => handleExport('trf')} size="sm" variant="outline" className="w-full justify-start">
            <Download className="w-4 h-4 mr-2" /> Export for Chess SA (TRF format)
          </Button>
          <Button onClick={() => handleExport('trf', true)} size="sm" variant="outline" className="w-full justify-start">
            <Download className="w-4 h-4 mr-2" /> Export for FIDE (TRF, FIDE-rated only)
          </Button>
          <Button onClick={() => handleExport('csv')} size="sm" variant="outline" className="w-full justify-start">
            <Download className="w-4 h-4 mr-2" /> Export as CSV (fallback)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Print &amp; Share</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button onClick={handlePrintStandings} size="sm" variant="outline" className="w-full justify-start">
            <Download className="w-4 h-4 mr-2" /> Print Standings
          </Button>
          <Button onClick={handlePrintCrosstable} size="sm" variant="outline" className="w-full justify-start">
            <Download className="w-4 h-4 mr-2" /> Print Crosstable
          </Button>
          <Button onClick={handleCopyStandings} size="sm" variant="outline" className="w-full justify-start">
            <Copy className="w-4 h-4 mr-2" /> Copy Standings to Clipboard
          </Button>
          <Button onClick={handleShareStandingsWhatsApp} size="sm" variant="outline" className="w-full justify-start">
            <Share2 className="w-4 h-4 mr-2" /> Share Standings to WhatsApp
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
