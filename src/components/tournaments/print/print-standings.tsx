'use client';

import { useEffect } from 'react';
import type { PlayerStanding, TiebreakMethod } from '@/lib/types';

interface PrintStandingsProps {
  tournamentName: string;
  date: string;
  venue: string;
  standings: PlayerStanding[];
  tiebreakOrder: TiebreakMethod[];
  roundsPlayed: number;
}

export function PrintStandings({
  tournamentName, date, venue, standings, tiebreakOrder, roundsPlayed,
}: PrintStandingsProps) {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <style jsx global>{`
        @media print {
          body { margin: 0; padding: 0; background: white !important; color: black !important; }
          .no-print { display: none !important; }
          @page { margin: 1.5cm; size: A4 portrait; }
        }
        body { background: white; color: black; font-family: Arial, Helvetica, sans-serif; }
        .print-page { max-width: 800px; margin: 0 auto; padding: 20px; }
        .print-header { text-align: center; margin-bottom: 24px; }
        .print-header h1 { font-size: 22px; font-weight: bold; margin: 0 0 4px 0; }
        .print-header h2 { font-size: 18px; font-weight: bold; margin: 0 0 4px 0; }
        .print-header p { font-size: 12px; color: #666; margin: 2px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #333; padding: 4px 6px; }
        th { background: #f0f0f0; font-size: 11px; font-weight: bold; text-align: center; }
        td { font-size: 12px; }
        .rank { width: 30px; text-align: center; font-weight: bold; }
        .name { text-align: left; }
        .pts { text-align: center; font-weight: bold; }
        .tb { text-align: center; font-size: 11px; }
      `}</style>

      <div className="print-page">
        <div className="no-print" style={{ marginBottom: 16, textAlign: 'right' }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: '8px 16px', background: '#333', color: 'white',
              border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14,
            }}
          >
            Print
          </button>
        </div>

        <div className="print-header">
          <h1>{tournamentName}</h1>
          <h2>Standings after Round {roundsPlayed}</h2>
          <p>{venue} &bull; {new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th className="rank">#</th>
              <th className="name">Name</th>
              <th>Rating</th>
              <th>Club / School</th>
              <th className="pts">Pts</th>
              {tiebreakOrder.map(tb => (
                <th key={tb} className="tb">{shortLabel(tb)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {standings.map(s => (
              <tr key={s.player.id}>
                <td className="rank">{s.rank}</td>
                <td className="name">
                  <strong>{s.player.player_name}</strong>
                  {s.player.is_withdrawn && ' (WD)'}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {s.player.fide_rating || s.player.national_rating || '-'}
                </td>
                <td>{s.player.club || '-'}</td>
                <td className="pts">{s.points}</td>
                {tiebreakOrder.map(tb => (
                  <td key={tb} className="tb">
                    {formatNum(s.tiebreaks[tb])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function shortLabel(method: TiebreakMethod): string {
  const shorts: Record<string, string> = {
    buchholz: 'BH', buchholz_cut1: 'BH-C1', median_buchholz: 'MBH',
    sonneborn_berger: 'SB', progressive: 'Prog', direct_encounter: 'DE',
    aro: 'ARO', num_wins: 'Wins', num_blacks: '#B',
  };
  return shorts[method] || method;
}

function formatNum(v: number): string {
  if (v === 0) return '0';
  if (Number.isInteger(v)) return v.toString();
  return v.toFixed(1);
}
