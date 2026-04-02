export const dynamic = "force-dynamic";
import { db } from "@/db";
import { recordings, transcripts } from "@/db/schema";
import { ilike, or, desc, eq } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Film } from "lucide-react";
import Link from "next/link";
import { SearchBar } from "@/components/search-bar";


function formatDuration(seconds: string | null): string {
  if (!seconds) return "-";
  const s = parseFloat(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

interface SearchResult {
  recording: typeof recordings.$inferSelect;
  matchSource: "recording" | "transcript" | "both";
  matchContext: string | null;
}

async function search(q: string): Promise<SearchResult[]> {
  const term = `%${q}%`;

  const recordingResults = await db
    .select()
    .from(recordings)
    .where(or(ilike(recordings.filename, term), ilike(recordings.notes, term)))
    .orderBy(desc(recordings.offloadedAt))
    .limit(20);

  const transcriptResults = await db
    .select({ transcript: transcripts, recording: recordings })
    .from(transcripts)
    .innerJoin(recordings, eq(transcripts.recordingId, recordings.id))
    .where(ilike(transcripts.fullText, term))
    .limit(20);

  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const r of recordingResults) {
    seen.add(r.id);
    results.push({ recording: r, matchSource: "recording", matchContext: null });
  }

  for (const { transcript, recording } of transcriptResults) {
    const context = extractContext(transcript.fullText ?? "", q, 80);
    if (seen.has(recording.id)) {
      const existing = results.find((r) => r.recording.id === recording.id);
      if (existing) {
        existing.matchSource = "both";
        existing.matchContext = context;
      }
      continue;
    }
    seen.add(recording.id);
    results.push({ recording, matchSource: "transcript", matchContext: context });
  }

  return results;
}

function extractContext(text: string, query: string, chars: number): string | null {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return null;
  const start = Math.max(0, idx - chars);
  const end = Math.min(text.length, idx + query.length + chars);
  let snippet = text.slice(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  return snippet;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const results = q ? await search(q) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Search</h1>
        <p className="text-muted-foreground">
          Search across recordings, transcripts, and people
        </p>
      </div>

      <SearchBar />

      {q && (
        <p className="text-sm text-muted-foreground">
          {results.length} result{results.length !== 1 ? "s" : ""} for &quot;{q}&quot;
        </p>
      )}

      <div className="grid gap-3">
        {results.map((result) => (
          <Link key={result.recording.id} href={`/recordings/${result.recording.id}`}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Film className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{result.recording.filename}</p>
                      <div className="flex gap-2 mt-1">
                        {result.recording.codec && (
                          <Badge variant="secondary" className="text-xs">
                            {result.recording.codec}
                          </Badge>
                        )}
                        {result.recording.resolution && (
                          <Badge variant="outline" className="text-xs">
                            {result.recording.resolution}
                          </Badge>
                        )}
                        <Badge
                          variant={
                            result.matchSource === "transcript"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {result.matchSource === "both"
                            ? "file + transcript"
                            : result.matchSource}
                        </Badge>
                      </div>
                      {result.matchContext && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          {result.matchContext}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{formatDuration(result.recording.durationSeconds)}</p>
                    <p>{result.recording.destDrive ?? ""}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {q && results.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No results found for &quot;{q}&quot;
          </CardContent>
        </Card>
      )}
    </div>
  );
}
