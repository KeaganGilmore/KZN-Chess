'use client';

import { useEffect } from 'react';
import type { TournamentPlayer } from '@/lib/types';

interface PrintCrosstableProps {
  tournamentName: string;
  date: string;
  venue: string;
  rows: {
    player: TournamentPlayer;
    rank: number;
    points: number;
    results: Record<string, { display: string; round: number }>;
  }[];
}

export function PrintCrosstable({ tournamentName, date, venue, rows }: PrintCrosstableProps) {
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
          @page { margin: 1cm; size: A4 landscape; }
        }
        body { background: white; color: black; font-family: Arial, Helvetica, sans-serif; }
        .print-page { margin: 0 auto; padding: 10px; }
        .print-header { text-align: center; margin-bottom: 16px; }
        .print-header h1 { font-size: 18px; font-weight: bold; margin: 0 0 4px 0; }
        .print-header h2 { font-size: 14px; font-weight: bold; margin: 0 0 4px 0; }
        .print-header p { font-size: 10px; color: #666; margin: 2px 0; }
        table { border-collapse: collapse; font-size: 9px; }
        th, td { border: 1px solid #333; padding: 2px 4px; text-align: center; }
        th { background: #f0f0f0; font-weight: bold; }
        .name-col { text-align: left; white-space: nowrap; min-width: 100px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; }
        .self { background: #ddd; }
        .pts { font-weight: bold; }
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
          <h2>Crosstable</h2>
          <p>{venue} &bull; {new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th className="name-col">Name</th>
              <th>Rtg</th>
              {rows.map(r => (
                <th key={r.player.id}>{r.player.starting_rank}</th>
              ))}
              <th className="pts">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.player.id}>
                <td>{row.rank}</td>
                <td className="name-col">{row.player.player_name}</td>
                <td>{row.player.fide_rating || row.player.national_rating || ''}</td>
                {rows.map(col => {
                  if (col.player.id === row.player.id) {
                    return <td key={col.player.id} className="self">&times;</td>;
                  }
                  const cell = row.results[col.player.id];
                  return <td key={col.player.id}>{cell?.display || ''}</td>;
                })}
                <td className="pts">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
