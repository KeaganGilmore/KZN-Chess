'use client';

import { useRef, useState, type DragEvent } from 'react';
import { AlertCircle, CheckCircle2, FileUp, Loader2, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/** Matches MAX_PGN_CHARS on the import route. */
const MAX_BYTES = 5_000_000;
const ACCEPT = '.pgn,.txt,application/x-chess-pgn,application/vnd.chess-pgn,text/plain';

interface ImportResponse {
  error?: string;
  added?: number;
  reused?: number;
  games?: number;
  imported_games?: number;
  skipped?: string[];
  errors?: string[];
  truncated?: boolean;
}

interface Outcome {
  ok: boolean;
  title: string;
  details: string[];
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function describe(res: ImportResponse, httpOk: boolean): Outcome {
  const details = [...(res.skipped ?? []), ...(res.errors ?? [])];
  if (res.truncated) details.unshift('Only the first 20,000 new moves were imported. Split the file to add the rest.');
  if (!httpOk || res.error) {
    return { ok: false, title: res.error || 'Import failed. Please try again.', details };
  }
  const added = res.added ?? 0;
  const reused = res.reused ?? 0;
  const games = res.imported_games ?? 0;
  const title =
    added === 0
      ? `Nothing new: all ${plural(reused, 'move')} are already in this repertoire.`
      : `Added ${plural(added, 'new move')} from ${plural(games, 'game')}` +
        (reused ? ` (${plural(reused, 'move')} were already there).` : '.');
  return { ok: true, title, details };
}

function isPgnFile(f: File): boolean {
  return /\.(pgn|txt)$/i.test(f.name) || f.type === 'text/plain' || f.type.includes('pgn');
}

export function PgnImportCard({
  repertoireId,
  onImported,
}: {
  repertoireId: string;
  onImported: () => Promise<void>;
}) {
  const [pgn, setPgn] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const runImport = async (text: string): Promise<boolean> => {
    setBusy(true);
    setOutcome(null);
    try {
      const res = await fetch(`/api/repertoires/${repertoireId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pgn: text }),
      });
      const json: ImportResponse = await res.json().catch(() => ({}));
      const result = describe(json, res.ok);
      setOutcome(result);
      if ((json.added ?? 0) > 0) await onImported();
      return result.ok;
    } catch {
      setOutcome({ ok: false, title: 'Could not reach the server. Check your connection and try again.', details: [] });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const importFiles = async (list: FileList | File[] | null) => {
    const files = Array.from(list ?? []);
    if (files.length === 0 || busy) return;
    const bad = files.filter((f) => !isPgnFile(f));
    if (bad.length) {
      setOutcome({
        ok: false,
        title: `${bad.map((f) => f.name).join(', ')} ${bad.length === 1 ? "isn't a PGN file" : "aren't PGN files"}. Use .pgn or .txt files.`,
        details: [],
      });
      return;
    }
    const size = files.reduce((n, f) => n + f.size, 0);
    if (size > MAX_BYTES) {
      setOutcome({ ok: false, title: 'That is too much PGN for one import (5 MB max). Import the files in smaller batches.', details: [] });
      return;
    }
    const texts = await Promise.all(files.map((f) => f.text()));
    await runImport(texts.join('\n\n'));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    importFiles(e.dataTransfer.files);
  };

  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes('Files');

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Import PGN</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          onDragEnter={(e) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            dragDepth.current++;
            setDragging(true);
          }}
          onDragOver={(e) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDragLeave={() => {
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) setDragging(false);
          }}
          onDrop={onDrop}
          className={cn(
            'rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors',
            dragging ? 'border-primary bg-primary/5' : 'border-border',
            busy && 'opacity-60 pointer-events-none'
          )}
        >
          {busy ? (
            <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-primary" />
          ) : (
            <FileUp className={cn('mx-auto mb-2 h-6 w-6', dragging ? 'text-primary' : 'text-muted-foreground')} />
          )}
          <p className="text-sm">{busy ? 'Importing…' : dragging ? 'Drop to import' : 'Drop .pgn files here'}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">All games and variations are added, with comments and arrows.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
          >
            Choose files
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              importFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="pgn-paste" className="text-xs text-muted-foreground">
            Or paste PGN
          </label>
          <Textarea
            id="pgn-paste"
            value={pgn}
            onChange={(e) => setPgn(e.target.value)}
            rows={3}
            placeholder="1. e4 e5 2. Nf3 Nc6 (2... d6) 3. Bb5 …"
            className="font-mono text-xs"
          />
          <Button
            size="sm"
            onClick={async () => {
              if (await runImport(pgn)) setPgn('');
            }}
            disabled={busy || !pgn.trim()}
          >
            <Upload className="mr-1.5 h-4 w-4" /> {busy ? 'Importing…' : 'Import'}
          </Button>
        </div>

        {outcome && (
          <div
            role="status"
            className={cn(
              'rounded-md border p-3 text-sm',
              outcome.ok ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
            )}
          >
            <p className="flex items-start gap-2">
              {outcome.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              )}
              <span>{outcome.title}</span>
            </p>
            {outcome.details.length > 0 && (
              <ul className="mt-2 space-y-1 pl-6 text-xs text-muted-foreground list-disc">
                {outcome.details.slice(0, 5).map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
                {outcome.details.length > 5 && <li>and {outcome.details.length - 5} more</li>}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
