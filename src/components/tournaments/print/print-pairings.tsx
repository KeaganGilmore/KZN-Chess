'use client';

import { useEffect } from 'react';

interface PrintPairingsProps {
  tournamentName: string;
  date: string;
  venue: string;
  roundNumber: number;
  pairings: {
    board_number: number;
    is_bye: boolean;
    result: string | null;
    white_player?: { player_name: string; fide_rating: number | null; national_rating: number | null } | null;
    black_player?: { player_name: string; fide_rating: number | null; national_rating: number | null } | null;
  }[];
}

export function PrintPairings({ tournamentName, date, venue, roundNumber, pairings }: PrintPairingsProps) {
  useEffect(() => {
    // Auto-trigger print dialog
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
        th, td { border: 1px solid #333; padding: 6px 10px; }
        th { background: #f0f0f0; font-size: 13px; font-weight: bold; text-align: left; }
        td { font-size: 14px; }
        .board-num { width: 40px; text-align: center; font-weight: bold; }
        .result-col { width: 60px; text-align: center; }
        .rating { color: #666; font-size: 12px; }
        .bye-row { background: #f9f9f9; }
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
          <h2>Round {roundNumber} Pairings</h2>
          <p>{venue} &bull; {new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th className="board-num">Bd</th>
              <th>White</th>
              <th className="result-col">Result</th>
              <th>Black</th>
            </tr>
          </thead>
          <tbody>
            {pairings.map(p => (
              <tr key={p.board_number} className={p.is_bye ? 'bye-row' : ''}>
                <td className="board-num">{p.board_number}</td>
                <td>
                  <strong>{p.white_player?.player_name || '?'}</strong>
                  {' '}
                  <span className="rating">
                    ({p.white_player?.fide_rating || p.white_player?.national_rating || 'unr'})
                  </span>
                </td>
                <td className="result-col">
                  {p.is_bye ? 'BYE' : ''}
                </td>
                <td>
                  {p.is_bye ? '' : (
                    <>
                      <strong>{p.black_player?.player_name || '?'}</strong>
                      {' '}
                      <span className="rating">
                        ({p.black_player?.fide_rating || p.black_player?.national_rating || 'unr'})
                      </span>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
